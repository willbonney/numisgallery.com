/// <reference path="../pb_data/types.d.ts" />

/**
 * Restrict banknote image uploads to common image MIME types (10MB max).
 */
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("banknotes");
    const mimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    for (const field of collection.fields) {
      if (field.name === "obverseImage" || field.name === "reverseImage") {
        field.mimeTypes = mimes;
        if (!field.maxSize || field.maxSize <= 0) {
          field.maxSize = 10485760;
        }
      }
    }

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("banknotes");

    for (const field of collection.fields) {
      if (field.name === "obverseImage" || field.name === "reverseImage") {
        field.mimeTypes = [];
      }
    }

    return app.save(collection);
  },
);
