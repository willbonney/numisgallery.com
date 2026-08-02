import {
  ActionIcon,
  Button,
  Collapse,
  Divider,
  Group,
  Paper,
  Stack,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconArrowLeft } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useLoading } from "../contexts/LoadingContext";
import { getCountryCode } from "../data/countries";
import { useAuth } from "../hooks/useAuth";
import { useBanknoteImages } from "../hooks/useBanknoteImages";
import { usePmgComments } from "../hooks/usePmgComments";
import type {
  Banknote,
  BanknoteFormData,
  BanknoteSubmitFiles,
  PmgGrade,
} from "../types/banknote";
import { PMG_GRADES } from "../types/banknote";
import {
  extractDataFromImages as extractDataFromImagesHelper,
  importFromNumista as importFromNumistaHelper,
  imageSourceToFile,
  numistaDataUrlOrNull,
  selectNumberInputOnFocus,
  type NumistaImportResult,
} from "./BanknoteForm/BanknoteForm.helpers";
import { AdditionalDetailsSection } from "./BanknoteForm/AdditionalDetailsSection";
import { DenominationSection } from "./BanknoteForm/DenominationSection";
import { DetailsSection } from "./BanknoteForm/DetailsSection";
import { DisplaySettingsSection } from "./BanknoteForm/DisplaySettingsSection";
import { ImagesSection } from "./BanknoteForm/ImagesSection";
import { NumistaImportSection } from "./BanknoteForm/NumistaImportSection";
import { OriginSection } from "./BanknoteForm/OriginSection";
import { PmgSection } from "./BanknoteForm/PmgSection";
import { PurchaseSection } from "./BanknoteForm/PurchaseSection";
import { useBanknoteFormSubmission } from "./BanknoteForm/useBanknoteFormSubmission";
import { YearSection } from "./BanknoteForm/YearSection";
import { CollapsibleSectionHeader } from "./CollapsibleSectionHeader";

interface BanknoteFormProps {
  banknote?: Banknote;
  onSubmit: (data: BanknoteFormData & BanknoteSubmitFiles) => Promise<void>;
  onCancel: () => void;
  currentFeaturedCount?: number;
}

