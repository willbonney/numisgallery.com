import pb from "../lib/pocketbase";

/**
 * Storage usage is recomputed server-side by PocketBase hooks after banknote
 * create/update/delete. The client must not PATCH subscriptions (field-locked).
 */

/**
 * Check if user can upload files of the given size (read-only).
 * Server hooks still enforce limits on write.
 */
export async function checkStorageLimit(newFileSize: number): Promise<{
  allowed: boolean;
  currentSize: number;
  newSize: number;
  limit: number;
}> {
  const userId = pb.authStore.record?.id;
  if (!userId) {
    throw new Error("Not authenticated");
  }

  try {
    const subscriptions = await pb.collection("subscriptions").getFullList({
      filter: `userId = "${userId}"`,
    });

    if (subscriptions.length === 0) {
      // No subscription — fail closed for free default limit display
      return {
        allowed: false,
        currentSize: 0,
        newSize: newFileSize,
        limit: 250 * 1024 * 1024,
      };
    }

    const subscription = subscriptions[0];
    const currentSize = subscription.totalStorageUsed || 0;
    const newSize = currentSize + newFileSize;

    const limit =
      subscription.tier === "pro"
        ? 2 * 1024 * 1024 * 1024 // 2GB
        : 250 * 1024 * 1024; // 250MB

    const allowed = newSize <= limit;

    return {
      allowed,
      currentSize,
      newSize,
      limit,
    };
  } catch (error) {
    console.error("Failed to check storage limit:", error);
    // Fail closed
    return {
      allowed: false,
      currentSize: 0,
      newSize: newFileSize,
      limit: 250 * 1024 * 1024,
    };
  }
}

/**
 * Format storage size for display
 */
export function formatStorageSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
