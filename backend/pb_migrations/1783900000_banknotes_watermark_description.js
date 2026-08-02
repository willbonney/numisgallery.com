/// <reference path="../pb_data/types.d.ts" />

/**
 * Full watermark description text (e.g. from Numista Watermark section).
 * Distinct from short `watermark` label and `waterMarkImage` file.
 */
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("banknotes");

    collection.fields.add(
      new TextField({
        name: "watermarkDescription",
        required: false,
      }),
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("banknotes");
    const field = collection.fields.getByName("watermarkDescription");
    if (field) {
      collection.fields.removeById(field.id);
    }
    return app.save(collection);
  },
);