export function BanknoteForm({
  banknote,
  onSubmit,
  onCancel,
  currentFeaturedCount = 0,
}: BanknoteFormProps) {
  const { user } = useAuth();
  const { setLoading } = useLoading();
  const isEditing = !!banknote;

  const loadSectionsState = () => {
    const defaults = {
      images: true,
      details: true,
      additionalDetails: false,
    };

    const saved = localStorage.getItem("banknoteFormSectionsOpen");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaults,
          ...parsed,
          details: true,
          // Keep additionalDetails collapsed by default unless user opened it
          additionalDetails: parsed.additionalDetails === true,
        };
      } catch {
        // ignore
      }
    }
    return defaults;
  };

  const [sectionsOpen, setSectionsOpen] = useState(loadSectionsState);

  useEffect(() => {
    localStorage.setItem(
      "banknoteFormSectionsOpen",
      JSON.stringify(sectionsOpen)
    );
  }, [sectionsOpen]);

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev: typeof sectionsOpen) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const imageHandlers = useBanknoteImages({ banknote, isEditing, user });

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
  const [numistaUrl, setNumistaUrl] = useState(
    banknote?.numistaId ? `https://en.numista.com/${banknote.numistaId}` : ""
  );
  const [importingNumista, setImportingNumista] = useState(false);

  // Watermark image (file field separate from watermark text)
  const [waterMarkFile, setWaterMarkFile] = useState<File | null>(null);
  const [waterMarkPreviewUrl, setWaterMarkPreviewUrl] = useState<string | null>(
    null
  );

  // Signature scan files aligned with form.values.signatures indices
  const [signatureFiles, setSignatureFiles] = useState<(File | null)[]>(() =>
    (banknote?.signatures || []).map(() => null)
  );
  const [signaturePreviewUrls, setSignaturePreviewUrls] = useState<
    (string | null)[]
  >(() => (banknote?.signatures || []).map(() => null));

  const form = useForm<BanknoteFormData>({
    initialValues: {
      noteType: banknote?.noteType || "world",
      country: banknote?.country || "",
      countryCode: banknote?.countryCode || "",
      authority: banknote?.authority || "",
      city: banknote?.city || "",
      pickNumber: banknote?.pickNumber || "",
      faceValue: banknote?.faceValue || 0,
      currency: banknote?.currency || "",
      yearOfIssueSingle: banknote?.yearOfIssueSingle,
      isRangeOfYearOfIssue: banknote?.isRangeOfYearOfIssue || false,
      yearOfIssueStart: banknote?.yearOfIssueStart,
      yearOfIssueEnd: banknote?.yearOfIssueEnd,
      pmgCert: banknote?.pmgCert || "",
      grade: banknote?.grade || "65",
      pmgComments: "",
      isEpq: banknote?.isEpq ?? false,
      isSpecimen: banknote?.isSpecimen || false,
      serialNumber: banknote?.serialNumber || "",
      watermark: banknote?.watermark || "",
      watermarkDescription: banknote?.watermarkDescription || "",
      numistaId: banknote?.numistaId || "",
      composition: banknote?.composition,
      obvDescription: banknote?.obvDescription || "",
      revDescription: banknote?.revDescription || "",
      obvEngraver: banknote?.obvEngraver || "",
      obvDesigner: banknote?.obvDesigner || "",
      revEngraver: banknote?.revEngraver || "",
      revDesigner: banknote?.revDesigner || "",
      printer: banknote?.printer || null,
      numIssued: banknote?.numIssued,
      inCirculation: banknote?.inCirculation,
      signatures: banknote?.signatures || [],
      purchasePriceCurrency: banknote?.purchasePriceCurrency || "USD",
      purchasePrice: banknote?.purchasePrice || 0,
      dateOfPurchase: banknote?.dateOfPurchase || "",
      isVisibleInCollection: banknote?.isVisibleInCollection ?? true,
      isFeatured: banknote?.isFeatured || false,
    },
  });

  const handleNoteTypeChange = (value: "world" | "us") => {
    form.setFieldValue("noteType", value);
    if (value === "us") {
      form.setFieldValue("currency", "USD");
      form.setFieldValue("currencyCode", "USD");
      form.setFieldValue("countryCode", "us");
    } else {
      if (form.values.currency === "USD" && form.values.country === "") {
        form.setFieldValue("currency", "");
      }
    }
  };

  const applyNumistaImport = async (data: NumistaImportResult) => {
    if (data.noteType) {
      handleNoteTypeChange(data.noteType);
    }

    if (data.numistaId) {
      form.setFieldValue("numistaId", data.numistaId);
      setNumistaUrl(`https://en.numista.com/${data.numistaId}`);
    }

    if (data.noteType === "us" || data.countryCode === "us") {
      if (data.country) form.setFieldValue("country", data.country);
      if (data.authority) form.setFieldValue("authority", data.authority);
      if (data.city) form.setFieldValue("city", data.city);
      form.setFieldValue("countryCode", "us");
    } else {
      if (data.country) {
        form.setFieldValue("country", data.country);
        const code = data.countryCode || getCountryCode(data.country);
        if (code) form.setFieldValue("countryCode", code);
      }
      if (data.authority) form.setFieldValue("authority", data.authority);
    }

    if (data.pickNumber) form.setFieldValue("pickNumber", data.pickNumber);
    if (data.faceValue != null) form.setFieldValue("faceValue", data.faceValue);
    if (data.currency) form.setFieldValue("currency", data.currency);

    if (data.isRangeOfYearOfIssue) {
      form.setFieldValue("isRangeOfYearOfIssue", true);
      if (data.yearOfIssueStart != null) {
        form.setFieldValue("yearOfIssueStart", data.yearOfIssueStart);
      }
      if (data.yearOfIssueEnd != null) {
        form.setFieldValue("yearOfIssueEnd", data.yearOfIssueEnd);
      }
    } else if (data.yearOfIssueSingle != null) {
      form.setFieldValue("isRangeOfYearOfIssue", false);
      form.setFieldValue("yearOfIssueSingle", data.yearOfIssueSingle);
    }

    // Numista Watermark <p> text → description (+ short field for Details)
    const wmText = data.watermarkDescription || data.watermark;
    if (wmText) {
      form.setFieldValue("watermarkDescription", wmText);
      form.setFieldValue("watermark", wmText);
    }

    // Only use scraper-downloaded data URLs (browser cannot fetch Numista CDN)
    const waterMarkData = numistaDataUrlOrNull(
      data.waterMarkImageDataUrl,
      data.waterMarkImageUrl
    );
    if (waterMarkData) {
      try {
        const file = await imageSourceToFile(
          waterMarkData,
          "watermark-numista.jpg"
        );
        setWaterMarkFile(file);
        setWaterMarkPreviewUrl(URL.createObjectURL(file));
      } catch (err) {
        console.warn("Failed to load watermark image:", err);
      }
    }

    if (data.composition) form.setFieldValue("composition", data.composition);
    if (data.obvDescription)
      form.setFieldValue("obvDescription", data.obvDescription);
    if (data.revDescription)
      form.setFieldValue("revDescription", data.revDescription);
    if (data.obvEngraver) form.setFieldValue("obvEngraver", data.obvEngraver);
    if (data.obvDesigner) form.setFieldValue("obvDesigner", data.obvDesigner);
    if (data.revEngraver) form.setFieldValue("revEngraver", data.revEngraver);
    if (data.revDesigner) form.setFieldValue("revDesigner", data.revDesigner);
    if (data.printer) form.setFieldValue("printer", data.printer);
    if (data.numIssued != null) form.setFieldValue("numIssued", data.numIssued);
    if (data.inCirculation !== undefined) {
      form.setFieldValue("inCirculation", data.inCirculation);
    }

    if (data.signatures && data.signatures.length > 0) {
      form.setFieldValue(
        "signatures",
        data.signatures.map((s) => ({
          name: s.name || "",
          title: s.title,
          signatureScan: s.signatureScan || "",
          signatureScanUrl: s.signatureScanUrl,
        }))
      );
      setSignatureFiles(data.signatures.map(() => null));
      setSignaturePreviewUrls(
        data.signatures.map((s) =>
          numistaDataUrlOrNull(s.signatureScanDataUrl, s.signatureScanUrl)
        )
      );

      for (let i = 0; i < data.signatures.length; i++) {
        const source = numistaDataUrlOrNull(
          data.signatures[i].signatureScanDataUrl,
          data.signatures[i].signatureScanUrl
        );
        if (!source) continue;
        try {
          const file = await imageSourceToFile(
            source,
            `signature-${i + 1}.jpg`
          );
          setSignatureFiles((prev) => {
            const next = [...prev];
            next[i] = file;
            return next;
          });
          setSignaturePreviewUrls((prev) => {
            const next = [...prev];
            next[i] = URL.createObjectURL(file);
            return next;
          });
        } catch (err) {
          console.warn("Failed to load signature image:", err);
        }
      }
    }

    // Expand Additional Details after a successful import
    setSectionsOpen((prev: typeof sectionsOpen) => ({
      ...prev,
      additionalDetails: true,
      images: true,
    }));

    // Catalog photos — server must have already downloaded them as data URLs
    const obverseData = numistaDataUrlOrNull(
      data.obverseImageDataUrl,
      data.obverseImageUrl
    );
    const reverseData = numistaDataUrlOrNull(
      data.reverseImageDataUrl,
      data.reverseImageUrl
    );

    if (obverseData || reverseData) {
      setLoading(true, "Loading catalog photos from Numista...");
      try {
        if (obverseData) {
          const file = await imageSourceToFile(
            obverseData,
            "obverse-numista.jpg"
          );
          await imageHandlers.handleObverseFileUpload(file);
        }
        if (reverseData) {
          const file = await imageSourceToFile(
            reverseData,
            "reverse-numista.jpg"
          );
          await imageHandlers.handleReverseFileUpload(file);
        }
      } catch (err) {
        console.error("Failed to load Numista photos:", err);
        const { notifications } = await import("@mantine/notifications");
        notifications.show({
          title: "Photos not loaded",
          message:
            err instanceof Error
              ? err.message
              : "Could not attach Numista catalog photos. Try uploading manually.",
          color: "yellow",
        });
      }
    } else if (data.obverseImageUrl || data.reverseImageUrl) {
      const { notifications } = await import("@mantine/notifications");
      notifications.show({
        title: "Catalog photos unavailable",
        message:
          "Numista blocked image download. You can still save details and upload photos manually.",
        color: "yellow",
        autoClose: 8000,
      });
    }
  };

  const handleNumistaImport = () => {
    void importFromNumistaHelper(
      numistaUrl,
      setImportingNumista,
      setLoading,
      applyNumistaImport
    );
  };

  const extractDataFromImages = () => {
    extractDataFromImagesHelper(
      imageHandlers.obverseState.originalUrl,
      imageHandlers.reverseState.originalUrl,
      setExtractingData,
      (data) => {
        if (data.noteType) {
          handleNoteTypeChange(data.noteType);
        }

        if (data.noteType === "world" && data.country) {
          form.setFieldValue("country", data.country);
          const code = getCountryCode(data.country);
          if (code) {
            form.setFieldValue("countryCode", code);
          }
          if (data.authority) {
            form.setFieldValue("authority", data.authority);
          }
        } else if (data.noteType === "us") {
          if (data.country) {
            form.setFieldValue("country", data.country);
          }
          if (data.authority) {
            form.setFieldValue("authority", data.authority);
          }
          if (data.city) {
            form.setFieldValue("city", data.city);
          }
        }
        if (data.grade && PMG_GRADES.includes(data.grade as PmgGrade)) {
          handleGradeChange(data.grade);
        } else if (data.isEpq !== undefined) {
          form.setFieldValue("isEpq", data.isEpq);
        }
        if (data.isSpecimen !== undefined)
          form.setFieldValue("isSpecimen", data.isSpecimen);
        if (data.pickNumber) form.setFieldValue("pickNumber", data.pickNumber);

        if (data.yearOfIssue) {
          const yearMatch = data.yearOfIssue.match(/(\d{4})-(\d{4})/);
          if (yearMatch) {
            form.setFieldValue("isRangeOfYearOfIssue", true);
            form.setFieldValue("yearOfIssueStart", parseInt(yearMatch[1]));
            form.setFieldValue("yearOfIssueEnd", parseInt(yearMatch[2]));
          } else {
            form.setFieldValue("isRangeOfYearOfIssue", false);
            form.setFieldValue("yearOfIssueSingle", parseInt(data.yearOfIssue));
          }
        }

        if (data.faceValue) form.setFieldValue("faceValue", data.faceValue);
        if (data.currency) form.setFieldValue("currency", data.currency);
        if (data.serialNumber) {
          form.setFieldValue("serialNumber", data.serialNumber);
          if (data.serialNumber.trim()) {
            form.setFieldValue("isSpecimen", false);
          }
        }
        if (data.watermark) form.setFieldValue("watermark", data.watermark);

        if (data.pmgComments && data.pmgComments.length > 0) {
          const filteredComments = data.pmgComments.filter((c: string) =>
            c.trim()
          );
          if (filteredComments.length > 0) {
            setComments(filteredComments);
          }
        }
      }
    );
  };

  const handleNumberInputFocus = selectNumberInputOnFocus;

  const handleCountryChange = (value: string) => {
    form.setFieldValue("country", value);
    const code = getCountryCode(value);
    if (code) {
      form.setFieldValue("countryCode", code);
    }
  };

  const handleGradeChange = (value: string | null) => {
    if (value) {
      form.setFieldValue("grade", value as PmgGrade);
      // EPQ is not auto-checked — user opts in manually
    }
  };

  const handleWaterMarkUpload = (file: File) => {
    setWaterMarkFile(file);
    setWaterMarkPreviewUrl(URL.createObjectURL(file));
  };

  const handleWaterMarkClear = () => {
    setWaterMarkFile(null);
    setWaterMarkPreviewUrl(null);
  };

  const handleAddSignature = () => {
    const next = [
      ...(form.values.signatures || []),
      { name: "", title: "", signatureScan: "" },
    ];
    form.setFieldValue("signatures", next);
    setSignatureFiles((prev) => [...prev, null]);
    setSignaturePreviewUrls((prev) => [...prev, null]);
  };

  const handleRemoveSignature = (index: number) => {
    form.setFieldValue(
      "signatures",
      (form.values.signatures || []).filter((_, i) => i !== index)
    );
    setSignatureFiles((prev) => prev.filter((_, i) => i !== index));
    setSignaturePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSignatureFileUpload = (index: number, file: File) => {
    setSignatureFiles((prev) => {
      const next = [...prev];
      while (next.length <= index) next.push(null);
      next[index] = file;
      return next;
    });
    setSignaturePreviewUrls((prev) => {
      const next = [...prev];
      while (next.length <= index) next.push(null);
      next[index] = URL.createObjectURL(file);
      return next;
    });
  };

  const handleSignatureFileClear = (index: number) => {
    setSignatureFiles((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setSignaturePreviewUrls((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    const sigs = [...(form.values.signatures || [])];
    if (sigs[index]) {
      sigs[index] = {
        ...sigs[index],
        signatureScan: "",
        signatureScanUrl: undefined,
      };
      form.setFieldValue("signatures", sigs);
    }
  };

  const getFilesForSubmission = () => {
    const base = imageHandlers.getFilesForSubmission();
    const signatureScanFiles = signatureFiles.filter(
      (f): f is File => f instanceof File
    );
    return {
      ...base,
      waterMarkFileToUpload: waterMarkFile || undefined,
      signatureScanFiles:
        signatureScanFiles.length > 0 ? signatureScanFiles : undefined,
    };
  };

  const resetExtra = () => {
    setNumistaUrl("");
    setWaterMarkFile(null);
    setWaterMarkPreviewUrl(null);
    setSignatureFiles([]);
    setSignaturePreviewUrls([]);
    setSectionsOpen((prev: typeof sectionsOpen) => ({
      ...prev,
      additionalDetails: false,
    }));
  };

  const { handleSubmit } = useBanknoteFormSubmission({
    form,
    isEditing,
    onSubmit,
    getFilesForSubmission,
    getCommentsString,
    clearImages: imageHandlers.clearImages,
    resetComments,
    onResetExtra: resetExtra,
    setSubmitting,
    setLoading,
  });

  const isProcessing =
    imageHandlers.fetchingImages ||
    extractingData ||
    importingNumista ||
    submitting;

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
          <Title order={3}>
            {isEditing ? "Edit Banknote" : "Add Banknote"}
          </Title>
        </Group>
      </Group>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <CollapsibleSectionHeader
            title="Images"
            isOpen={sectionsOpen.images}
            onToggle={() => toggleSection("images")}
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
              onPmgCertChange={(value) => form.setFieldValue("pmgCert", value)}
              onGradeChange={handleGradeChange}
              onFetchImages={() =>
                imageHandlers.fetchPMGImages(
                  form.values.pmgCert,
                  form.values.grade
                )
              }
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
            onToggle={() => toggleSection("details")}
          />
          <Collapse in={sectionsOpen.details}>
            <Stack gap="md">
              <NumistaImportSection
                url={numistaUrl}
                isProcessing={isProcessing}
                isImporting={importingNumista}
                onUrlChange={setNumistaUrl}
                onImport={handleNumistaImport}
              />
              <Divider />
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
              <DetailsSection form={form} isProcessing={isProcessing} />
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

          <CollapsibleSectionHeader
            title="Additional Details"
            isOpen={sectionsOpen.additionalDetails}
            onToggle={() => toggleSection("additionalDetails")}
          />
          <Collapse in={sectionsOpen.additionalDetails}>
            <AdditionalDetailsSection
              form={form}
              isProcessing={isProcessing}
              banknote={banknote}
              waterMarkFile={waterMarkFile}
              waterMarkPreviewUrl={waterMarkPreviewUrl}
              onWaterMarkUpload={handleWaterMarkUpload}
              onWaterMarkClear={handleWaterMarkClear}
              signatureFiles={signatureFiles}
              signaturePreviewUrls={signaturePreviewUrls}
              onSignatureFileUpload={handleSignatureFileUpload}
              onSignatureFileClear={handleSignatureFileClear}
              onAddSignature={handleAddSignature}
              onRemoveSignature={handleRemoveSignature}
              onNumberInputFocus={handleNumberInputFocus}
            />
          </Collapse>

          <Group justify="flex-end" mt="lg">
            <Button
              variant="default"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing} loading={submitting}>
              {isEditing ? "Save Changes" : "Add Banknote"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
