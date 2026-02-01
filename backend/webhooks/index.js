require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const rateLimit = require("express-rate-limit");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 3002;

const PB_URL =
  process.env.POCKETBASE_URL || "https://numisgallery-pocketbase.fly.dev";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize Stripe (we only need it for webhook signature verification)
const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "dummy_key_for_webhook_verification",
);

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set");
}

if (!STRIPE_WEBHOOK_SECRET) {
  console.error(
    "❌ Error: STRIPE_WEBHOOK_SECRET must be set for secure webhook verification",
  );
}

// IMPORTANT: Use raw body for Stripe webhook signature verification
// This must be before any other body parsers
app.use(express.raw({ type: "application/json" }));

// Get admin auth token
async function getAdminToken() {
  const response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate as admin");
  }

  const data = await response.json();
  return data.token;
}

// Map Stripe subscription status to our status
function mapStripeStatus(stripeStatus) {
  const statusMap = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
    incomplete: "incomplete",
    incomplete_expired: "incomplete_expired",
  };
  return statusMap[stripeStatus] || "active";
}

// Map Stripe price ID to tier
function mapPriceToTier(priceId) {
  const proPriceId = process.env.STRIPE_PRICE_PRO;

  if (priceId === proPriceId) {
    return "pro";
  }
  return "free";
}

function isValidPocketBaseId(id) {
  return /^[a-z0-9]{15}$/i.test(id);
}

// Reset usage period when subscription renews
async function resetUsagePeriod(token, stripeData) {
  try {
    const userId = stripeData.metadata?.userId || stripeData.customer;

    if (!userId) {
      return;
    }

    if (!isValidPocketBaseId(userId)) {
      throw new Error("Invalid user ID format");
    }

    // Find existing subscription
    const listResponse = await fetch(
      `${PB_URL}/api/collections/subscriptions/records?filter=userId="${userId}"`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!listResponse.ok) {
      return;
    }

    const listData = await listResponse.json();
    const existing = listData.items || [];

    if (existing.length === 0) {
      return;
    }

    const subscription = existing[0];
    const now = new Date();
    const periodEnd = stripeData.current_period_end
      ? new Date(stripeData.current_period_end * 1000)
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    // Only reset if we're starting a new period
    const currentPeriodEnd = subscription.usagePeriodEnd
      ? new Date(subscription.usagePeriodEnd)
      : null;
    if (currentPeriodEnd && now <= currentPeriodEnd) {
      // Still in current period, don't reset
      return;
    }

    // Reset usage for new period
    await fetch(
      `${PB_URL}/api/collections/subscriptions/records/${subscription.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pmgFetchesUsed: 0,
          aiExtractionsUsed: 0,
          usagePeriodStart: now.toISOString().split("T")[0],
          usagePeriodEnd: periodEnd.toISOString().split("T")[0],
        }),
      },
    );

    console.log(`✅ Reset usage period for user ${userId}`);
  } catch (error) {
    console.error("Error resetting usage period:", error);
  }
}

async function updateSubscription(token, stripeData) {
  try {
    const userId = stripeData.metadata?.userId || stripeData.customer;

    if (!userId) {
      console.error("No userId found in webhook data");
      return;
    }

    if (!isValidPocketBaseId(userId)) {
      console.error("Invalid userId format in webhook data:", userId);
      return;
    }

    // Find existing subscription
    const listResponse = await fetch(
      `${PB_URL}/api/collections/subscriptions/records?filter=userId="${userId}"`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!listResponse.ok) {
      throw new Error("Failed to fetch existing subscription");
    }

    const listData = await listResponse.json();
    const existing = listData.items || [];

    // Get the tier from subscription items
    const tier = mapPriceToTier(stripeData.items?.data?.[0]?.price?.id);

    const subscriptionData = {
      userId: userId,
      tier: tier,
      stripeSubscriptionId: stripeData.id,
      stripeCustomerId: stripeData.customer,
      status: mapStripeStatus(stripeData.status),
      currentPeriodEnd: stripeData.current_period_end
        ? new Date(stripeData.current_period_end * 1000).toISOString()
        : null,
      cancelAtPeriodEnd: stripeData.cancel_at_period_end || false,
    };

    if (existing.length > 0) {
      const updateResponse = await fetch(
        `${PB_URL}/api/collections/subscriptions/records/${existing[0].id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscriptionData),
        },
      );

      if (!updateResponse.ok) {
        throw new Error("Failed to update subscription");
      }

      console.log(`✅ Updated subscription for user ${userId}`);
    } else {
      const createResponse = await fetch(
        `${PB_URL}/api/collections/subscriptions/records`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscriptionData),
        },
      );

      if (!createResponse.ok) {
        throw new Error("Failed to create subscription");
      }

      console.log(`✅ Created subscription for user ${userId}`);
    }
  } catch (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }
}

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: { error: "Too many requests" },
});

app.post("/stripe-webhook", webhookLimiter, async (req, res) => {
  // Verify webhook signature to ensure the request is from Stripe
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    console.error("⚠️ Webhook Error: Missing stripe-signature header");
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("⚠️ Webhook Error: STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;

  try {
    // Verify the webhook signature using Stripe's library
    // This ensures the webhook actually came from Stripe and wasn't forged
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    return res
      .status(400)
      .json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  // Signature verified - process the event
  const eventType = event.type;
  console.log(`✅ Verified Stripe webhook: ${eventType}`);

  try {
    const token = await getAdminToken();

    switch (eventType) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await updateSubscription(token, event.data.object);
        // Reset usage when subscription renews (new billing period)
        if (eventType === "customer.subscription.updated") {
          await resetUsagePeriod(token, event.data.object);
        }
        break;

      case "customer.subscription.deleted":
        await updateSubscription(token, {
          ...event.data.object,
          status: "canceled",
        });
        break;

      case "invoice.payment_succeeded":
        // Payment successful - reset usage for new billing period
        if (event.data.object.subscription) {
          await resetUsagePeriod(token, event.data.object);
        }
        break;

      case "invoice.payment_failed":
        // Payment failed, mark as past_due
        if (event.data.object.subscription) {
          // Fetch subscription details to update status
          console.log(
            `Payment failed for subscription: ${event.data.object.subscription}`,
          );
        }
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "webhooks" });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║  Mercury Webhooks Service                         ║
║  Running on http://localhost:${PORT}                  ║
║                                                   ║
║  POST /stripe-webhook (signature verified)        ║
║                                                   ║
║  Security: ${STRIPE_WEBHOOK_SECRET ? "✅ Webhook signature verification enabled" : "❌ STRIPE_WEBHOOK_SECRET missing!"}
╚═══════════════════════════════════════════════════╝
  `);
});
