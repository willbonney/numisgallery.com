import pb from '../lib/pocketbase';

/**
 * Update storage used for a user's subscription
 * @param fileSizeBytes - Size of file in bytes (positive for add, negative for remove)
 */
export async function updateStorageUsed(fileSizeBytes: number): Promise<void> {
  const userId = pb.authStore.record?.id;
  if (!userId) {
    throw new Error('Not authenticated');
  }

  try {
    // Get user's subscription
    const subscriptions = await pb.collection('subscriptions').getFullList({
      filter: `userId = "${userId}"`,
    });

    if (subscriptions.length === 0) {
      console.warn('No subscription found for user');
      return;
    }

    const subscription = subscriptions[0];
    const currentStorage = subscription.totalStorageUsed || 0;
    const newStorage = Math.max(0, currentStorage + fileSizeBytes);

    // Update subscription with new storage amount
    await pb.collection('subscriptions').update(subscription.id, {
      totalStorageUsed: newStorage,
    });
  } catch (error) {
    console.error('Failed to update storage used:', error);
    // Don't throw - storage tracking shouldn't block file operations
  }
}

/**
 * Check if user can upload files of the given size
 * @param newFileSize - Size of new files in bytes
 * @returns Promise with storage check result
 */
export async function checkStorageLimit(newFileSize: number): Promise<{
  allowed: boolean;
  currentSize: number;
  newSize: number;
  limit: number;
}> {
  const userId = pb.authStore.record?.id;
  if (!userId) {
    throw new Error('Not authenticated');
  }

  try {
    // Get user's subscription
    const subscriptions = await pb.collection('subscriptions').getFullList({
      filter: `userId = "${userId}"`,
    });

    if (subscriptions.length === 0) {
      // No subscription found, allow upload (shouldn't happen)
      return {
        allowed: true,
        currentSize: 0,
        newSize: newFileSize,
        limit: 250 * 1024 * 1024, // 250MB default
      };
    }

    const subscription = subscriptions[0];
    const currentSize = subscription.totalStorageUsed || 0;
    const newSize = currentSize + newFileSize;
    
    // Storage limits: 250MB for free, 2GB for pro
    const limit = subscription.tier === 'pro' 
      ? 2 * 1024 * 1024 * 1024 // 2GB
      : 250 * 1024 * 1024; // 250MB
    
    const allowed = limit === Infinity || newSize <= limit;

    return {
      allowed,
      currentSize,
      newSize,
      limit,
    };
  } catch (error) {
    console.error('Failed to check storage limit:', error);
    // Fail open - allow upload if we can't check
    return {
      allowed: true,
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
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
