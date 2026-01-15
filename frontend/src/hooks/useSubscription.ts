import { ClientResponseError } from "pocketbase";
import { useCallback, useEffect, useState } from "react";
import pb from "../lib/pocketbase";

export type SubscriptionTier = "free" | "pro";
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing";

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  pmgFetchesUsed?: number;
  aiExtractionsUsed?: number;
  usagePeriodStart?: string;
  usagePeriodEnd?: string;
  totalStorageUsed?: number;
  created: string;
  updated: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    const userId = pb.authStore.record?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const records = await pb
        .collection("subscriptions")
        .getFullList<Subscription>({
          filter: `userId = "${userId}"`,
        });

      if (records.length > 0) {
        setSubscription(records[0]);
      } else {
        // Create default free subscription with usage tracking fields
        const now = new Date();
        const periodEnd = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          now.getDate()
        );

        const newSubscription = await pb
          .collection("subscriptions")
          .create<Subscription>({
            userId: userId,
            tier: "free",
            status: "active",
            cancelAtPeriodEnd: false,
            pmgFetchesUsed: 0,
            aiExtractionsUsed: 0,
            usagePeriodStart: now.toISOString().split("T")[0],
            usagePeriodEnd: periodEnd.toISOString().split("T")[0],
          });
        setSubscription(newSubscription);
      }
    } catch (error) {
      // Handle case where subscriptions collection doesn't exist yet
      if (
        error instanceof ClientResponseError &&
        (error.status === 404 || error.message?.includes("Missing collection"))
      ) {
        console.warn(
          "Subscriptions collection not found. Please run the setup script to create it."
        );
        // Set default free subscription in memory (won't persist until collection exists)
        setSubscription({
          id: "",
          userId: userId,
          tier: "free",
          status: "active",
          cancelAtPeriodEnd: false,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        });
      } else {
        console.error("Failed to load subscription:", error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const getTierLimits = useCallback((tier: SubscriptionTier) => {
    switch (tier) {
      case "free":
        return {
          maxBanknotes: 50,
          maxFeatured: 0,
          pmgFetches: 5,
          aiExtractions: 5,
          storage: {
            limit: 250 * 1024 * 1024, // 250MB
          },
        };
      case "pro":
        return {
          maxBanknotes: Infinity,
          maxFeatured: Infinity,
          pmgFetches: 50,
          aiExtractions: 50,
          storage: {
            limit: 2 * 1024 * 1024 * 1024, // 2GB
          },
        };
    }
  }, []);

  const getUsageInfo = useCallback(() => {
    if (!subscription) {
      return {
        pmgFetches: { limit: 5, used: 0, remaining: 5 },
        aiExtractions: { limit: 5, used: 0, remaining: 5 },
      };
    }

    const limits = getTierLimits(subscription.tier);
    const pmgUsed = subscription.pmgFetchesUsed || 0;
    const aiUsed = subscription.aiExtractionsUsed || 0;

    return {
      pmgFetches: {
        limit: limits.pmgFetches,
        used: pmgUsed,
        remaining:
          limits.pmgFetches === Infinity
            ? Infinity
            : Math.max(0, limits.pmgFetches - pmgUsed),
      },
      aiExtractions: {
        limit: limits.aiExtractions,
        used: aiUsed,
        remaining:
          limits.aiExtractions === Infinity
            ? Infinity
            : Math.max(0, limits.aiExtractions - aiUsed),
      },
    };
  }, [subscription, getTierLimits]);

  return {
    subscription,
    loading,
    reload: loadSubscription,
    getTierLimits,
    getUsageInfo,
  };
}
