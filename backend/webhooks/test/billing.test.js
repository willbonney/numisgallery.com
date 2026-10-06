const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const {
  app,
  mapStripeStatus,
  mapPriceToTier,
  resolvePriceId,
  isAllowedReturnUrl,
  isValidPocketBaseId,
  getCustomerId,
  getSubscriptionId,
  subscriptionWriteFields,
} = require("../index");

function listen(appInstance) {
  return new Promise((resolve) => {
    const server = http.createServer(appInstance);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

function request(port, method, path, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path, method, headers },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body: raw }));
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

test("mapStripeStatus does not treat unknown states as active", () => {
  assert.equal(mapStripeStatus("active"), "active");
  assert.equal(mapStripeStatus("trialing"), "trialing");
  assert.equal(mapStripeStatus("canceled"), "canceled");
  assert.equal(mapStripeStatus("unpaid"), "past_due");
  assert.equal(mapStripeStatus(undefined), "past_due");
});

test("resolvePriceId refuses to swap a missing yearly price for monthly", () => {
  const previousMonthly = process.env.STRIPE_PRICE_PRO;
  const previousYearly = process.env.STRIPE_PRICE_PRO_YEARLY;
  process.env.STRIPE_PRICE_PRO = "price_month";
  delete process.env.STRIPE_PRICE_PRO_YEARLY;
  try {
    assert.deepEqual(resolvePriceId("monthly"), { priceId: "price_month" });
    assert.equal(resolvePriceId("yearly").error.includes("STRIPE_PRICE_PRO_YEARLY"), true);
    process.env.STRIPE_PRICE_PRO_YEARLY = "price_year";
    assert.deepEqual(resolvePriceId("yearly"), { priceId: "price_year" });
    assert.equal(mapPriceToTier("price_year"), "pro");
    assert.equal(mapPriceToTier("price_other"), "free");
  } finally {
    if (previousMonthly === undefined) delete process.env.STRIPE_PRICE_PRO;
    else process.env.STRIPE_PRICE_PRO = previousMonthly;
    if (previousYearly === undefined) delete process.env.STRIPE_PRICE_PRO_YEARLY;
    else process.env.STRIPE_PRICE_PRO_YEARLY = previousYearly;
  }
});

test("return URLs stay on the site and PocketBase ids are 15 characters", () => {
  assert.equal(isAllowedReturnUrl(""), true);
  assert.equal(isAllowedReturnUrl("https://numisgallery.com/pricing"), true);
  assert.equal(isAllowedReturnUrl("https://numisgallery.com.evil.com/pricing"), false);
  assert.equal(isAllowedReturnUrl("javascript:alert(1)"), false);
  assert.equal(isValidPocketBaseId("abcdefghijklmno"), true);
  assert.equal(isValidPocketBaseId("short"), false);
  assert.equal(isValidPocketBaseId("has space here!!"), false);
});

test("subscription ids prefer Stripe fields and fall back to legacy Paddle fields", () => {
  assert.equal(getCustomerId({ stripeCustomerId: "cus_1", paddleCustomerId: "ctm_1" }), "cus_1");
  assert.equal(getCustomerId({ paddleCustomerId: "ctm_1" }), "ctm_1");
  assert.equal(getSubscriptionId({ paddleSubscriptionId: "sub_old" }), "sub_old");
  assert.deepEqual(
    subscriptionWriteFields({
      userId: "abcdefghijklmno",
      tier: "pro",
      status: "active",
      currentPeriodEnd: "2026-11-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      customerId: "cus_1",
      subscriptionId: "sub_1",
    }),
    {
      userId: "abcdefghijklmno",
      tier: "pro",
      status: "active",
      currentPeriodEnd: "2026-11-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    },
  );
});

test("health responds and unsigned webhooks are rejected", async () => {
  const { server, port } = await listen(app);
  try {
    const health = await request(port, "GET", "/health");
    assert.equal(health.status, 200);
    assert.equal(JSON.parse(health.body).service, "webhooks");

    const webhook = await request(port, "POST", "/stripe-webhook", {
      "content-type": "application/json",
    }, "{}");
    assert.equal(webhook.status, 400);
    assert.match(webhook.body, /stripe-signature/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
