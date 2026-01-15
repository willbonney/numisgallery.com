import { useState, useRef, useCallback } from 'react';
import { Box, Text, Button, Group } from '@mantine/core';
import { IconUpload, IconX } from '@tabler/icons-react';
import classes from './FileUpload.module.css';

type FileUploadProps = {
  label: string;
  accept?: string;
  disabled?: boolean;
  onFileSelect: (file: File) => void;
  currentFile?: File | null;
  onClear?: () => void;
};

export function FileUpload({
  label,
  accept = 'image/*',
  disabled = false,
  onFileSelect,
  currentFile,
  onClear,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      onFileSelect(file);
    } else {
      alert('Please select an image file');
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onClear]);

  return (
    <Box>
      <Text size="sm" fw={500} mb="xs">
        {label}
      </Text>
      <Box
        className={`${classes.dropzone} ${isDragging ? classes.dragging : ''} ${disabled ? classes.disabled : ''}`}
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
          style={{ display: 'none' }}
        />
        {currentFile ? (
          <Group justify="space-between" style={{ width: '100%' }}>
            <Text size="sm" c="dimmed" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
              Click to upload or drag and drop
            </Text>
          </Group>
        )}
      </Box>
    </Box>
  );
}




