/// <reference path="../pb_data/types.d.ts" />

/**
 * Close quota and profile leaks:
 * - one subscription row per user, and users cannot patch billing fields
 * - users can be fetched by id (public collection pages) but not listed in bulk
 * - avatars cannot be SVG
 * - image byte counters cannot be negative
 * - signature and watermark bytes are stored for the storage quota
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.listRule = "id = @request.auth.id";
    const avatar = users.fields.getByName("avatar");
    if (avatar) {
      avatar.mimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    }
    app.save(users);

    const keptByUser = {};
    const drop = [];
    let offset = 0;
    for (;;) {
      const batch = app.findRecordsByFilter(
        "subscriptions",
        "id != ''",
        "id",
        200,
        offset,
      );
      if (!batch || batch.length === 0) break;
      for (const rec of batch) {
        const userId = String(rec.get("userId") || "");
        if (!userId) {
          drop.push(rec);
          continue;
        }
        const current = keptByUser[userId];
        if (!current) {
          keptByUser[userId] = rec;
          continue;
        }
        const currentBilled = Boolean(
          current.get("stripeSubscriptionId") ||
            current.get("stripeCustomerId"),
        );
        const nextBilled = Boolean(
          rec.get("stripeSubscriptionId") || rec.get("stripeCustomerId"),
        );
        if (!currentBilled && nextBilled) {
          drop.push(current);
          keptByUser[userId] = rec;
        } else {
          drop.push(rec);
        }
      }
      offset += batch.length;
      if (batch.length < 200) break;
    }
    for (const rec of drop) {
      app.delete(rec);
    }

    const subscriptions = app.findCollectionByNameOrId("subscriptions");
    subscriptions.updateRule = null;
    try {
      subscriptions.addIndex("idx_subscriptions_userId", true, "userId", "");
    } catch (err) {
      const message = String(err);
      if (!message.includes("idx_subscriptions_userId")) throw err;
    }
    app.save(subscriptions);

    const banknotes = app.findCollectionByNameOrId("banknotes");
    const sizeNames = [
      "obverseImageSize",
      "reverseImageSize",
      "signatureScansSize",
      "waterMarkImageSize",
    ];
    for (const name of ["signatureScansSize", "waterMarkImageSize"]) {
      if (!banknotes.fields.getByName(name)) {
        banknotes.fields.add(
          new NumberField({
            name: name,
            min: 0,
            onlyInt: true,
            required: false,
          }),
        );
      }
    }
    for (const field of banknotes.fields) {
      if (sizeNames.indexOf(field.name) !== -1) {
        field.min = 0;
        field.onlyInt = true;
      }
    }
    return app.save(banknotes);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.listRule = '@request.auth.id != ""';
    const avatar = users.fields.getByName("avatar");
    if (avatar) {
      avatar.mimeTypes = [
        "image/jpeg",
        "image/png",
        "image/svg+xml",
        "image/gif",
        "image/webp",
      ];
    }
    app.save(users);

    const subscriptions = app.findCollectionByNameOrId("subscriptions");
    subscriptions.updateRule =
      '@request.auth.id != "" && userId = @request.auth.id';
    try {
      subscriptions.removeIndex("idx_subscriptions_userId");
    } catch (_) {
      // Index may already be gone.
    }
    app.save(subscriptions);

    const banknotes = app.findCollectionByNameOrId("banknotes");
    for (const name of ["signatureScansSize", "waterMarkImageSize"]) {
      const field = banknotes.fields.getByName(name);
      if (field) banknotes.fields.removeById(field.id);
    }
    for (const field of banknotes.fields) {
      if (
        field.name === "obverseImageSize" ||
        field.name === "reverseImageSize"
      ) {
        field.min = null;
        field.onlyInt = false;
      }
    }
    return app.save(banknotes);
  },
);
