import {
  Badge,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  IconBrain,
  IconCashBanknote,
  IconCashBanknoteHeart,
  IconChartBar,
  IconClock,
  IconCrown,
  IconFileSpreadsheet,
  IconLayoutGrid,
  IconPhotoSearch,
  IconSparkles,
  IconTag,
  IconUpload,
} from "@tabler/icons-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  useSubscription,
  type SubscriptionTier,
} from "../hooks/useSubscription";

const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_live_default_key";

const SHOW_SUBSCRIPTIONS = import.meta.env.VITE_SHOW_SUBSCRIPTIONS === "true";

interface Feature {
  text: string;
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    style?: React.CSSProperties;
  }>;
}

interface PricingTier {
  id: SubscriptionTier;
  name: string;
  price: string;
  priceYearly: string;
  description: string;
  features: Feature[];
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    priceYearly: "$0",
    description: "Perfect for getting started",
    features: [
      { text: "Up to 50 banknotes", icon: IconCashBanknote },
      { text: "Up to 15 featured banknotes", icon: IconCashBanknoteHeart },
      { text: "PMG image fetching (5/month)", icon: IconPhotoSearch },
      { text: "AI data extraction (5/month)", icon: IconBrain },
      { text: "250MB image storage", icon: IconUpload },
      { text: "Basic gallery view", icon: IconLayoutGrid },
      { text: "CSV export", icon: IconFileSpreadsheet },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$4.99/month",
    priceYearly: "$49/year",
    description: "For serious collectors",
    popular: true,
    features: [
      { text: "Unlimited banknotes", icon: IconCashBanknote },
      { text: "Unlimited featured banknotes", icon: IconCashBanknoteHeart },
      { text: "PMG image fetching (50/month)", icon: IconPhotoSearch },
      { text: "AI data extraction (50/month)", icon: IconBrain },
      { text: "2GB image storage", icon: IconUpload },
      {
        text: "Advanced gallery view (filters, sorting)",
        icon: IconLayoutGrid,
      },
      { text: "CSV and PDF export", icon: IconFileSpreadsheet },
      { text: "Advanced analytics (coming soon)", icon: IconChartBar },
      { text: "Custom categories/tags (coming soon)", icon: IconTag },
      { text: "Priority scraping queue (coming soon)", icon: IconClock },
    ],
  },
];

