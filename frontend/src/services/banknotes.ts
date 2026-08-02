import pb from "../lib/pocketbase";
import type { Banknote, BanknoteFormData } from "../types/banknote";

const COLLECTION = "banknotes";

/** Escape a value for use inside a PocketBase double-quoted filter string */
function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export const banknoteService = {
  // Get all banknotes for current user (server-side filter)
  async getMyBanknotes(): Promise<Banknote[]> {
    const userId = pb.authStore.record?.id;
    if (!userId) throw new Error("Not authenticated");

    return await pb.collection(COLLECTION).getFullList<Banknote>({
      filter: `userId = "${escapeFilterValue(userId)}"`,
      sort: "-id",
    });
  },

  // Get public banknotes for a specific user (server-side filter)
  async getUserBanknotes(userId: string): Promise<Banknote[]> {
    try {
      return await pb.collection(COLLECTION).getFullList<Banknote>({
        filter: `userId = "${escapeFilterValue(userId)}" && isVisibleInCollection = true`,
        sort: "-id",
      });
    } catch (error) {
      console.error("Failed to fetch user banknotes:", error);
      throw error;
    }
  },

  // Get all public banknotes from all users (server-side filter)
  async getAllPublicBanknotes(): Promise<Banknote[]> {
    try {
      return await pb.collection(COLLECTION).getFullList<Banknote>({
        filter: `isVisibleInCollection = true`,
        sort: "-id",
      });
    } catch (error) {
      console.error("Failed to fetch public banknotes:", error);
      throw error;
    }
  },

  // Get a single banknote (PB viewRule enforces visibility/ownership)
  async getBanknote(id: string): Promise<Banknote> {
    return await pb.collection(COLLECTION).getOne<Banknote>(id);
  },

  // Create a new banknote
  async createBanknote(
    data: BanknoteFormData & { obverseImage?: File; reverseImage?: File }
  ): Promise<Banknote> {
    const userId = pb.authStore.record?.id;
    if (!userId) throw new Error("Not authenticated");

    const formData = new FormData();
    // Always set ownership to the authenticated user (createRule also requires this)
    formData.append("userId", userId);

    let obverseSize = 0;
    let reverseSize = 0;

    Object.entries(data).forEach(([key, value]) => {
      if (key === "obverseImage" || key === "reverseImage") {
        if (value instanceof File) {
          formData.append(key, value);
          if (key === "obverseImage") obverseSize = value.size;
          if (key === "reverseImage") reverseSize = value.size;
        }
      } else if (key === "userId") {
        // Never accept client-supplied ownership override
        return;
      } else if (value !== null && value !== undefined && value !== "") {
        if (typeof value === "object") {
          formData.append(key, JSON.stringify(value));
        } else if (typeof value === "boolean") {
          formData.append(key, value ? "true" : "false");
        } else {
          formData.append(key, String(value));
        }
      } else if (typeof value === "boolean") {
        formData.append(key, value ? "true" : "false");
      }
    });

    if (obverseSize > 0) {
      formData.append("obverseImageSize", String(obverseSize));
    }
    if (reverseSize > 0) {
      formData.append("reverseImageSize", String(reverseSize));
    }

    try {
      // Storage counters are recomputed by PB hooks after create
      return await pb.collection(COLLECTION).create<Banknote>(formData);
    } catch (error) {
      console.error("[PocketBase] Create error:", error);
      throw error;
    }
  },

  // Update an existing banknote
  async updateBanknote(
    id: string,
    data: Partial<BanknoteFormData> & {
      obverseImage?: File;
      reverseImage?: File;
    }
  ): Promise<Banknote> {
    let newObverseSize = 0;
    let newReverseSize = 0;
    let replacedObverse = false;
    let replacedReverse = false;

    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (key === "obverseImage" || key === "reverseImage") {
        if (value instanceof File) {
          formData.append(key, value);
          if (key === "obverseImage") {
            newObverseSize = value.size;
            replacedObverse = true;
          }
          if (key === "reverseImage") {
            newReverseSize = value.size;
            replacedReverse = true;
          }
        }
      } else if (key === "userId") {
        // Never allow ownership transfer via client
        return;
      } else if (value !== null && value !== undefined && value !== "") {
        if (typeof value === "object") {
          formData.append(key, JSON.stringify(value));
        } else if (typeof value === "boolean") {
          formData.append(key, value ? "true" : "false");
        } else {
          formData.append(key, String(value));
        }
      } else if (typeof value === "boolean") {
        formData.append(key, value ? "true" : "false");
      }
    });

    if (replacedObverse) {
      formData.append("obverseImageSize", String(newObverseSize));
    }
    if (replacedReverse) {
      formData.append("reverseImageSize", String(newReverseSize));
    }

    // Storage counters are recomputed by PB hooks after update
    return await pb.collection(COLLECTION).update<Banknote>(id, formData);
  },

  // Delete a banknote
  async deleteBanknote(id: string): Promise<boolean> {
    // Storage counters are recomputed by PB hooks after delete
    return await pb.collection(COLLECTION).delete(id);
  },

  // Subscribe to real-time updates for user's banknotes
  subscribeToMyBanknotes(
    callback: (data: { action: string; record: Banknote }) => void
  ): () => void {
    const userId = pb.authStore.record?.id;
    if (!userId) throw new Error("Not authenticated");

    pb.collection(COLLECTION).subscribe("*", (e) => {
      if (e.record.userId === userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callback(e as any);
      }
    });

    return () => pb.collection(COLLECTION).unsubscribe();
  },
};
