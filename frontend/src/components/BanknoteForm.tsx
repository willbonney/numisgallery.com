import { ActionIcon, Button, Collapse, Divider, Group, Paper, Stack, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconArrowLeft } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useLoading } from '../contexts/LoadingContext';
import { getCountryCode } from '../data/countries';
import { useAuth } from '../hooks/useAuth';
import { useBanknoteImages } from '../hooks/useBanknoteImages';
import { usePmgComments } from '../hooks/usePmgComments';
import type { Banknote, BanknoteFormData, PmgGrade } from '../types/banknote';
import { PMG_GRADES } from '../types/banknote';
import { extractDataFromImages as extractDataFromImagesHelper, selectNumberInputOnFocus } from './BanknoteForm/BanknoteForm.helpers';
import { DenominationSection } from './BanknoteForm/DenominationSection';
import { DetailsSection } from './BanknoteForm/DetailsSection';
import { DisplaySettingsSection } from './BanknoteForm/DisplaySettingsSection';
import { ImagesSection } from './BanknoteForm/ImagesSection';
import { OriginSection } from './BanknoteForm/OriginSection';
import { PmgSection } from './BanknoteForm/PmgSection';
import { PurchaseSection } from './BanknoteForm/PurchaseSection';
import { useBanknoteFormSubmission } from './BanknoteForm/useBanknoteFormSubmission';
import { YearSection } from './BanknoteForm/YearSection';
import { CollapsibleSectionHeader } from './CollapsibleSectionHeader';

interface BanknoteFormProps {
  banknote?: Banknote;
  onSubmit: (data: BanknoteFormData & { obverseImage?: File; reverseImage?: File }) => Promise<void>;
  onCancel: () => void;
  currentFeaturedCount?: number; // Number of currently featured banknotes (excluding the one being edited)
}

