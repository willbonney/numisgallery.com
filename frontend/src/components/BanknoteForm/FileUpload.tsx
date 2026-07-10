import { Box, Text, Button, Group } from "@mantine/core";
import { IconUpload, IconX } from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";
import classes from "./FileUpload.module.css";

/** Allowed image MIME types (must match PocketBase file field mimeTypes) */
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** Match PocketBase file field maxSize (10 MB) */
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

const ACCEPT_DEFAULT = ALLOWED_IMAGE_MIME_TYPES.join(",");

type FileUploadProps = {
  label: string;
  accept?: string;
  disabled?: boolean;
  maxBytes?: number;
  onFileSelect: (file: File) => void;
  currentFile?: File | null;
  onClear?: () => void;
};

function isAllowedImageType(file: File): boolean {
  if (
    (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)
  ) {
    return true;
  }
  // Some browsers leave type empty; fall back to extension
  const name = file.name.toLowerCase();
  return /\.(jpe?g|png|webp|gif)$/.test(name);
}

export function FileUpload({
  label,
  accept = ACCEPT_DEFAULT,
  disabled = false,
  maxBytes = MAX_IMAGE_UPLOAD_BYTES,
  onFileSelect,
  currentFile,
  onClear,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!isAllowedImageType(file)) {
        alert("Please select a JPEG, PNG, WebP, or GIF image.");
        return;
      }
      if (file.size > maxBytes) {
        const mb = (maxBytes / (1024 * 1024)).toFixed(0);
        alert(`Image is too large. Maximum size is ${mb} MB.`);
        return;
      }
      onFileSelect(file);
    },
    [maxBytes, onFileSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClear) {
        onClear();
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onClear]
  );

  return (
    <Box>
      <Text size="sm" fw={500} mb="xs">
        {label}
      </Text>
      <Box
        className={`${classes.dropzone} ${isDragging ? classes.dragging : ""} ${disabled ? classes.disabled : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          disabled={disabled}
          style={{ display: "none" }}
        />
        {currentFile ? (
          <Group justify="space-between" style={{ width: "100%" }}>
            <Text
              size="sm"
              c="dimmed"
              style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {currentFile.name}
            </Text>
            {onClear && (
              <Button
                size="xs"
                variant="subtle"
                color="red"
                leftSection={<IconX size={14} />}
                onClick={handleClear}
                disabled={disabled}
              >
                Clear
              </Button>
            )}
          </Group>
        ) : (
          <Group gap="xs" justify="center">
            <IconUpload size={20} />
            <Text size="sm" c="dimmed">
              JPEG, PNG, WebP, or GIF (max{" "}
              {(maxBytes / (1024 * 1024)).toFixed(0)} MB)
            </Text>
          </Group>
        )}
      </Box>
    </Box>
  );
}
