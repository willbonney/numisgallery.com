import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Group,
  Image,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { IconPlus, IconTrash, IconUpload, IconX } from "@tabler/icons-react";
import type { FocusEvent } from "react";
import { useRef } from "react";
import type {
  Banknote,
  BanknoteFormData,
  BanknoteSignature,
} from "../../types/banknote";
import { COMPOSITIONS } from "../../types/banknote";
import { getImageUrl } from "../../utils/fileHelpers";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
} from "./FileUpload";

type AdditionalDetailsSectionProps = {
  form: UseFormReturnType<BanknoteFormData>;
  isProcessing: boolean;
  banknote?: Banknote;
  waterMarkFile: File | null;
  waterMarkPreviewUrl: string | null;
  onWaterMarkUpload: (file: File) => void;
  onWaterMarkClear: () => void;
  signatureFiles: (File | null)[];
  signaturePreviewUrls: (string | null)[];
  onSignatureFileUpload: (index: number, file: File) => void;
  onSignatureFileClear: (index: number) => void;
  onAddSignature: () => void;
  onRemoveSignature: (index: number) => void;
  onNumberInputFocus?: (e: FocusEvent<HTMLInputElement>) => void;
};

/** Compact image with a small clear (×) control in the top-right corner. */
function ClearableImage({
  src,
  alt,
  disabled,
  onClear,
  maxWidth = 160,
  maxHeight = 100,
}: {
  src: string;
  alt: string;
  disabled?: boolean;
  onClear: () => void;
  maxWidth?: number;
  maxHeight?: number;
}) {
  return (
    <Box
      style={{
        position: "relative",
        display: "inline-block",
        lineHeight: 0,
        borderRadius: 8,
        // Room for the × so it sits in padding, not over the photo
        padding: 10,
        paddingTop: 12,
        paddingRight: 12,
        border: "1px solid var(--mantine-color-default-border)",
        background:
          "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
      }}
    >
      <Image
        src={src}
        alt={alt}
        maw={maxWidth}
        mah={maxHeight}
        w="auto"
        fit="contain"
        style={{ display: "block", borderRadius: 4 }}
      />
      <ActionIcon
        size="sm"
        variant="filled"
        color="dark"
        radius="xl"
        disabled={disabled}
        onClick={onClear}
        title="Remove image"
        aria-label="Remove image"
        style={{
          position: "absolute",
          top: 2,
          right: 2,
          backgroundColor: "rgba(0, 0, 0, 0.35)",
        }}
      >
        <IconX size={12} />
      </ActionIcon>
    </Box>
  );
}

function CompactImageUpload({
  label,
  disabled,
  onFileSelect,
}: {
  label: string;
  disabled?: boolean;
  onFileSelect: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
        disabled={disabled}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
            alert("Image is too large. Maximum size is 10 MB.");
            return;
          }
          onFileSelect(file);
          e.target.value = "";
        }}
      />
      <Button
        size="xs"
        variant="light"
        leftSection={<IconUpload size={14} />}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}

