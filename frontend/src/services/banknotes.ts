import pb from '../lib/pocketbase';
import type { Banknote, BanknoteFormData } from '../types/banknote';
import { updateStorageUsed } from '../utils/storageTracking';

const COLLECTION = 'banknotes';

export const banknoteService = {
  // Get all banknotes for current user
  async getMyBanknotes(): Promise<Banknote[]> {
    const userId = pb.authStore.record?.id;
    if (!userId) throw new Error('Not authenticated');
    
    // Fetch all records and filter client-side (SDK filter encoding issue with PB 0.34)
    const records = await pb.collection(COLLECTION).getFullList<Banknote>({
      sort: '-id', // PB 0.34+ doesn't expose 'created' for sorting on base collections
    });
    return records.filter(r => r.userId === userId);
  },

  // Get public banknotes for a specific user
  async getUserBanknotes(userId: string): Promise<Banknote[]> {
    try {
      // Try to fetch with filter if authenticated, otherwise fetch all public
      const isAuthenticated = !!pb.authStore.record;
      
      if (isAuthenticated) {
        // If authenticated, we can fetch all and filter client-side
    const records = await pb.collection(COLLECTION).getFullList<Banknote>({
          sort: '-id',
    });
    return records.filter(r => r.userId === userId && r.isVisibleInCollection);
      } else {
        // If not authenticated, try to fetch public banknotes
        // Note: This requires API rules to allow: isVisibleInCollection = true
        try {
          const records = await pb.collection(COLLECTION).getFullList<Banknote>({
            filter: `isVisibleInCollection = true`,
            sort: '-id',
          });
          return records.filter(r => r.userId === userId);
        } catch (error) {
          // If filter fails (API rules don't allow public access), return empty
          console.warn('Public access not allowed by API rules. Banknotes collection needs to allow public reads for isVisibleInCollection = true');
          console.error('Error fetching public banknotes:', error);
          return [];
        }
      }
    } catch (error) {
      console.error('Failed to fetch user banknotes:', error);
      throw error;
    }
  },

  // Get all public banknotes from all users
  async getAllPublicBanknotes(): Promise<Banknote[]> {
    try {
      const isAuthenticated = !!pb.authStore.record;
      
      if (isAuthenticated) {
        // If authenticated, fetch all and filter client-side
    const records = await pb.collection(COLLECTION).getFullList<Banknote>({
          sort: '-id',
    });
    return records.filter(r => r.isVisibleInCollection);
      } else {
        // If not authenticated, try to fetch only public banknotes
        try {
          const records = await pb.collection(COLLECTION).getFullList<Banknote>({
            filter: `isVisibleInCollection = true`,
            sort: '-id',
          });
          return records;
        } catch (error) {
          // If filter fails (API rules don't allow public access), return empty
          console.warn('Public access not allowed by API rules. Banknotes collection needs to allow public reads for isVisibleInCollection = true');
          console.error('Error fetching public banknotes:', error);
          return [];
        }
      }
    } catch (error) {
      console.error('Failed to fetch public banknotes:', error);
      throw error;
    }
  },

  // Get a single banknote
  async getBanknote(id: string): Promise<Banknote> {
    return await pb.collection(COLLECTION).getOne<Banknote>(id);
  },

  // Create a new banknote
  async createBanknote(
    data: BanknoteFormData & { obverseImage?: File; reverseImage?: File }
  ): Promise<Banknote> {
    const userId = pb.authStore.record?.id;
    console.log('[PocketBase] Auth store:', pb.authStore);
    console.log('[PocketBase] User ID:', userId);
    console.log('[PocketBase] Auth record:', pb.authStore.record);
    
    if (!userId) throw new Error('Not authenticated');

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('userId', userId);
    
    // Debug: Log what we're sending
    console.log('[PocketBase] Creating banknote with data:', data);
    
    // Track file sizes for storage tracking
    let obverseSize = 0;
    let reverseSize = 0;
    
    // Append all form fields
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'obverseImage' || key === 'reverseImage') {
        // Handle file fields separately
        if (value instanceof File) {
          formData.append(key, value);
          if (key === 'obverseImage') obverseSize = value.size;
          if (key === 'reverseImage') reverseSize = value.size;
          console.log(`[PocketBase] Adding file: ${key} (${value.name}, ${value.size} bytes)`);
        }
      } else if (value !== null && value !== undefined && value !== '') {
        // Skip empty strings for optional fields
        formData.append(key, String(value));
        console.log(`[PocketBase] Adding field: ${key} = ${value} (type: ${typeof value})`);
      }
    });
    
    // Store file sizes in the record for accurate storage tracking
    if (obverseSize > 0) {
      formData.append('obverseImageSize', String(obverseSize));
    }
    if (reverseSize > 0) {
      formData.append('reverseImageSize', String(reverseSize));
    }

    try {
      const created = await pb.collection(COLLECTION).create<Banknote>(formData);
      console.log('[PocketBase] Created banknote response:', { id: created.id, countryCode: created.countryCode, country: created.country });
      
      // Update storage tracking (non-blocking)
      const totalFileSize = obverseSize + reverseSize;
      if (totalFileSize > 0) {
        updateStorageUsed(totalFileSize).catch(err => 
          console.error('Failed to update storage tracking:', err)
        );
      }
      
      return created;
    } catch (error) {
      console.error('[PocketBase] Create error:', error);
      if (error && typeof error === 'object' && 'data' in error) {
        console.error('[PocketBase] Error data:', JSON.stringify((error as { data?: unknown }).data, null, 2));
      }
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('[PocketBase] Error response:', JSON.stringify((error as { response?: unknown }).response, null, 2));
      }
      throw error;
    }
  },

  // Update an existing banknote
  async updateBanknote(
    id: string,
    data: Partial<BanknoteFormData> & { obverseImage?: File; reverseImage?: File }
  ): Promise<Banknote> {
    // Get existing banknote to check old file sizes
    let oldBanknote: Banknote | null = null;
    try {
      oldBanknote = await this.getBanknote(id);
    } catch (error) {
      console.warn('Could not fetch old banknote for storage tracking:', error);
    }

    // Create FormData for file upload
    const formData = new FormData();
    
    // Track file size changes
    let newObverseSize = 0;
    let newReverseSize = 0;
    const oldObverseSize = oldBanknote?.obverseImageSize || 0;
    const oldReverseSize = oldBanknote?.reverseImageSize || 0;
    
    // Append all form fields
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'obverseImage' || key === 'reverseImage') {
        // Handle file fields
        if (value instanceof File) {
          formData.append(key, value);
          if (key === 'obverseImage') newObverseSize = value.size;
          if (key === 'reverseImage') newReverseSize = value.size;
        }
      } else if (value !== null && value !== undefined && value !== '') {
        // Skip empty strings for optional fields
        formData.append(key, String(value));
      }
    });
    
    // Store new file sizes
    if (newObverseSize > 0) {
      formData.append('obverseImageSize', String(newObverseSize));
    }
    if (newReverseSize > 0) {
      formData.append('reverseImageSize', String(newReverseSize));
    }

    const updated = await pb.collection(COLLECTION).update<Banknote>(id, formData);
    
    // Update storage tracking: subtract old sizes, add new sizes
    const netChange = (newObverseSize - oldObverseSize) + (newReverseSize - oldReverseSize);
    if (netChange !== 0) {
      updateStorageUsed(netChange).catch(err => 
        console.error('Failed to update storage tracking:', err)
      );
    }
    
    return updated;
  },

  // Delete a banknote
  async deleteBanknote(id: string): Promise<boolean> {
    // Get banknote before deleting to track storage
    try {
      const banknote = await this.getBanknote(id);
      const totalSize = (banknote.obverseImageSize || 0) + (banknote.reverseImageSize || 0);
      
      // Subtract storage used
      if (totalSize > 0) {
        updateStorageUsed(-totalSize).catch(err => 
          console.error('Failed to update storage tracking:', err)
        );
      }
    } catch (error) {
      console.warn('Could not fetch banknote for storage tracking before delete:', error);
    }
    
    return await pb.collection(COLLECTION).delete(id);
  },

  // Subscribe to real-time updates for user's banknotes
  subscribeToMyBanknotes(
    callback: (data: { action: string; record: Banknote }) => void
  ): () => void {
    const userId = pb.authStore.record?.id;
    if (!userId) throw new Error('Not authenticated');

    pb.collection(COLLECTION).subscribe('*', (e) => {
      if (e.record.userId === userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callback(e as any);
      }
    });

    return () => pb.collection(COLLECTION).unsubscribe();
  },
};

