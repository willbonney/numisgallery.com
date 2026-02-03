require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 3002;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://numisgallery.com";

const PB_URL =
  process.env.POCKETBASE_URL || "https://numisgallery-pocketbase.fly.dev";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize Stripe
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

// Find subscription by Stripe customer ID
async function findSubscriptionByStripeCustomerId(token, stripeCustomerId) {
  try {
    const response = await fetch(
      `${PB_URL}/api/collections/subscriptions/records?filter=stripeCustomerId="${stripeCustomerId}"`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.items?.[0] || null;
  } catch (error) {
    console.error("Error finding subscription by Stripe customer ID:", error);
    return null;
  }
}

async function updateSubscription(token, stripeData) {
  try {
    // Try to get userId from metadata first
    let userId = stripeData.metadata?.userId;
    let existingSubscription = null;

    // If no userId in metadata, try to find by Stripe customer ID
    if (!userId && stripeData.customer) {
      existingSubscription = await findSubscriptionByStripeCustomerId(
        token,
        stripeData.customer,
      );
      if (existingSubscription) {
        userId = existingSubscription.userId;
        console.log(
          `📎 Found user ${userId} by Stripe customer ID ${stripeData.customer}`,
        );
      }
    }

    if (!userId) {
      console.error(
        "No userId found in webhook data and could not find existing subscription for customer:",
        stripeData.customer,
      );
      return;
    }

    if (!isValidPocketBaseId(userId)) {
      console.error("Invalid userId format in webhook data:", userId);
      return;
    }

    // Find existing subscription by userId if we haven't already
    if (!existingSubscription) {
      const listResponse = await fetch(
        `${PB_URL}/api/collections/subscriptions/records?filter=userId="${userId}"`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (listResponse.ok) {
        const listData = await listResponse.json();
        existingSubscription = listData.items?.[0] || null;
      }
    }

    const existing = existingSubscription ? [existingSubscription] : [];

    // Get the tier from subscription items
    // If subscription is canceled or status is canceled, set tier to free
    const isCanceled = stripeData.status === "canceled";
    const tier = isCanceled
      ? "free"
      : mapPriceToTier(stripeData.items?.data?.[0]?.price?.id);

    const subscriptionData = {
      userId: userId,
      tier: tier,
      stripeSubscriptionId: isCanceled ? null : stripeData.id,
      stripeCustomerId: stripeData.customer,
      status: mapStripeStatus(stripeData.status),
      currentPeriodEnd: stripeData.current_period_end
        ? new Date(stripeData.current_period_end * 1000).toISOString()
        : null,
      cancelAtPeriodEnd: stripeData.cancel_at_period_end || false,
    };

    console.log(
      `📝 Subscription update for user ${userId}: tier=${tier}, status=${subscriptionData.status}, cancelAtPeriodEnd=${subscriptionData.cancelAtPeriodEnd}`,
    );

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

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

async function handleStripeWebhook(req, res) {
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
      case "checkout.session.completed":
        // Handle checkout session completion - this contains the client_reference_id (userId)
        const session = event.data.object;
        console.log(
          `✅ Checkout session completed for customer ${session.customer}, userId: ${session.client_reference_id}`,
        );

        // If this is a subscription checkout, the subscription webhook will follow
        // But we can store the customer-user mapping here
        if (session.subscription && session.client_reference_id) {
          // Update or create subscription with the proper userId
          const subscriptionData = await stripe.subscriptions.retrieve(
            session.subscription,
          );
          await updateSubscription(token, {
            ...subscriptionData,
            metadata: {
              ...subscriptionData.metadata,
              userId: session.client_reference_id,
            },
          });
        }
        break;

      case "customer.subscription.created":
        console.log(
          `🆕 New subscription created for customer ${event.data.object.customer}`,
        );
        await updateSubscription(token, event.data.object);
        break;

      case "customer.subscription.updated":
        // Log if this is a cancellation scheduled for period end
        if (event.data.object.cancel_at_period_end) {
          console.log(
            `⏳ Subscription scheduled for cancellation at period end for customer ${event.data.object.customer}`,
          );
        }
        await updateSubscription(token, event.data.object);
        // Reset usage when subscription renews (new billing period)
        await resetUsagePeriod(token, event.data.object);
        break;

      case "customer.subscription.deleted":
        // Subscription fully deleted - downgrade to free tier
        console.log(
          `🔻 Subscription deleted for customer ${event.data.object.customer} - downgrading to free`,
        );
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
}

async function handleCreatePortalSession(req, res) {
  try {
    const { customerId, returnUrl } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${FRONTEND_URL}/subscription`,
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
}

// ============================================================================
// RATE LIMITERS
// ============================================================================

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: { error: "Too many requests" },
});

const portalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 portal requests per minute
  message: { error: "Too many requests" },
});

// ============================================================================
// MIDDLEWARE & ROUTES
// ============================================================================

// Enable CORS for frontend requests
app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5173"],
    methods: ["POST", "GET"],
    credentials: true,
  }),
);

// IMPORTANT: Register stripe-webhook route BEFORE express.json() middleware
// to preserve the raw body for Stripe signature verification
app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  webhookLimiter,
  handleStripeWebhook,
);

// Use JSON body parser for all other routes (must be AFTER webhook route)
app.use(express.json());

// Create Stripe billing portal session for subscription management
app.post("/create-portal-session", portalLimiter, handleCreatePortalSession);

// Create Stripe checkout session for subscription upgrade
app.post("/create-checkout-session", portalLimiter, async (req, res) => {
  try {
    const { priceId, customerEmail, userId, successUrl, cancelUrl } = req.body;

    if (!priceId || !customerEmail || !userId) {
      return res.status(400).json({
        error: "priceId, customerEmail, and userId are required",
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    // Check if customer already exists with this email
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    let customerId;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      // Update customer metadata with userId
      await stripe.customers.update(customerId, {
        metadata: { userId },
      });
    }

    const sessionParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${FRONTEND_URL}/subscription?success=true`,
      cancel_url: cancelUrl || `${FRONTEND_URL}/subscription`,
      client_reference_id: userId,
      customer_email: customerId ? undefined : customerEmail,
      customer: customerId || undefined,
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(
      `🛒 Created checkout session for user ${userId}, email: ${customerEmail}`,
    );

    res.json({ sessionUrl: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "webhooks" });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║  Mercury Webhooks Service                         ║
║  Running on http://localhost:${PORT}                  ║
║                                                   ║
║  POST /stripe-webhook (signature verified)        ║
║  POST /create-portal-session                      ║
║  POST /create-checkout-session                    ║
║                                                   ║
║  Security: ${STRIPE_WEBHOOK_SECRET ? "✅ Webhook signature verification enabled" : "❌ STRIPE_WEBHOOK_SECRET missing!"}
╚═══════════════════════════════════════════════════╝
  `);
});
