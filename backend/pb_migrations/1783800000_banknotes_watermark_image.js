/// <reference path="../pb_data/types.d.ts" />

/**
 * Add waterMarkImage file field for watermark scans.
 */
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("banknotes");

    collection.fields.add(
      new FileField({
        name: "waterMarkImage",
        required: false,
        maxSelect: 1,
        maxSize: 10485760,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        thumbs: ["500x0", "200x0"],
      }),
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("banknotes");
    const field = collection.fields.getByName("waterMarkImage");
    if (field) {
      collection.fields.removeById(field.id);
    }
    return app.save(collection);
  },
);
