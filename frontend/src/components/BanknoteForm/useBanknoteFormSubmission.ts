import type { UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import type { BanknoteFormData } from '../../types/banknote';
import { checkStorageLimit, formatStorageSize } from '../../utils/storageTracking';

interface UseBanknoteFormSubmissionProps {
  form: UseFormReturnType<BanknoteFormData>;
  isEditing: boolean;
  onSubmit: (data: BanknoteFormData & { obverseImage?: File; reverseImage?: File }) => Promise<void>;
  getFilesForSubmission: () => { obverseFileToUpload?: File; reverseFileToUpload?: File };
  getCommentsString: () => string;
  clearImages: () => void;
  resetComments: () => void;
  setSubmitting: (value: boolean) => void;
  setLoading: (loading: boolean, message?: string) => void;
}

// Helper function to trim string fields
function trimStringFields<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
  const trimmed = { ...obj };
  fields.forEach(field => {
    const value = trimmed[field];
    if (value && typeof value === 'string') {
      trimmed[field] = value.trim() as T[keyof T];
    }
  });
  return trimmed;
}

// Validate and transform US note data
function validateAndTransformUSNote(values: BanknoteFormData): BanknoteFormData {
  if (!values.authority || values.authority.trim() === '') {
    throw new Error('Authority is required for US notes');
  }
  return {
    ...values,
    country: 'United States of America',
    countryCode: 'us',
  };
}

// Validate and transform world note data
function validateAndTransformWorldNote(values: BanknoteFormData): BanknoteFormData {
  if (!values.country || values.country.trim() === '') {
    throw new Error('Country is required for world notes');
  }
  // Remove authority and city fields for world notes using destructuring
  const { authority: _authority, city: _city, ...rest } = values;
  return rest;
}

// Format storage error message
function formatStorageError(storageCheck: { currentSize: number; limit: number }): string {
  const currentMB = formatStorageSize(storageCheck.currentSize);
  const limitMB = storageCheck.limit === Infinity
    ? 'unlimited'
    : formatStorageSize(storageCheck.limit);

  return `Storage limit exceeded. You're using ${currentMB}${limitMB !== 'unlimited' ? ` of ${limitMB}` : ''}. ` +
    `Please delete some banknotes or upgrade to Pro for unlimited storage.`;
}

export function useBanknoteFormSubmission({
  form,
  isEditing,
  onSubmit,
  getFilesForSubmission,
  getCommentsString,
  clearImages,
  resetComments,
  setSubmitting,
  setLoading,
}: UseBanknoteFormSubmissionProps) {
  const handleSubmit = async (values: BanknoteFormData) => {
    setSubmitting(true);
    setLoading(true, 'Saving banknote...');
    try {
      const { obverseFileToUpload, reverseFileToUpload } = getFilesForSubmission();
      const commentsString = getCommentsString();

      // Trim string fields
      const stringFieldsToTrim: (keyof BanknoteFormData)[] = [
        'pmgCert',
        'country',
        'authority',
        'city',
        'pickNumber',
        'serialNumber',
        'watermark',
      ];
      let cleanedValues = trimStringFields(values, stringFieldsToTrim);

      // Validate and transform based on note type
      if (cleanedValues.noteType === 'us') {
        cleanedValues = validateAndTransformUSNote(cleanedValues);
      } else if (cleanedValues.noteType === 'world') {
        cleanedValues = validateAndTransformWorldNote(cleanedValues);
      }

      // Build final values with defaults
      const finalValues: BanknoteFormData = {
        ...cleanedValues,
        country: cleanedValues.country || '',
        countryCode: cleanedValues.countryCode || '',
        pickNumber: cleanedValues.pickNumber || '',
        currency: cleanedValues.currency || '',
        pmgCert: cleanedValues.pmgCert || '',
        serialNumber: cleanedValues.serialNumber || '',
        watermark: cleanedValues.watermark || '',
        dateOfPurchase: cleanedValues.dateOfPurchase || '',
        pmgComments: commentsString,
      };

      // Check storage before upload
      const newFileSize = (obverseFileToUpload?.size || 0) + (reverseFileToUpload?.size || 0);
      if (newFileSize > 0) {
        const storageCheck = await checkStorageLimit(newFileSize);
        if (!storageCheck.allowed) {
          throw new Error(formatStorageError(storageCheck));
        }
      }

      await onSubmit({
        ...finalValues,
        ...(obverseFileToUpload && { obverseImage: obverseFileToUpload }),
        ...(reverseFileToUpload && { reverseImage: reverseFileToUpload }),
      });

      notifications.show({
        title: 'Success',
        message: isEditing ? 'Banknote updated!' : 'Banknote added to your collection!',
        color: 'green',
      });

      if (!isEditing) {
        form.reset();
        clearImages();
        resetComments();
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save banknote',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  return { handleSubmit };
}

