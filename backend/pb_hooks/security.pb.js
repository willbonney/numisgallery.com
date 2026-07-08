/// <reference path="../pb_data/types.d.ts" />

/**
 * Server-side enforcement. All logic is fully inlined per-hook because
 * PocketBase's goja runtime does not share outer-scope bindings with
 * registered hook callbacks.
 */

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

onRecordCreateRequest((e) => {
  if (e.hasSuperuserAuth()) {
    e.next();
    return;
  }
  var auth = e.auth;
  if (!auth) {
    throw new ForbiddenError("Authentication required");
  }
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
// Banknotes — create
// ---------------------------------------------------------------------------

onRecordCreateRequest((e) => {
  if (e.hasSuperuserAuth()) {
    e.next();
    return;
  }

  var auth = e.auth;
  if (!auth) {
    throw new ForbiddenError("Authentication required");
  }

  e.record.set("userId", auth.id);

  var maxBanknotes = 50;
  var maxFeatured = 15;
  var storageBytes = 250 * 1024 * 1024;
  var usedStorage = 0;

  try {
    var subs = e.app.findRecordsByFilter(
      "subscriptions",
      'userId = "' + auth.id + '"',
      "",
      1,
      0,
    );
    if (subs && subs.length > 0) {
      var sub = subs[0];
      var tier = String(sub.get("tier") || "free");
      var status = String(sub.get("status") || "active");
      if (
        (status === "active" || status === "trialing") &&
        tier === "pro"
      ) {
        maxBanknotes = 999999;
        maxFeatured = 999999;
        storageBytes = 2 * 1024 * 1024 * 1024;
      }
      usedStorage = Number(sub.get("totalStorageUsed") || 0);
    }
  } catch (err) {
    console.log("sub lookup on banknote create: " + err);
  }

  var notes = null;
  try {
    notes = e.app.findRecordsByFilter(
      "banknotes",
      'userId = "' + auth.id + '"',
      "",
      5000,
      0,
    );
  } catch (err) {
    console.log("count banknotes on create: " + err);
  }
  var count = notes ? notes.length : 0;
  if (count >= maxBanknotes) {
    throw new BadRequestError(
      "Banknote limit reached (" +
        maxBanknotes +
        "). Upgrade your plan to add more.",
    );
  }

  if (e.record.get("isFeatured") === true) {
    var featured = null;
    try {
      featured = e.app.findRecordsByFilter(
        "banknotes",
        'userId = "' + auth.id + '" && isFeatured = true',
        "",
        5000,
        0,
      );
    } catch (err) {
      console.log("count featured on create: " + err);
    }
    var fcount = featured ? featured.length : 0;
    if (fcount >= maxFeatured) {
      throw new BadRequestError(
        "Featured banknote limit reached (" + maxFeatured + ").",
      );
    }
  }

  var newBytes =
    Number(e.record.get("obverseImageSize") || 0) +
    Number(e.record.get("reverseImageSize") || 0);
  if (usedStorage + newBytes > storageBytes) {
    throw new BadRequestError(
      "Storage limit exceeded for your plan. Remove images or upgrade.",
    );
  }

  e.next();
}, "banknotes");

// ---------------------------------------------------------------------------
// Banknotes — update
// ---------------------------------------------------------------------------

onRecordUpdateRequest((e) => {
  if (e.hasSuperuserAuth()) {
    e.next();
    return;
  }

  var auth = e.auth;
  if (!auth) {
    throw new ForbiddenError("Authentication required");
  }

  var original = e.app.findRecordById("banknotes", e.record.id);
  e.record.set("userId", original.get("userId"));

  if (String(original.get("userId")) !== String(auth.id)) {
    throw new ForbiddenError("You can only update your own banknotes");
  }

  var maxFeatured = 15;
  var storageBytes = 250 * 1024 * 1024;
  var usedStorage = 0;

  try {
    var subs = e.app.findRecordsByFilter(
      "subscriptions",
      'userId = "' + auth.id + '"',
      "",
      1,
      0,
    );
    if (subs && subs.length > 0) {
      var sub = subs[0];
      var tier = String(sub.get("tier") || "free");
      var status = String(sub.get("status") || "active");
      if (
        (status === "active" || status === "trialing") &&
        tier === "pro"
      ) {
        maxFeatured = 999999;
        storageBytes = 2 * 1024 * 1024 * 1024;
      }
      usedStorage = Number(sub.get("totalStorageUsed") || 0);
    }
  } catch (err) {
    console.log("sub lookup on banknote update: " + err);
  }

  var becomingFeatured =
    e.record.get("isFeatured") === true && original.get("isFeatured") !== true;
  if (becomingFeatured) {
    var featured = null;
    try {
      featured = e.app.findRecordsByFilter(
        "banknotes",
        'userId = "' +
          auth.id +
          '" && isFeatured = true && id != "' +
          e.record.id +
          '"',
        "",
        5000,
        0,
      );
    } catch (err) {
      console.log("count featured on update: " + err);
    }
    var fcount = featured ? featured.length : 0;
    if (fcount >= maxFeatured) {
      throw new BadRequestError(
        "Featured banknote limit reached (" + maxFeatured + ").",
      );
    }
  }

  var oldBytes =
    Number(original.get("obverseImageSize") || 0) +
    Number(original.get("reverseImageSize") || 0);
  var newBytes =
    Number(e.record.get("obverseImageSize") || 0) +
    Number(e.record.get("reverseImageSize") || 0);
  var delta = newBytes - oldBytes;
  if (delta > 0 && usedStorage + delta > storageBytes) {
    throw new BadRequestError(
      "Storage limit exceeded for your plan. Remove images or upgrade.",
    );
  }

  e.next();
}, "banknotes");

// ---------------------------------------------------------------------------
// Banknotes — recompute storage after mutations
// ---------------------------------------------------------------------------

onRecordAfterCreateSuccess((e) => {
  try {
    var userId = e.record.get("userId");
    if (!userId) return;
    var notes = e.app.findRecordsByFilter(
      "banknotes",
      'userId = "' + userId + '"',
      "",
      5000,
      0,
    );
    var total = 0;
    for (var i = 0; i < (notes || []).length; i++) {
      total += Number(notes[i].get("obverseImageSize") || 0);
      total += Number(notes[i].get("reverseImageSize") || 0);
    }
    var subs = e.app.findRecordsByFilter(
      "subscriptions",
      'userId = "' + userId + '"',
      "",
      1,
      0,
    );
    if (subs && subs.length > 0) {
      subs[0].set("totalStorageUsed", total);
      e.app.save(subs[0]);
    }
  } catch (err) {
    console.log("storage recompute after create failed: " + err);
  }
}, "banknotes");

onRecordAfterUpdateSuccess((e) => {
  try {
    var userId = e.record.get("userId");
    if (!userId) return;
    var notes = e.app.findRecordsByFilter(
      "banknotes",
      'userId = "' + userId + '"',
      "",
      5000,
      0,
    );
    var total = 0;
    for (var i = 0; i < (notes || []).length; i++) {
      total += Number(notes[i].get("obverseImageSize") || 0);
      total += Number(notes[i].get("reverseImageSize") || 0);
    }
    var subs = e.app.findRecordsByFilter(
      "subscriptions",
      'userId = "' + userId + '"',
      "",
      1,
      0,
    );
    if (subs && subs.length > 0) {
      subs[0].set("totalStorageUsed", total);
      e.app.save(subs[0]);
    }
  } catch (err) {
    console.log("storage recompute after update failed: " + err);
  }
}, "banknotes");

onRecordAfterDeleteSuccess((e) => {
  try {
    var userId = e.record.get("userId");
    if (!userId) return;
    var notes = e.app.findRecordsByFilter(
      "banknotes",
      'userId = "' + userId + '"',
      "",
      5000,
      0,
    );
    var total = 0;
    for (var i = 0; i < (notes || []).length; i++) {
      total += Number(notes[i].get("obverseImageSize") || 0);
      total += Number(notes[i].get("reverseImageSize") || 0);
    }
    var subs = e.app.findRecordsByFilter(
      "subscriptions",
      'userId = "' + userId + '"',
      "",
      1,
      0,
    );
    if (subs && subs.length > 0) {
      subs[0].set("totalStorageUsed", total);
      e.app.save(subs[0]);
    }
  } catch (err) {
    console.log("storage recompute after delete failed: " + err);
  }
}, "banknotes");

// ---------------------------------------------------------------------------
// Users: free subscription + settings
// ---------------------------------------------------------------------------

onRecordAfterCreateSuccess((e) => {
  var userId = e.record.id;
  var now = new Date();
  var periodEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );

  try {
    var existingSettings = e.app.findRecordsByFilter(
      "user_settings",
      'userId = "' + userId + '"',
      "",
      1,
      0,
    );
    if (!existingSettings || existingSettings.length === 0) {
      var settingsCol = e.app.findCollectionByNameOrId("user_settings");
      var settings = new Record(settingsCol);
      settings.set("userId", userId);
      settings.set("theme", "auto");
      settings.set("gallerySort", "country");
      e.app.save(settings);
    }
  } catch (settingsErr) {
    console.log("user_settings create failed: " + settingsErr);
  }

  try {
    var existingSub = e.app.findRecordsByFilter(
      "subscriptions",
      'userId = "' + userId + '"',
      "",
      1,
      0,
    );
    if (!existingSub || existingSub.length === 0) {
      var subCol = e.app.findCollectionByNameOrId("subscriptions");
      var sub = new Record(subCol);
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
    console.log("subscription create failed: " + subErr);
  }
}, "users");