export function BanknoteForm({ banknote, onSubmit, onCancel, currentFeaturedCount = 0 }: BanknoteFormProps) {
  const { user } = useAuth();
  const { setLoading } = useLoading();
  const isEditing = !!banknote;

  // Load collapsible section states from localStorage
  const loadSectionsState = () => {
    const defaults = {
      images: true,
      details: true, // Always expanded by default
    };

    const saved = localStorage.getItem('banknoteFormSectionsOpen');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure details is always true (expanded) by default
        return {
          ...defaults,
          ...parsed,
          details: true, // Force details to always be expanded
        };
      } catch {
        // If parsing fails, return defaults
      }
    }
    return defaults;
  };

  // Collapsible section states
  const [sectionsOpen, setSectionsOpen] = useState(loadSectionsState);

  // Save to localStorage whenever sections change
  useEffect(() => {
    localStorage.setItem('banknoteFormSectionsOpen', JSON.stringify(sectionsOpen));
  }, [sectionsOpen]);

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev: typeof sectionsOpen) => ({ ...prev, [section]: !prev[section] }));
  };

  // Image management hook
  const imageHandlers = useBanknoteImages({ banknote, isEditing, user });

  // PMG Comments hook
  const {
    pmgComments,
    handleAddComment,
    handleRemoveComment,
    handleCommentChange,
    getCommentsString,
    resetComments,
    setComments,
  } = usePmgComments(banknote);

  const [extractingData, setExtractingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<BanknoteFormData>({
    initialValues: {
      noteType: banknote?.noteType || 'world',
      country: banknote?.country || '',
      countryCode: banknote?.countryCode || '',
      authority: banknote?.authority || '',
      city: banknote?.city || '',
      pickNumber: banknote?.pickNumber || '',
      faceValue: banknote?.faceValue || 0,
      currency: banknote?.currency || '',
      yearOfIssueSingle: banknote?.yearOfIssueSingle,
      isRangeOfYearOfIssue: banknote?.isRangeOfYearOfIssue || false,
      yearOfIssueStart: banknote?.yearOfIssueStart,
      yearOfIssueEnd: banknote?.yearOfIssueEnd,
      pmgCert: banknote?.pmgCert || '',
      grade: banknote?.grade || '65',
      pmgComments: '', // Managed by pmgComments state array
      isEpq: banknote?.isEpq ?? (() => {
        const initialGrade = banknote?.grade || '65';
        const highGrades = ['65', '66', '67', '68', '69', '70'];
        return highGrades.includes(initialGrade);
      })(),
      isSpecimen: banknote?.isSpecimen || false,
      serialNumber: banknote?.serialNumber || '',
      watermark: banknote?.watermark || '',
      purchasePriceCurrency: banknote?.purchasePriceCurrency || 'USD',
      purchasePrice: banknote?.purchasePrice || 0,
      dateOfPurchase: banknote?.dateOfPurchase || '',
      isVisibleInCollection: banknote?.isVisibleInCollection ?? true,
      isFeatured: banknote?.isFeatured || false,
    },
  });

  const handleNoteTypeChange = (value: 'world' | 'us') => {
    form.setFieldValue('noteType', value);
    if (value === 'us') {
      // For US notes, set defaults
      form.setFieldValue('currency', 'USD');
      form.setFieldValue('currencyCode', 'USD');
      form.setFieldValue('countryCode', 'us');
    } else {
      // For world notes, clear US-specific defaults
      if (form.values.currency === 'USD' && form.values.country === '') {
        form.setFieldValue('currency', '');
      }
    }
  };

  const extractDataFromImages = () => {
    extractDataFromImagesHelper(
      imageHandlers.obverseState.originalUrl,
      imageHandlers.reverseState.originalUrl,
      setExtractingData,
      (data) => {
        // Handle note type - use handleNoteTypeChange to ensure SegmentedControl updates
        if (data.noteType) {
          handleNoteTypeChange(data.noteType);
        }

        // Handle country/authority based on note type
        if (data.noteType === 'world' && data.country) {
          form.setFieldValue('country', data.country);
          const code = getCountryCode(data.country);
          if (code) {
            form.setFieldValue('countryCode', code);
          }
          if (data.authority) {
            form.setFieldValue('authority', data.authority);
          }
        } else if (data.noteType === 'us') {
          // Set country for US notes (extracted data now includes it)
          if (data.country) {
            form.setFieldValue('country', data.country);
          }
          if (data.authority) {
            form.setFieldValue('authority', data.authority);
          }
          if (data.city) {
            form.setFieldValue('city', data.city);
          }
        }
        if (data.grade && PMG_GRADES.includes(data.grade as PmgGrade)) {
          handleGradeChange(data.grade);
        } else if (data.isEpq !== undefined) {
          form.setFieldValue('isEpq', data.isEpq);
        }
        if (data.isSpecimen !== undefined) form.setFieldValue('isSpecimen', data.isSpecimen);
        if (data.pickNumber) form.setFieldValue('pickNumber', data.pickNumber);

        if (data.yearOfIssue) {
          const yearMatch = data.yearOfIssue.match(/(\d{4})-(\d{4})/);
          if (yearMatch) {
            form.setFieldValue('isRangeOfYearOfIssue', true);
            form.setFieldValue('yearOfIssueStart', parseInt(yearMatch[1]));
            form.setFieldValue('yearOfIssueEnd', parseInt(yearMatch[2]));
          } else {
            form.setFieldValue('isRangeOfYearOfIssue', false);
            form.setFieldValue('yearOfIssueSingle', parseInt(data.yearOfIssue));
          }
        }

        if (data.faceValue) form.setFieldValue('faceValue', data.faceValue);
        if (data.currency) form.setFieldValue('currency', data.currency);
        if (data.serialNumber) form.setFieldValue('serialNumber', data.serialNumber);
        if (data.watermark) form.setFieldValue('watermark', data.watermark);

        if (data.pmgComments && data.pmgComments.length > 0) {
          const filteredComments = data.pmgComments.filter((c: string) => c.trim());
          if (filteredComments.length > 0) {
            setComments(filteredComments);
          }
        }
      }
    );
  };

  const handleNumberInputFocus = selectNumberInputOnFocus;

  const handleCountryChange = (value: string) => {
    form.setFieldValue('country', value);
    const code = getCountryCode(value);
    if (code) {
      form.setFieldValue('countryCode', code);
    }
  };

  const handleGradeChange = (value: string | null) => {
    if (value) {
      form.setFieldValue('grade', value as PmgGrade);
      // Automatically set EPQ for grades 65-70
      const highGrades = ['65', '66', '67', '68', '69', '70'];
      form.setFieldValue('isEpq', highGrades.includes(value));
    }
  };

  // Form submission hook
  const { handleSubmit } = useBanknoteFormSubmission({
    form,
    isEditing,
    onSubmit,
    getFilesForSubmission: imageHandlers.getFilesForSubmission,
    getCommentsString,
    clearImages: imageHandlers.clearImages,
    resetComments,
    setSubmitting,
    setLoading,
  });

  const isProcessing = imageHandlers.fetchingImages || extractingData || submitting;

  return (
    <Paper p="lg" radius="md" withBorder>
      <Group justify="space-between" mb="lg">
        <Group gap="md">
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={onCancel}
            title="Back to gallery"
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={3}>{isEditing ? 'Edit Banknote' : 'Add Banknote'}</Title>
        </Group>
      </Group>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <CollapsibleSectionHeader
            title="Images"
            isOpen={sectionsOpen.images}
            onToggle={() => toggleSection('images')}
          />
          <Collapse in={sectionsOpen.images}>
            <ImagesSection
              pmgCert={form.values.pmgCert}
              grade={form.values.grade}
              fetchingImages={imageHandlers.fetchingImages}
              extractingData={extractingData}
              hasPmgImages={imageHandlers.hasPmgImages}
              obverseState={imageHandlers.obverseState}
              reverseState={imageHandlers.reverseState}
              adjustingObverse={imageHandlers.adjustingObverse}
              adjustingReverse={imageHandlers.adjustingReverse}
              isProcessing={isProcessing}
              obverseFile={imageHandlers.obverseFile}
              reverseFile={imageHandlers.reverseFile}
              onPmgCertChange={(value) => form.setFieldValue('pmgCert', value)}
              onGradeChange={handleGradeChange}
              onFetchImages={() => imageHandlers.fetchPMGImages(form.values.pmgCert, form.values.grade)}
              onExtractData={extractDataFromImages}
              onClearImages={imageHandlers.clearImages}
              onObverseUrlChange={imageHandlers.handleObverseUrlChange}
              onReverseUrlChange={imageHandlers.handleReverseUrlChange}
              onObverseUrlBlur={imageHandlers.handleObverseUrlBlur}
              onReverseUrlBlur={imageHandlers.handleReverseUrlBlur}
              obverseUrlError={imageHandlers.obverseUrlError}
              reverseUrlError={imageHandlers.reverseUrlError}
              loadingObverseUrl={imageHandlers.loadingObverseUrl}
              loadingReverseUrl={imageHandlers.loadingReverseUrl}
              onObverseFileUpload={imageHandlers.handleObverseFileUpload}
              onReverseFileUpload={imageHandlers.handleReverseFileUpload}
              onClearObverseFile={imageHandlers.handleClearObverseFile}
              onClearReverseFile={imageHandlers.handleClearReverseFile}
              onAdjustmentChange={imageHandlers.handleAdjustmentChange}
              onAutoAdjust={imageHandlers.handleAutoAdjust}
              onResetAdjustments={imageHandlers.handleResetAdjustments}
              onCrop={imageHandlers.handleCrop}
            />
          </Collapse>

          <CollapsibleSectionHeader
            title="Details"
            isOpen={sectionsOpen.details}
            onToggle={() => toggleSection('details')}
          />
          <Collapse in={sectionsOpen.details}>
            <Stack gap="md">
              <OriginSection
                form={form}
                isProcessing={isProcessing}
                onCountryChange={handleCountryChange}
                onNoteTypeChange={handleNoteTypeChange}
              />
              <Divider />
              <DenominationSection
                form={form}
                isProcessing={isProcessing}
                onNumberInputFocus={handleNumberInputFocus}
                onGradeChange={handleGradeChange}
              />
              <Divider />
              <YearSection
                form={form}
                isProcessing={isProcessing}
                onNumberInputFocus={handleNumberInputFocus}
              />
              <Divider />
              <PmgSection
                form={form}
                pmgComments={pmgComments}
                isProcessing={isProcessing}
                onAddComment={handleAddComment}
                onRemoveComment={handleRemoveComment}
                onCommentChange={handleCommentChange}
              />
              <Divider />
              <DetailsSection
                form={form}
                isProcessing={isProcessing}
              />
              <Divider />
              <PurchaseSection
                form={form}
                banknote={banknote}
                isProcessing={isProcessing}
                onNumberInputFocus={handleNumberInputFocus}
              />
              <Divider />
              <DisplaySettingsSection
                form={form}
                isProcessing={isProcessing}
                currentFeaturedCount={currentFeaturedCount}
                isEditing={isEditing}
              />
            </Stack>
          </Collapse>

          {/* Actions */}
          <Group justify="flex-end" mt="lg">
            <Button variant="default" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isEditing ? 'Save Changes' : 'Add Banknote'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
