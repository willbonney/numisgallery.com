/// <reference path="../pb_data/types.d.ts" />

/**
 * Server-side enforcement for subscriptions and banknotes.
 * - Locks tier / usage / billing fields from non-superuser writes
 * - Forces banknote ownership to the authenticated user
 * - Enforces free/pro banknote, featured, and storage limits
 * - Recomputes totalStorageUsed after banknote mutations
 */

const TIER_LIMITS = {
  free: {
    maxBanknotes: 50,
    maxFeatured: 15,
    storageBytes: 250 * 1024 * 1024,
  },
  pro: {
    maxBanknotes: Number.POSITIVE_INFINITY,
    maxFeatured: Number.POSITIVE_INFINITY,
    storageBytes: 2 * 1024 * 1024 * 1024,
  },
};

const PROTECTED_SUBSCRIPTION_FIELDS = [
  "tier",
  "status",
  "paddleCustomerId",
  "paddleSubscriptionId",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "pmgFetchesUsed",
  "aiExtractionsUsed",
  "usagePeriodStart",
  "usagePeriodEnd",
  "totalStorageUsed",
  "currentPeriodEnd",
  "cancelAtPeriodEnd",
];

function getTierLimits(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

function getUserSubscription(app, userId) {
  try {
    const records = app.findRecordsByFilter(
      "subscriptions",
      'userId = {:userId}',
      "",
      1,
      0,
      { userId: userId },
    );
    return records && records.length > 0 ? records[0] : null;
  } catch (e) {
    return null;
  }
}

function countUserBanknotes(app, userId) {
  try {
    const records = app.findRecordsByFilter(
      "banknotes",
      'userId = {:userId}',
      "",
      5000,
      0,
      { userId: userId },
    );
    return records ? records.length : 0;
  } catch (e) {
    return 0;
  }
}

function countUserFeatured(app, userId, excludeId) {
  try {
    const filter = excludeId
      ? 'userId = {:userId} && isFeatured = true && id != {:excludeId}'
      : 'userId = {:userId} && isFeatured = true';
    const params = excludeId
      ? { userId: userId, excludeId: excludeId }
      : { userId: userId };
    const records = app.findRecordsByFilter(
      "banknotes",
      filter,
      "",
      5000,
      0,
      params,
    );
    return records ? records.length : 0;
  } catch (e) {
    return 0;
  }
}

function sumStorageFromNotes(app, userId) {
  try {
    const records = app.findRecordsByFilter(
      "banknotes",
      'userId = {:userId}',
      "",
      5000,
      0,
      { userId: userId },
    );
    let total = 0;
    for (const r of records || []) {
      total += Number(r.get("obverseImageSize") || 0);
      total += Number(r.get("reverseImageSize") || 0);
    }
    return total;
  } catch (e) {
    return 0;
  }
}

function recomputeAndSaveStorage(app, userId) {
  if (!userId) return;
  const sub = getUserSubscription(app, userId);
  if (!sub) return;
  const total = sumStorageFromNotes(app, userId);
  sub.set("totalStorageUsed", total);
  app.save(sub);
}

function recordFileBytes(record) {
  return (
    Number(record.get("obverseImageSize") || 0) +
    Number(record.get("reverseImageSize") || 0)
  );
}

// ---------------------------------------------------------------------------
// Subscriptions: lock billing/usage fields for regular users
// ---------------------------------------------------------------------------

onRecordCreateRequest((e) => {
  if (e.hasSuperuserAuth()) {
    e.next();
    return;
  }

  const auth = e.auth;
  if (!auth) {
    throw new ForbiddenError("Authentication required");
  }

  // Force ownership and free-tier defaults — clients cannot self-upgrade
  e.record.set("userId", auth.id);
  e.record.set("tier", "free");
  e.record.set("status", "active");
  e.record.set("cancelAtPeriodEnd", false);
  e.record.set("pmgFetchesUsed", 0);
  e.record.set("aiExtractionsUsed", 0);
  e.record.set("totalStorageUsed", 0);
  e.record.set("paddleCustomerId", "");
  e.record.set("paddleSubscriptionId", "");

  e.next();
}, "subscriptions");

onRecordUpdateRequest((e) => {
  if (e.hasSuperuserAuth()) {
    e.next();
    return;
  }

  // Regular users cannot update subscription records at all.
  // Billing/usage is managed by webhooks/scraper with superuser credentials.
  // Storage is recomputed by banknote hooks below.
  throw new ForbiddenError(
    "Subscription fields can only be updated by the system",
  );
}, "subscriptions");

onRecordDeleteRequest((e) => {
  if (e.hasSuperuserAuth()) {
    e.next();
    return;
  }
  throw new ForbiddenError("Subscriptions cannot be deleted by users");
}, "subscriptions");

// ---------------------------------------------------------------------------
// Banknotes: ownership + plan limits
// ---------------------------------------------------------------------------

onRecordCreateRequest((e) => {
  if (e.hasSuperuserAuth()) {
    e.next();
    return;
  }

  const auth = e.auth;
  if (!auth) {
    throw new ForbiddenError("Authentication required");
  }

  // Force ownership
  e.record.set("userId", auth.id);

  const sub = getUserSubscription(e.app, auth.id);
  const tier = sub ? String(sub.get("tier") || "free") : "free";
  const status = sub ? String(sub.get("status") || "active") : "active";
  // Treat only active/trialing as pro-eligible
  const effectiveTier =
    status === "active" || status === "trialing" ? tier : "free";
  const limits = getTierLimits(effectiveTier);

  const currentCount = countUserBanknotes(e.app, auth.id);
  if (currentCount >= limits.maxBanknotes) {
    throw new BadRequestError(
      `Banknote limit reached (${limits.maxBanknotes}). Upgrade your plan to add more.`,
    );
  }

  if (e.record.get("isFeatured") === true) {
    const featuredCount = countUserFeatured(e.app, auth.id, null);
    if (featuredCount >= limits.maxFeatured) {
      throw new BadRequestError(
        `Featured banknote limit reached (${limits.maxFeatured}).`,
      );
    }
  }

  const newBytes = recordFileBytes(e.record);
  const used = sub ? Number(sub.get("totalStorageUsed") || 0) : 0;
  if (used + newBytes > limits.storageBytes) {
    throw new BadRequestError(
      "Storage limit exceeded for your plan. Remove images or upgrade.",
    );
  }

  e.next();
}, "banknotes");

onRecordUpdateRequest((e) => {
  if (e.hasSuperuserAuth()) {
    e.next();
    return;
  }

  const auth = e.auth;
  if (!auth) {
    throw new ForbiddenError("Authentication required");
  }

  // Prevent ownership transfer
  const original = e.app.findRecordById("banknotes", e.record.id);
  e.record.set("userId", original.get("userId"));

  if (String(original.get("userId")) !== String(auth.id)) {
    throw new ForbiddenError("You can only update your own banknotes");
  }

  const sub = getUserSubscription(e.app, auth.id);
  const tier = sub ? String(sub.get("tier") || "free") : "free";
  const status = sub ? String(sub.get("status") || "active") : "active";
  const effectiveTier =
    status === "active" || status === "trialing" ? tier : "free";
  const limits = getTierLimits(effectiveTier);

  const becomingFeatured =
    e.record.get("isFeatured") === true && original.get("isFeatured") !== true;
  if (becomingFeatured) {
    const featuredCount = countUserFeatured(e.app, auth.id, e.record.id);
    if (featuredCount >= limits.maxFeatured) {
      throw new BadRequestError(
        `Featured banknote limit reached (${limits.maxFeatured}).`,
      );
    }
  }

  // Storage: compare new declared sizes vs old when increased
  const oldBytes = recordFileBytes(original);
  const newBytes = recordFileBytes(e.record);
  const delta = newBytes - oldBytes;
  if (delta > 0) {
    const used = sub ? Number(sub.get("totalStorageUsed") || 0) : 0;
    if (used + delta > limits.storageBytes) {
      throw new BadRequestError(
        "Storage limit exceeded for your plan. Remove images or upgrade.",
      );
    }
  }

  e.next();
}, "banknotes");

// Recompute storage after mutations (runs with app privileges)
onRecordAfterCreateSuccess((e) => {
  try {
    recomputeAndSaveStorage(e.app, e.record.get("userId"));
  } catch (err) {
    console.log("storage recompute after create failed:", err);
  }
}, "banknotes");

onRecordAfterUpdateSuccess((e) => {
  try {
    recomputeAndSaveStorage(e.app, e.record.get("userId"));
  } catch (err) {
    console.log("storage recompute after update failed:", err);
  }
}, "banknotes");

onRecordAfterDeleteSuccess((e) => {
  try {
    recomputeAndSaveStorage(e.app, e.record.get("userId"));
  } catch (err) {
    console.log("storage recompute after delete failed:", err);
  }
}, "banknotes");

// Default free subscription + settings on user create
onRecordAfterCreateSuccess((e) => {
  try {
    const userId = e.record.id;
    const now = new Date();
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
    );

    // user_settings
    try {
      const existingSettings = e.app.findRecordsByFilter(
        "user_settings",
        'userId = {:userId}',
        "",
        1,
        0,
        { userId: userId },
      );
      if (!existingSettings || existingSettings.length === 0) {
        const settings = new Record(e.app.findCollectionByNameOrId("user_settings"));
        settings.set("userId", userId);
        settings.set("theme", "auto");
        settings.set("gallerySort", "country");
        e.app.save(settings);
      }
    } catch (settingsErr) {
      console.log("user_settings create failed:", settingsErr);
    }

    // subscriptions
    try {
      const existingSub = getUserSubscription(e.app, userId);
      if (!existingSub) {
        const sub = new Record(e.app.findCollectionByNameOrId("subscriptions"));
        sub.set("userId", userId);
        sub.set("tier", "free");
        sub.set("status", "active");
        sub.set("cancelAtPeriodEnd", false);
        sub.set("pmgFetchesUsed", 0);
        sub.set("aiExtractionsUsed", 0);
        sub.set("totalStorageUsed", 0);
        sub.set("usagePeriodStart", now.toISOString().split("T")[0]);
        sub.set("usagePeriodEnd", periodEnd.toISOString().split("T")[0]);
        e.app.save(sub);
      }
    } catch (subErr) {
      console.log("subscription create failed:", subErr);
    }
  } catch (err) {
    console.log("user after-create hook failed:", err);
  }
}, "users");
