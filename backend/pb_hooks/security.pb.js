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

  // One subscription row per user. A second free row resets monthly quotas
  // when usage tracking reads the newest record.
  var existing = [];
  try {
    existing = e.app.findRecordsByFilter(
      "subscriptions",
      'userId = "' + auth.id + '"',
      "",
      1,
      0,
    );
  } catch (lookupErr) {
    console.log("subscription lookup on create: " + lookupErr);
  }
  if (existing && existing.length > 0) {
    throw new BadRequestError("A subscription already exists for this account");
  }

  var now = new Date();
  var periodEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );

  e.record.set("userId", auth.id);
  e.record.set("tier", "free");
  e.record.set("status", "active");
  e.record.set("cancelAtPeriodEnd", false);
  e.record.set("pmgFetchesUsed", 0);
  e.record.set("aiExtractionsUsed", 0);
  e.record.set("totalStorageUsed", 0);
  e.record.set("stripeCustomerId", "");
  e.record.set("stripeSubscriptionId", "");
  e.record.set("usagePeriodStart", now.toISOString().split("T")[0]);
  e.record.set("usagePeriodEnd", periodEnd.toISOString().split("T")[0]);
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
      if (usedStorage < 0 || usedStorage !== usedStorage) usedStorage = 0;
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

  // Image byte counts come from the uploaded files. Client-supplied
  // obverseImageSize / reverseImageSize values are ignored.
  var obverseBytes = 0;
  var reverseBytes = 0;
  var signatureBytes = 0;
  var watermarkBytes = 0;
  try {
    var obverseFiles = e.findUploadedFiles("obverseImage") || [];
    for (var oi = 0; oi < obverseFiles.length; oi++) {
      obverseBytes += Number(obverseFiles[oi] && obverseFiles[oi].size) || 0;
    }
    var reverseFiles = e.findUploadedFiles("reverseImage") || [];
    for (var ri = 0; ri < reverseFiles.length; ri++) {
      reverseBytes += Number(reverseFiles[ri] && reverseFiles[ri].size) || 0;
    }
    var signatureFiles = e.findUploadedFiles("signatureScans") || [];
    for (var si = 0; si < signatureFiles.length; si++) {
      signatureBytes +=
        Number(signatureFiles[si] && signatureFiles[si].size) || 0;
    }
    var watermarkFiles = e.findUploadedFiles("waterMarkImage") || [];
    for (var wi = 0; wi < watermarkFiles.length; wi++) {
      watermarkBytes +=
        Number(watermarkFiles[wi] && watermarkFiles[wi].size) || 0;
    }
  } catch (sizeErr) {
    console.log("image size read on create: " + sizeErr);
    throw new BadRequestError("Could not read uploaded image size");
  }
  if (obverseBytes < 0) obverseBytes = 0;
  if (reverseBytes < 0) reverseBytes = 0;
  if (signatureBytes < 0) signatureBytes = 0;
  if (watermarkBytes < 0) watermarkBytes = 0;
  e.record.set("obverseImageSize", obverseBytes);
  e.record.set("reverseImageSize", reverseBytes);
  e.record.set("signatureScansSize", signatureBytes);
  e.record.set("waterMarkImageSize", watermarkBytes);
  var newBytes =
    obverseBytes + reverseBytes + signatureBytes + watermarkBytes;
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
      if (usedStorage < 0 || usedStorage !== usedStorage) usedStorage = 0;
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

  var obverseBytes = 0;
  var reverseBytes = 0;
  var signatureBytes = 0;
  var watermarkBytes = 0;
  var obverseUploaded = false;
  var reverseUploaded = false;
  var signatureUploaded = false;
  var watermarkUploaded = false;
  try {
    var obverseFiles = e.findUploadedFiles("obverseImage") || [];
    obverseUploaded = obverseFiles.length > 0;
    for (var oi = 0; oi < obverseFiles.length; oi++) {
      obverseBytes += Number(obverseFiles[oi] && obverseFiles[oi].size) || 0;
    }
    var reverseFiles = e.findUploadedFiles("reverseImage") || [];
    reverseUploaded = reverseFiles.length > 0;
    for (var ri = 0; ri < reverseFiles.length; ri++) {
      reverseBytes += Number(reverseFiles[ri] && reverseFiles[ri].size) || 0;
    }
    var signatureFiles = e.findUploadedFiles("signatureScans") || [];
    signatureUploaded = signatureFiles.length > 0;
    for (var si = 0; si < signatureFiles.length; si++) {
      signatureBytes +=
        Number(signatureFiles[si] && signatureFiles[si].size) || 0;
    }
    var watermarkFiles = e.findUploadedFiles("waterMarkImage") || [];
    watermarkUploaded = watermarkFiles.length > 0;
    for (var wi = 0; wi < watermarkFiles.length; wi++) {
      watermarkBytes +=
        Number(watermarkFiles[wi] && watermarkFiles[wi].size) || 0;
    }
  } catch (sizeErr) {
    console.log("image size read on update: " + sizeErr);
    throw new BadRequestError("Could not read uploaded image size");
  }

  if (!obverseUploaded) {
    obverseBytes = e.record.get("obverseImage")
      ? Number(original.get("obverseImageSize") || 0)
      : 0;
  }
  if (!reverseUploaded) {
    reverseBytes = e.record.get("reverseImage")
      ? Number(original.get("reverseImageSize") || 0)
      : 0;
  }
  var previousSig = Number(original.get("signatureScansSize") || 0);
  if (previousSig < 0) previousSig = 0;
  if (signatureUploaded) {
    signatureBytes = previousSig + signatureBytes;
  } else {
    var sigNames = e.record.get("signatureScans");
    var sigText = sigNames ? String(sigNames) : "";
    var hasSig = sigText !== "" && sigText !== "[]" && sigText !== "null";
    signatureBytes = hasSig ? previousSig : 0;
  }
  if (!watermarkUploaded) {
    watermarkBytes = e.record.get("waterMarkImage")
      ? Number(original.get("waterMarkImageSize") || 0)
      : 0;
  }
  if (obverseBytes < 0) obverseBytes = 0;
  if (reverseBytes < 0) reverseBytes = 0;
  if (signatureBytes < 0) signatureBytes = 0;
  if (watermarkBytes < 0) watermarkBytes = 0;
  e.record.set("obverseImageSize", obverseBytes);
  e.record.set("reverseImageSize", reverseBytes);
  e.record.set("signatureScansSize", signatureBytes);
  e.record.set("waterMarkImageSize", watermarkBytes);

  var oldObverse = Number(original.get("obverseImageSize") || 0);
  var oldReverse = Number(original.get("reverseImageSize") || 0);
  var oldWatermark = Number(original.get("waterMarkImageSize") || 0);
  if (oldObverse < 0) oldObverse = 0;
  if (oldReverse < 0) oldReverse = 0;
  if (oldWatermark < 0) oldWatermark = 0;
  var oldBytes = oldObverse + oldReverse + previousSig + oldWatermark;
  var newBytes =
    obverseBytes + reverseBytes + signatureBytes + watermarkBytes;
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
      var ob = Number(notes[i].get("obverseImageSize") || 0);
      var rev = Number(notes[i].get("reverseImageSize") || 0);
      var sig = Number(notes[i].get("signatureScansSize") || 0);
      var wm = Number(notes[i].get("waterMarkImageSize") || 0);
      if (ob > 0) total += ob;
      if (rev > 0) total += rev;
      if (sig > 0) total += sig;
      if (wm > 0) total += wm;
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
      var ob = Number(notes[i].get("obverseImageSize") || 0);
      var rev = Number(notes[i].get("reverseImageSize") || 0);
      var sig = Number(notes[i].get("signatureScansSize") || 0);
      var wm = Number(notes[i].get("waterMarkImageSize") || 0);
      if (ob > 0) total += ob;
      if (rev > 0) total += rev;
      if (sig > 0) total += sig;
      if (wm > 0) total += wm;
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
      var ob = Number(notes[i].get("obverseImageSize") || 0);
      var rev = Number(notes[i].get("reverseImageSize") || 0);
      var sig = Number(notes[i].get("signatureScansSize") || 0);
      var wm = Number(notes[i].get("waterMarkImageSize") || 0);
      if (ob > 0) total += ob;
      if (rev > 0) total += rev;
      if (sig > 0) total += sig;
      if (wm > 0) total += wm;
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