export function SubscriptionPage() {
  const { user } = useAuth();
  const { subscription, loading } = useSubscription();
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );

  useEffect(() => {
    if (!SHOW_SUBSCRIPTIONS || !STRIPE_PUBLISHABLE_KEY) {
      return;
    }

    const initStripe = async () => {
      const stripeInstance = await loadStripe(STRIPE_PUBLISHABLE_KEY);
      if (stripeInstance) {
        setStripe(stripeInstance);
      }
    };

    initStripe();
  }, []);

  const handleSubscribe = async (tierId: SubscriptionTier) => {
    if (!stripe || !user) return;

    try {
      // Get price ID for Pro tier (Free tier doesn't need Stripe)
      const priceId =
        tierId === "pro" ? import.meta.env.VITE_STRIPE_PRICE_PRO : null;

      if (tierId === "pro" && !priceId) {
        alert("Price ID not configured. Please set VITE_STRIPE_PRICE_PRO");
        return;
      }

      if (tierId === "free") {
        // Free tier - no checkout needed, just show message
        alert(
          "You are already on the Free plan or can downgrade from your account settings."
        );
        return;
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          customerEmail: user.email,
          clientReferenceId: user.id,
          successUrl: `${window.location.origin}/subscription?success=true`,
          cancelUrl: `${window.location.origin}/subscription`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { sessionUrl } = await response.json();
      window.location.href = sessionUrl;
    } catch (error) {
      console.error("Failed to open checkout:", error);
    }
  };

  if (!SHOW_SUBSCRIPTIONS) {
    return (
      <Container size="md" py="xl">
        <Title order={2} mb="md">
          Subscriptions
        </Title>
        <Text c="dimmed">Subscription management is currently disabled.</Text>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  const currentTier = subscription?.tier || "free";

  return (
    <Container
      size="lg"
      pt={{ base: "4rem", md: "6rem" }}
      pb={{ base: "xl", md: "3rem" }}
      style={{ scrollMarginTop: "4rem", minHeight: "100vh" }}
    >
      <Stack gap="xl" style={{ paddingTop: "1rem" }}>
        <Stack gap="md" align="center" mb="xl" style={{ width: "100%" }}>
          <Title
            order={1}
            ta="center"
            size="2.5rem"
            fw={700}
            style={{ lineHeight: 1.2, marginTop: 0, wordWrap: "break-word" }}
          >
            Choose Your Plan
          </Title>
          <Text
            c="dimmed"
            ta="center"
            size="lg"
            maw={600}
            style={{ wordWrap: "break-word" }}
          >
            Select the perfect plan for your collection needs
          </Text>
        </Stack>

        <Group justify="center" mb="xl">
          <SegmentedControl
            value={billingPeriod}
            onChange={(value) =>
              setBillingPeriod(value as "monthly" | "yearly")
            }
            data={[
              { label: "Monthly", value: "monthly" },
              { label: "Yearly (Save 17%)", value: "yearly" },
            ]}
            size="md"
          />
        </Group>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: "2rem",
            marginBottom: "2rem",
            alignItems: "stretch",
          }}
        >
          {pricingTiers.map((tier) => {
            const isCurrentTier = currentTier === tier.id;
            const isUpgrade = tier.id !== "free" && currentTier === "free";
            const isPro = tier.id === "pro";

            return (
              <Card
                key={tier.id}
                p="xl"
                withBorder
                radius="md"
                style={{
                  position: "relative",
                  border:
                    tier.popular && !isCurrentTier
                      ? "2px solid var(--mantine-color-blue-6)"
                      : isCurrentTier
                        ? "2px solid var(--mantine-color-green-6)"
                        : "1px solid var(--mantine-color-gray-4)",
                  boxShadow:
                    tier.popular && !isCurrentTier
                      ? "0 4px 12px rgba(37, 99, 235, 0.2)"
                      : isCurrentTier
                        ? "0 4px 12px rgba(34, 197, 94, 0.2)"
                        : "0 2px 8px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.2s ease",
                  transform:
                    tier.popular && !isCurrentTier ? "scale(1.02)" : undefined,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "visible",
                  zIndex: isCurrentTier || tier.popular ? 1 : 0,
                }}
                onMouseEnter={(e) => {
                  if (!tier.popular && !isCurrentTier) {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 16px rgba(0, 0, 0, 0.12)";
                    e.currentTarget.style.borderColor =
                      "var(--mantine-color-gray-5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!tier.popular && !isCurrentTier) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(0, 0, 0, 0.08)";
                    e.currentTarget.style.borderColor =
                      "var(--mantine-color-gray-4)";
                  }
                }}
              >
                {isCurrentTier ? (
                  <Badge
                    color="green"
                    variant="filled"
                    size="lg"
                    style={{
                      position: "absolute",
                      top: "-12px",
                      right: "1rem",
                      zIndex: 1000,
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    Current Plan
                  </Badge>
                ) : (
                  tier.popular && (
                    <Badge
                      color="blue"
                      variant="gradient"
                      gradient={{ from: "blue", to: "cyan" }}
                      size="lg"
                      style={{
                        position: "absolute",
                        top: "-12px",
                        right: "1rem",
                        zIndex: 1000,
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                      }}
                      leftSection={<IconSparkles size={14} />}
                    >
                      Best Value
                    </Badge>
                  )
                )}

                <Stack gap="lg">
                  <div>
                    <Group gap="xs" mb="xs" wrap="nowrap">
                      {isPro && (
                        <IconCrown
                          size={24}
                          color="var(--mantine-color-yellow-6)"
                          style={{ flexShrink: 0 }}
                        />
                      )}
                      <Title
                        order={2}
                        size="1.75rem"
                        fw={700}
                        style={{ lineHeight: 1.2 }}
                      >
                        {tier.name}
                      </Title>
                    </Group>
                    <Text
                      c="dimmed"
                      size="sm"
                      mb="md"
                      style={{ minHeight: "1.5rem" }}
                    >
                      {tier.description}
                    </Text>
                    <Group gap={4} align="baseline" mb="xs">
                      <Text size="2.5rem" fw={800} lh={1}>
                        {billingPeriod === "monthly"
                          ? tier.price.includes("/")
                            ? tier.price.split("/")[0]
                            : tier.price.replace("/month", "").trim()
                          : tier.priceYearly.includes("/")
                            ? tier.priceYearly.split("/")[0]
                            : tier.priceYearly.replace("/year", "").trim()}
                      </Text>
                      {billingPeriod === "monthly" && (
                        <Text size="sm" c="dimmed" fw={500}>
                          /month
                        </Text>
                      )}
                      {billingPeriod === "yearly" && (
                        <Text size="sm" c="dimmed" fw={500}>
                          /year
                        </Text>
                      )}
                    </Group>
                    {billingPeriod === "yearly" && tier.id === "pro" && (
                      <Text size="xs" c="green" fw={500}>
                        Save 17% compared to monthly
                      </Text>
                    )}
                  </div>

                  <Divider />

                  <Stack gap="sm" mt="xs">
                    {tier.features.map((feature, idx) => {
                      const isComingSoon = feature.text
                        .toLowerCase()
                        .includes("coming soon");
                      const FeatureIcon = feature.icon;
                      return (
                        <Group key={idx} gap="sm" align="flex-start">
                          <FeatureIcon
                            size={18}
                            color={
                              isComingSoon
                                ? "var(--mantine-color-gray-5)"
                                : "var(--mantine-color-blue-6)"
                            }
                            style={{ marginTop: "2px", flexShrink: 0 }}
                          />
                          <Text
                            size="sm"
                            c={isComingSoon ? "dimmed" : undefined}
                            style={{ flex: 1 }}
                          >
                            {feature.text}
                          </Text>
                        </Group>
                      );
                    })}
                  </Stack>

                  <Button
                    fullWidth
                    size="lg"
                    mt="auto"
                    variant={
                      isCurrentTier
                        ? "outline"
                        : tier.popular
                          ? "filled"
                          : "default"
                    }
                    color={tier.popular && !isCurrentTier ? "blue" : undefined}
                    disabled={isCurrentTier || !user}
                    onClick={() => handleSubscribe(tier.id)}
                  >
                    {isCurrentTier
                      ? "Current Plan"
                      : tier.id === "free"
                        ? "Downgrade"
                        : isUpgrade
                          ? "Upgrade to Pro"
                          : "Subscribe"}
                  </Button>
                </Stack>
              </Card>
            );
          })}
        </div>
      </Stack>
    </Container>
  );
}
