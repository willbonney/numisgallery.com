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

// Allowed Stripe price IDs (never trust arbitrary client priceId)
const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO;
const STRIPE_PRICE_PRO_YEARLY = process.env.STRIPE_PRICE_PRO_YEARLY;

const ALLOWED_FRONTEND_ORIGINS = [
  FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:4173",
  "https://numisgallery.com",
  "https://www.numisgallery.com",
  "https://numisgallery.pages.dev",
].filter(Boolean);

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

/** PocketBase superuser token (PB 0.23+ uses _superusers, not /api/admins) */
async function getAdminToken() {
  const attempts = [
    `${PB_URL}/api/collections/_superusers/auth-with-password`,
    `${PB_URL}/api/admins/auth-with-password`,
  ];

  let lastError;
  for (const url of attempts) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.token;
    }

    lastError = await response.text().catch(() => response.statusText);
  }

  throw new Error(`Failed to authenticate as admin: ${lastError}`);
}

/**
 * Validate PocketBase user JWT and attach req.user
 */
async function requireUserAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const response = await fetch(
      `${PB_URL}/api/collections/users/auth-refresh`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const data = await response.json();
    req.user = data.record;
    req.userToken = token;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

function isValidPocketBaseId(id) {
  return typeof id === "string" && /^[a-z0-9]{15}$/i.test(id);
}

function isAllowedReturnUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return ALLOWED_FRONTEND_ORIGINS.some((origin) => {
      try {
        return parsed.origin === new URL(origin).origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function getAllowedPriceIds() {
  return [STRIPE_PRICE_PRO, STRIPE_PRICE_PRO_YEARLY].filter(Boolean);
}

function resolvePriceId(billingPeriod) {
  if (billingPeriod === "yearly" && STRIPE_PRICE_PRO_YEARLY) {
    return STRIPE_PRICE_PRO_YEARLY;
  }
  return STRIPE_PRICE_PRO;
}

// Live schema uses paddle* field names (legacy rename); support both when reading.
function getCustomerId(sub) {
  return sub?.paddleCustomerId || sub?.stripeCustomerId || null;
}

function getSubscriptionId(sub) {
  return sub?.paddleSubscriptionId || sub?.stripeSubscriptionId || null;
}

function subscriptionWriteFields(data) {
  // Write both naming conventions so schema drift does not break billing.
  return {
    userId: data.userId,
    tier: data.tier,
    status: data.status,
    currentPeriodEnd: data.currentPeriodEnd,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd,
    paddleCustomerId: data.customerId,
    paddleSubscriptionId: data.subscriptionId,
    stripeCustomerId: data.customerId,
    stripeSubscriptionId: data.subscriptionId,
  };
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
  // Unknown statuses should not default to active
  return statusMap[stripeStatus] || "past_due";
}

// Map Stripe price ID to tier
function mapPriceToTier(priceId) {
  const allowed = getAllowedPriceIds();
  if (priceId && allowed.includes(priceId)) {
    return "pro";
  }
  return "free";
}

async function findSubscriptionByUserId(token, userId) {
  const response = await fetch(
    `${PB_URL}/api/collections/subscriptions/records?filter=${encodeURIComponent(
      `userId="${userId}"`,
    )}&perPage=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data.items?.[0] || null;
}

async function findSubscriptionByCustomerId(token, customerId) {
  if (!customerId) return null;

  // Try both field names used across schema migrations
  for (const field of ["paddleCustomerId", "stripeCustomerId"]) {
    const response = await fetch(
      `${PB_URL}/api/collections/subscriptions/records?filter=${encodeURIComponent(
        `${field}="${customerId}"`,
      )}&perPage=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (response.ok) {
      const data = await response.json();
      if (data.items?.[0]) return data.items[0];
    }
  }
  return null;
}

// Reset usage period when subscription renews
async function resetUsagePeriod(token, stripeData) {
  try {
    let userId = stripeData.metadata?.userId;

    // Invoice objects often only have customer (cus_...), not PB userId
    if (!userId || !isValidPocketBaseId(userId)) {
      const customerId = stripeData.customer;
      if (customerId) {
        const existing = await findSubscriptionByCustomerId(token, customerId);
        if (existing) {
          userId = existing.userId;
        }
      }
    }

    if (!userId || !isValidPocketBaseId(userId)) {
      console.warn(
        "resetUsagePeriod: could not resolve PocketBase userId; skipping",
      );
      return;
    }

    const subscription = await findSubscriptionByUserId(token, userId);
    if (!subscription) return;

    const now = new Date();
    const periodEnd = stripeData.current_period_end
      ? new Date(stripeData.current_period_end * 1000)
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const currentPeriodEnd = subscription.usagePeriodEnd
      ? new Date(subscription.usagePeriodEnd)
      : null;
    if (currentPeriodEnd && now <= currentPeriodEnd) {
      return;
    }

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
    let userId = stripeData.metadata?.userId;
    let existingSubscription = null;

    if (!userId && stripeData.customer) {
      existingSubscription = await findSubscriptionByCustomerId(
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

    if (!existingSubscription) {
      existingSubscription = await findSubscriptionByUserId(token, userId);
    }

    const isCanceled = stripeData.status === "canceled";
    const tier = isCanceled
      ? "free"
      : mapPriceToTier(stripeData.items?.data?.[0]?.price?.id);

    const subscriptionData = subscriptionWriteFields({
      userId,
      tier,
      customerId: stripeData.customer || null,
      subscriptionId: isCanceled ? null : stripeData.id,
      status: mapStripeStatus(stripeData.status),
      currentPeriodEnd: stripeData.current_period_end
        ? new Date(stripeData.current_period_end * 1000).toISOString()
        : null,
      cancelAtPeriodEnd: stripeData.cancel_at_period_end || false,
    });

    // Only include keys that exist / are known — drop undefined stripe* if schema rejects
    const payload = { ...subscriptionData };
    // Remove null-undefined noise
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    console.log(
      `📝 Subscription update for user ${userId}: tier=${tier}, status=${payload.status}, cancelAtPeriodEnd=${payload.cancelAtPeriodEnd}`,
    );

    if (existingSubscription) {
      // Prefer writing only fields that exist on the collection
      const safePayload = {
        userId,
        tier,
        status: payload.status,
        currentPeriodEnd: payload.currentPeriodEnd,
        cancelAtPeriodEnd: payload.cancelAtPeriodEnd,
        paddleCustomerId: payload.paddleCustomerId,
        paddleSubscriptionId: payload.paddleSubscriptionId,
      };

      const updateResponse = await fetch(
        `${PB_URL}/api/collections/subscriptions/records/${existingSubscription.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(safePayload),
        },
      );

      if (!updateResponse.ok) {
        const errText = await updateResponse.text();
        throw new Error(`Failed to update subscription: ${errText}`);
      }

      console.log(`✅ Updated subscription for user ${userId}`);
    } else {
      const createPayload = {
        userId,
        tier,
        status: payload.status,
        currentPeriodEnd: payload.currentPeriodEnd,
        cancelAtPeriodEnd: payload.cancelAtPeriodEnd,
        paddleCustomerId: payload.paddleCustomerId,
        paddleSubscriptionId: payload.paddleSubscriptionId,
        pmgFetchesUsed: 0,
        aiExtractionsUsed: 0,
        totalStorageUsed: 0,
      };

      const createResponse = await fetch(
        `${PB_URL}/api/collections/subscriptions/records`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createPayload),
        },
      );

      if (!createResponse.ok) {
        const errText = await createResponse.text();
        throw new Error(`Failed to create subscription: ${errText}`);
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

  const eventType = event.type;
  console.log(`✅ Verified Stripe webhook: ${eventType}`);

  try {
    const token = await getAdminToken();

    switch (eventType) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log(
          `✅ Checkout session completed for customer ${session.customer}, userId: ${session.client_reference_id}`,
        );

        if (session.subscription && session.client_reference_id) {
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
      }

      case "customer.subscription.created":
        console.log(
          `🆕 New subscription created for customer ${event.data.object.customer}`,
        );
        await updateSubscription(token, event.data.object);
        break;

      case "customer.subscription.updated":
        if (event.data.object.cancel_at_period_end) {
          console.log(
            `⏳ Subscription scheduled for cancellation at period end for customer ${event.data.object.customer}`,
          );
        }
        await updateSubscription(token, event.data.object);
        await resetUsagePeriod(token, event.data.object);
        break;

      case "customer.subscription.deleted":
        console.log(
          `🔻 Subscription deleted for customer ${event.data.object.customer} - downgrading to free`,
        );
        await updateSubscription(token, {
          ...event.data.object,
          status: "canceled",
        });
        break;

      case "invoice.payment_succeeded":
        if (event.data.object.subscription) {
          // Attach metadata userId if we can resolve the subscription
          let stripeSub = null;
          try {
            stripeSub = await stripe.subscriptions.retrieve(
              event.data.object.subscription,
            );
          } catch (e) {
            console.warn("Could not retrieve subscription for invoice:", e.message);
          }
          await resetUsagePeriod(token, {
            ...event.data.object,
            metadata: stripeSub?.metadata || event.data.object.metadata,
            current_period_end:
              stripeSub?.current_period_end ||
              event.data.object.lines?.data?.[0]?.period?.end,
          });
        }
        break;

      case "invoice.payment_failed":
        if (event.data.object.subscription) {
          console.log(
            `Payment failed for subscription: ${event.data.object.subscription}`,
          );
          try {
            const stripeSub = await stripe.subscriptions.retrieve(
              event.data.object.subscription,
            );
            await updateSubscription(token, {
              ...stripeSub,
              status: "past_due",
            });
          } catch (e) {
            console.error("Failed to mark subscription past_due:", e.message);
            throw e;
          }
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
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const userId = req.user.id;
    const { returnUrl } = req.body || {};

    if (returnUrl && !isAllowedReturnUrl(returnUrl)) {
      return res.status(400).json({ error: "Invalid returnUrl" });
    }

    const adminToken = await getAdminToken();
    const subscription = await findSubscriptionByUserId(adminToken, userId);
    const customerId = getCustomerId(subscription);

    if (!customerId) {
      return res.status(400).json({
        error: "No billing customer found for this account",
      });
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

async function handleCreateCheckoutSession(req, res) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const userId = req.user.id;
    const customerEmail = req.user.email;
    const { billingPeriod, successUrl, cancelUrl } = req.body || {};

    if (!customerEmail) {
      return res.status(400).json({ error: "User email is required" });
    }

    if (!isValidPocketBaseId(userId)) {
      return res.status(400).json({ error: "Invalid user" });
    }

    // Server resolves price — never trust client priceId
    const priceId = resolvePriceId(billingPeriod);
    if (!priceId) {
      return res.status(500).json({
        error: "STRIPE_PRICE_PRO is not configured on the server",
      });
    }

    const allowed = getAllowedPriceIds();
    if (!allowed.includes(priceId)) {
      return res.status(400).json({ error: "Invalid price" });
    }

    if (successUrl && !isAllowedReturnUrl(successUrl)) {
      return res.status(400).json({ error: "Invalid successUrl" });
    }
    if (cancelUrl && !isAllowedReturnUrl(cancelUrl)) {
      return res.status(400).json({ error: "Invalid cancelUrl" });
    }

    // Prefer existing Stripe customer linked to this user's subscription
    const adminToken = await getAdminToken();
    const existingSub = await findSubscriptionByUserId(adminToken, userId);
    let customerId = getCustomerId(existingSub);

    if (!customerId) {
      const existingCustomers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        await stripe.customers.update(customerId, {
          metadata: { userId },
        });
      }
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
      metadata: {
        userId: userId,
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
}

// ============================================================================
// RATE LIMITERS
// ============================================================================

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests" },
});

const portalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: "Too many requests" },
});

// ============================================================================
// MIDDLEWARE & ROUTES
// ============================================================================

app.use(
  cors({
    origin: ALLOWED_FRONTEND_ORIGINS,
    methods: ["POST", "GET"],
    credentials: true,
  }),
);

// Stripe webhook BEFORE express.json() for raw body signature verification
app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  webhookLimiter,
  handleStripeWebhook,
);

app.use(express.json());

app.post(
  "/create-portal-session",
  portalLimiter,
  requireUserAuth,
  handleCreatePortalSession,
);

app.post(
  "/create-checkout-session",
  portalLimiter,
  requireUserAuth,
  handleCreateCheckoutSession,
);

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
║  POST /create-portal-session (auth required)      ║
║  POST /create-checkout-session (auth required)    ║
║                                                   ║
║  Security: ${STRIPE_WEBHOOK_SECRET ? "✅ Webhook signature verification enabled" : "❌ STRIPE_WEBHOOK_SECRET missing!"}
╚═══════════════════════════════════════════════════╝
  `);
});
