import type { UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import type { BanknoteFormData, BanknoteSubmitFiles } from '../../types/banknote';
import { checkStorageLimit, formatStorageSize } from '../../utils/storageTracking';

interface UseBanknoteFormSubmissionProps {
  form: UseFormReturnType<BanknoteFormData>;
  isEditing: boolean;
  onSubmit: (data: BanknoteFormData & BanknoteSubmitFiles) => Promise<void>;
  getFilesForSubmission: () => {
    obverseFileToUpload?: File;
    reverseFileToUpload?: File;
    waterMarkFileToUpload?: File;
    signatureScanFiles?: File[];
  };
  getCommentsString: () => string;
  clearImages: () => void;
  resetComments: () => void;
  onResetExtra?: () => void;
  setSubmitting: (value: boolean) => void;
  setLoading: (loading: boolean, message?: string) => void;
}

// Helper function to trim string fields
export function trimStringFields<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
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
export function validateAndTransformUSNote(values: BanknoteFormData): BanknoteFormData {
  if (!values.authority || values.authority.trim() === '') {
    throw new Error('Authority is required for US notes');
  }
  return {
    ...values,
    // Must match the country list so flags and filters line up with imports
    country: 'United States',
    countryCode: 'us',
  };
}

// Validate and transform world note data
export function validateAndTransformWorldNote(values: BanknoteFormData): BanknoteFormData {
  if (!values.country || values.country.trim() === '') {
    throw new Error('Country is required for world notes');
  }
  // City is US-note specific; keep authority (issuer) for world notes
  const { city: _city, ...rest } = values;
  return rest;
}

// Format storage error message
export function formatStorageError(storageCheck: { currentSize: number; limit: number }): string {
  const currentSize = formatStorageSize(storageCheck.currentSize);
  const limit = storageCheck.limit === Infinity
    ? 'unlimited'
    : formatStorageSize(storageCheck.limit);

  return `Storage limit exceeded. You're using ${currentSize} of ${limit}. ` +
    `Delete some images or upgrade your plan for more storage.`;
}

export function signaturesForSave(signatures: BanknoteFormData['signatures']) {
  return (signatures || []).map(({ name, title, signatureScan }) => {
    const trimmedTitle = (title || '').trim();
    return {
      name: (name || '').trim(),
      ...(trimmedTitle ? { title: trimmedTitle } : {}),
      ...(signatureScan ? { signatureScan } : {}),
    };
  }).filter((s) => s.name || s.signatureScan);
}

export function useBanknoteFormSubmission({
  form,
  isEditing,
  onSubmit,
  getFilesForSubmission,
  getCommentsString,
  clearImages,
  resetComments,
  onResetExtra,
  setSubmitting,
  setLoading,
}: UseBanknoteFormSubmissionProps) {
  const handleSubmit = async (values: BanknoteFormData) => {
    setSubmitting(true);
    setLoading(true, 'Saving banknote...');
    try {
      const {
        obverseFileToUpload,
        reverseFileToUpload,
        waterMarkFileToUpload,
        signatureScanFiles,
      } = getFilesForSubmission();
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
        'watermarkDescription',
        'numistaId',
        'obvDescription',
        'revDescription',
        'obvEngraver',
        'obvDesigner',
        'revEngraver',
        'revDesigner',
      ];
      let cleanedValues = trimStringFields(values, stringFieldsToTrim);

      // Validate and transform based on note type
      if (cleanedValues.noteType === 'us') {
        cleanedValues = validateAndTransformUSNote(cleanedValues);
      } else if (cleanedValues.noteType === 'world') {
        cleanedValues = validateAndTransformWorldNote(cleanedValues);
      }

      const savedSignatures = signaturesForSave(cleanedValues.signatures);

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
        watermarkDescription: cleanedValues.watermarkDescription || '',
        dateOfPurchase: cleanedValues.dateOfPurchase || '',
        pmgComments: commentsString,
        numistaId: cleanedValues.numistaId || '',
        obvDescription: cleanedValues.obvDescription || '',
        revDescription: cleanedValues.revDescription || '',
        obvEngraver: cleanedValues.obvEngraver || '',
        obvDesigner: cleanedValues.obvDesigner || '',
        revEngraver: cleanedValues.revEngraver || '',
        revDesigner: cleanedValues.revDesigner || '',
        signatures: savedSignatures,
      };

      // Check storage before upload
      const newFileSize =
        (obverseFileToUpload?.size || 0) +
        (reverseFileToUpload?.size || 0) +
        (waterMarkFileToUpload?.size || 0) +
        (signatureScanFiles || []).reduce((sum, f) => sum + (f?.size || 0), 0);
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
        ...(waterMarkFileToUpload && { waterMarkImage: waterMarkFileToUpload }),
        ...(signatureScanFiles &&
          signatureScanFiles.length > 0 && { signatureScanFiles }),
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
        onResetExtra?.();
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
