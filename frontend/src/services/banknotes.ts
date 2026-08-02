import pb from "../lib/pocketbase";
import type {
  Banknote,
  BanknoteFormData,
  BanknoteSubmitFiles,
} from "../types/banknote";

const COLLECTION = "banknotes";

/** Escape a value for use inside a PocketBase double-quoted filter string */
function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

type BanknoteWritePayload = Partial<BanknoteFormData> & BanknoteSubmitFiles;

function appendFormFields(
  formData: FormData,
  data: BanknoteWritePayload,
  opts: { trackObverseReverseSize: boolean }
): { obverseSize: number; reverseSize: number; replacedObverse: boolean; replacedReverse: boolean } {
  let obverseSize = 0;
  let reverseSize = 0;
  let replacedObverse = false;
  let replacedReverse = false;

  const fileKeys = new Set([
    "obverseImage",
    "reverseImage",
    "waterMarkImage",
    "signatureScanFiles",
  ]);

  Object.entries(data).forEach(([key, value]) => {
    if (key === "obverseImage" || key === "reverseImage" || key === "waterMarkImage") {
      if (value instanceof File) {
        formData.append(key, value);
        if (key === "obverseImage") {
          obverseSize = value.size;
          replacedObverse = true;
        }
        if (key === "reverseImage") {
          reverseSize = value.size;
          replacedReverse = true;
        }
      }
      return;
    }

    if (key === "signatureScanFiles") {
      if (Array.isArray(value)) {
        for (const file of value) {
          if (file instanceof File) {
            formData.append("signatureScans", file);
          }
        }
      }
      return;
    }

    if (key === "userId") {
      return;
    }

    if (fileKeys.has(key)) return;

    if (value !== null && value !== undefined && value !== "") {
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

  if (opts.trackObverseReverseSize) {
    if (replacedObverse && obverseSize > 0) {
      formData.append("obverseImageSize", String(obverseSize));
    }
    if (replacedReverse && reverseSize > 0) {
      formData.append("reverseImageSize", String(reverseSize));
    }
  }

  return { obverseSize, reverseSize, replacedObverse, replacedReverse };
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
    data: BanknoteFormData & BanknoteSubmitFiles
  ): Promise<Banknote> {
    const userId = pb.authStore.record?.id;
    if (!userId) throw new Error("Not authenticated");

    const formData = new FormData();
    formData.append("userId", userId);

    const { obverseSize, reverseSize } = appendFormFields(formData, data, {
      trackObverseReverseSize: false,
    });

    if (obverseSize > 0) {
      formData.append("obverseImageSize", String(obverseSize));
    }
    if (reverseSize > 0) {
      formData.append("reverseImageSize", String(reverseSize));
    }

    try {
      return await pb.collection(COLLECTION).create<Banknote>(formData);
    } catch (error) {
      console.error("[PocketBase] Create error:", error);
      throw error;
    }
  },

  // Update an existing banknote
  async updateBanknote(
    id: string,
    data: Partial<BanknoteFormData> & BanknoteSubmitFiles
  ): Promise<Banknote> {
    const formData = new FormData();
    const { replacedObverse, replacedReverse, obverseSize, reverseSize } =
      appendFormFields(formData, data, { trackObverseReverseSize: false });

    if (replacedObverse) {
      formData.append("obverseImageSize", String(obverseSize));
    }
    if (replacedReverse) {
      formData.append("reverseImageSize", String(reverseSize));
    }

    return await pb.collection(COLLECTION).update<Banknote>(id, formData);
  },

  // Delete a banknote
  async deleteBanknote(id: string): Promise<boolean> {
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
