/// <reference path="../pb_data/types.d.ts" />

/**
 * Rename legacy Paddle billing field names to Stripe.
 * Idempotent: no-op if fields are already stripe* or missing.
 */
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("subscriptions");
    let changed = false;

    for (const field of collection.fields) {
      if (field.name === "paddleCustomerId") {
        field.name = "stripeCustomerId";
        changed = true;
      }
      if (field.name === "paddleSubscriptionId") {
        field.name = "stripeSubscriptionId";
        changed = true;
      }
    }

    if (changed) {
      return app.save(collection);
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("subscriptions");
    let changed = false;

    for (const field of collection.fields) {
      if (field.name === "stripeCustomerId") {
        field.name = "paddleCustomerId";
        changed = true;
      }
      if (field.name === "stripeSubscriptionId") {
        field.name = "paddleSubscriptionId";
        changed = true;
      }
    }

    if (changed) {
      return app.save(collection);
    }
  },
);