export function AdditionalDetailsSection({
  form,
  isProcessing,
  banknote,
  waterMarkPreviewUrl,
  onWaterMarkUpload,
  onWaterMarkClear,
  signaturePreviewUrls,
  onSignatureFileUpload,
  onSignatureFileClear,
  onAddSignature,
  onRemoveSignature,
  onNumberInputFocus,
}: AdditionalDetailsSectionProps) {
  const signatures = form.values.signatures || [];
  const printer = form.values.printer || {
    authority: "",
    city: "",
    country: "",
  };

  const existingWaterMarkUrl =
    !waterMarkPreviewUrl &&
    banknote?.waterMarkImage &&
    banknote.id &&
    banknote.collectionId
      ? getImageUrl(
          {
            id: banknote.id,
            collectionId: banknote.collectionId,
            collectionName: banknote.collectionName,
          },
          banknote.waterMarkImage,
          "500x0"
        )
      : null;

  const waterMarkSrc = waterMarkPreviewUrl || existingWaterMarkUrl;

  const existingSignatureUrl = (sig: BanknoteSignature, index: number) => {
    if (signaturePreviewUrls[index]) return signaturePreviewUrls[index];
    if (sig.signatureScanUrl) return sig.signatureScanUrl;
    if (
      sig.signatureScan &&
      banknote?.id &&
      banknote.collectionId &&
      banknote.signatureScans?.includes(sig.signatureScan)
    ) {
      return getImageUrl(
        {
          id: banknote.id,
          collectionId: banknote.collectionId,
          collectionName: banknote.collectionName,
        },
        sig.signatureScan,
        "200x0"
      );
    }
    const byIndex = banknote?.signatureScans?.[index];
    if (byIndex && banknote?.id && banknote.collectionId) {
      return getImageUrl(
        {
          id: banknote.id,
          collectionId: banknote.collectionId,
          collectionName: banknote.collectionName,
        },
        byIndex,
        "200x0"
      );
    }
    return null;
  };

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Textarea
          label="Obverse description"
          placeholder="Description of the front of the note..."
          minRows={4}
          autosize
          maxRows={10}
          disabled={isProcessing}
          {...form.getInputProps("obvDescription")}
        />
        <Textarea
          label="Reverse description"
          placeholder="Description of the back of the note..."
          minRows={4}
          autosize
          maxRows={10}
          disabled={isProcessing}
          {...form.getInputProps("revDescription")}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label="Obverse engraver"
          placeholder="Engraver name"
          disabled={isProcessing}
          {...form.getInputProps("obvEngraver")}
        />
        <TextInput
          label="Obverse designer"
          placeholder="Designer name"
          disabled={isProcessing}
          {...form.getInputProps("obvDesigner")}
        />
        <TextInput
          label="Reverse engraver"
          placeholder="Engraver name"
          disabled={isProcessing}
          {...form.getInputProps("revEngraver")}
        />
        <TextInput
          label="Reverse designer"
          placeholder="Designer name"
          disabled={isProcessing}
          {...form.getInputProps("revDesigner")}
        />
      </SimpleGrid>

      <Paper withBorder p="md" radius="md">
        <Text size="sm" fw={600} mb="sm">
          Printer
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <TextInput
            label="Authority"
            placeholder="e.g. Banque de France"
            disabled={isProcessing}
            value={printer.authority || ""}
            onChange={(e) =>
              form.setFieldValue("printer", {
                ...printer,
                authority: e.currentTarget.value,
              })
            }
          />
          <TextInput
            label="City"
            placeholder="e.g. Paris"
            disabled={isProcessing}
            value={printer.city || ""}
            onChange={(e) =>
              form.setFieldValue("printer", {
                ...printer,
                city: e.currentTarget.value,
              })
            }
          />
          <TextInput
            label="Country"
            placeholder="e.g. France"
            disabled={isProcessing}
            value={printer.country || ""}
            onChange={(e) =>
              form.setFieldValue("printer", {
                ...printer,
                country: e.currentTarget.value,
              })
            }
          />
        </SimpleGrid>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Select
          label="Composition"
          placeholder="Select material"
          clearable
          data={COMPOSITIONS.map((c) => ({ value: c, label: c }))}
          disabled={isProcessing}
          value={form.values.composition || null}
          onChange={(value) =>
            form.setFieldValue(
              "composition",
              (value as BanknoteFormData["composition"]) || undefined
            )
          }
        />
        <NumberInput
          label="Number issued"
          placeholder="e.g. 900000"
          min={0}
          disabled={isProcessing}
          thousandSeparator=","
          onFocus={onNumberInputFocus}
          value={form.values.numIssued ?? ""}
          onChange={(value) =>
            form.setFieldValue(
              "numIssued",
              typeof value === "number" ? value : undefined
            )
          }
        />
        <TextInput
          label="Numista ID"
          placeholder="e.g. 278009"
          disabled={isProcessing}
          {...form.getInputProps("numistaId")}
        />
      </SimpleGrid>

      <Group>
        <Checkbox
          label="In circulation"
          description="Unchecked if the note is demonetized"
          disabled={isProcessing}
          checked={!!form.values.inCirculation}
          onChange={(e) =>
            form.setFieldValue("inCirculation", e.currentTarget.checked)
          }
        />
      </Group>

      <Paper withBorder p="md" radius="md">
        <Text size="sm" fw={600} mb="xs">
          Watermark
        </Text>
        <Text size="xs" c="dimmed" mb="sm">
          Description from the catalog and optional watermark photo.
        </Text>
        <Group align="center" wrap="nowrap" gap="lg">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Textarea
              label="Watermark description"
              placeholder="e.g. Profile of a Moorish woman in a square medallion"
              minRows={2}
              autosize
              maxRows={6}
              disabled={isProcessing}
              {...form.getInputProps("watermarkDescription")}
            />
          </Box>
          <Box style={{ flexShrink: 0 }}>
            {waterMarkSrc ? (
              <ClearableImage
                src={waterMarkSrc}
                alt="Watermark"
                disabled={isProcessing}
                onClear={onWaterMarkClear}
                maxWidth={200}
                maxHeight={120}
              />
            ) : (
              <CompactImageUpload
                label="Upload image"
                disabled={isProcessing}
                onFileSelect={onWaterMarkUpload}
              />
            )}
          </Box>
        </Group>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="sm">
          <div>
            <Text size="sm" fw={600}>
              Signatures
            </Text>
            <Text size="xs" c="dimmed">
              Signatory names and optional signature scans
            </Text>
          </div>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconPlus size={14} />}
            onClick={onAddSignature}
            disabled={isProcessing}
          >
            Add signature
          </Button>
        </Group>

        <Stack gap="md">
          {signatures.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="md">
              No signatures yet. Import from Numista or add one manually.
            </Text>
          )}
          {signatures.map((sig, index) => {
            const preview = existingSignatureUrl(sig, index);
            return (
              <Paper
                key={index}
                withBorder
                p="sm"
                radius="sm"
                bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))"
              >
                <Group align="center" wrap="nowrap" gap="lg">
                  <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                    <Group
                      justify="space-between"
                      align="flex-start"
                      wrap="nowrap"
                      gap="xs"
                    >
                      <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        <TextInput
                          label="Name"
                          placeholder="Signatory name"
                          disabled={isProcessing}
                          value={sig.name || ""}
                          onChange={(e) => {
                            const next = [...signatures];
                            next[index] = {
                              ...next[index],
                              name: e.currentTarget.value,
                            };
                            form.setFieldValue("signatures", next);
                          }}
                        />
                        <TextInput
                          label="Title / role"
                          placeholder="e.g. General Cashier"
                          disabled={isProcessing}
                          value={sig.title || ""}
                          onChange={(e) => {
                            const next = [...signatures];
                            next[index] = {
                              ...next[index],
                              title: e.currentTarget.value,
                            };
                            form.setFieldValue("signatures", next);
                          }}
                        />
                      </Stack>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        disabled={isProcessing}
                        onClick={() => onRemoveSignature(index)}
                        title="Remove signature"
                        mt={22}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Stack>
                  <Box style={{ flexShrink: 0 }}>
                    {preview ? (
                      <ClearableImage
                        src={preview}
                        alt={sig.name || `Signature ${index + 1}`}
                        disabled={isProcessing}
                        onClear={() => onSignatureFileClear(index)}
                        maxWidth={140}
                        maxHeight={80}
                      />
                    ) : (
                      <CompactImageUpload
                        label="Upload scan"
                        disabled={isProcessing}
                        onFileSelect={(file) =>
                          onSignatureFileUpload(index, file)
                        }
                      />
                    )}
                  </Box>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      </Paper>
    </Stack>
  );
}
