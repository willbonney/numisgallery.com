/// <reference path="../pb_data/types.d.ts" />

/**
 * Add Numista-related detail fields to banknotes for import + future UI.
 *
 * Signatures: JSON array of { name, title?, signatureScan? } where signatureScan
 * is a filename from the multi-file signatureScans field.
 */
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("banknotes");

    collection.fields.add(
      new TextField({
        name: "numistaId",
        required: false,
        max: 32,
      }),
    );

    collection.fields.add(
      new SelectField({
        name: "composition",
        required: false,
        maxSelect: 1,
        values: ["Paper", "Polymer"],
      }),
    );

    collection.fields.add(
      new TextField({
        name: "obvDescription",
        required: false,
      }),
    );

    collection.fields.add(
      new TextField({
        name: "revDescription",
        required: false,
      }),
    );

    collection.fields.add(
      new TextField({
        name: "obvEngraver",
        required: false,
        max: 200,
      }),
    );

    collection.fields.add(
      new TextField({
        name: "obvDesigner",
        required: false,
        max: 200,
      }),
    );

    collection.fields.add(
      new TextField({
        name: "revEngraver",
        required: false,
        max: 200,
      }),
    );

    collection.fields.add(
      new TextField({
        name: "revDesigner",
        required: false,
        max: 200,
      }),
    );

    collection.fields.add(
      new JSONField({
        name: "printer",
        required: false,
      }),
    );

    collection.fields.add(
      new NumberField({
        name: "numIssued",
        required: false,
        onlyInt: true,
        min: 0,
      }),
    );

    collection.fields.add(
      new BoolField({
        name: "inCirculation",
        required: false,
      }),
    );

    collection.fields.add(
      new JSONField({
        name: "signatures",
        required: false,
      }),
    );

    collection.fields.add(
      new FileField({
        name: "signatureScans",
        required: false,
        maxSelect: 20,
        maxSize: 10485760,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        thumbs: ["200x0"],
      }),
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("banknotes");
    const names = [
      "numistaId",
      "composition",
      "obvDescription",
      "revDescription",
      "obvEngraver",
      "obvDesigner",
      "revEngraver",
      "revDesigner",
      "printer",
      "numIssued",
      "inCirculation",
      "signatures",
      "signatureScans",
    ];

    for (const name of names) {
      const field = collection.fields.getByName(name);
      if (field) {
        collection.fields.removeById(field.id);
      }
    }

    return app.save(collection);
  },
);
