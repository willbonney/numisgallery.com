import { ActionIcon, Box, Button, Card, Group, Image, Loader, Modal, Slider, Stack, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconCrop, IconRefresh, IconRotate2, IconTrash, IconWand, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import type { ImageState } from './BanknoteForm.helpers';

type ImageEditorProps = {
  side: 'obverse' | 'reverse';
  state: ImageState;
  isAdjusting: boolean;
  isProcessing: boolean;
  onAdjustmentChange: (field: 'brightness' | 'contrast', value: number) => void;
  onAutoAdjust: () => void;
  onResetAdjustments: () => void;
  onClear?: () => void;
  onCrop?: (croppedAreaPixels: PixelCrop, rotatedImageSrc: string, displayedWidth: number, displayedHeight: number) => void;
};

// Helper to create a rotated image data URL
function createRotatedPreview(
  sourceImage: HTMLImageElement,
  rotation: number
): string {
  if (rotation === 0) {
    // No rotation needed, return original
    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.naturalWidth;
    canvas.height = sourceImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(sourceImage, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.92);
    }
    return sourceImage.src;
  }

  const rotRad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rotRad));
  const cos = Math.abs(Math.cos(rotRad));
  
  // Calculate the size needed for the rotated image
  const newWidth = sourceImage.naturalWidth * cos + sourceImage.naturalHeight * sin;
  const newHeight = sourceImage.naturalWidth * sin + sourceImage.naturalHeight * cos;
  
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(newWidth);
  canvas.height = Math.round(newHeight);
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceImage.src;
  
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotRad);
  ctx.drawImage(sourceImage, -sourceImage.naturalWidth / 2, -sourceImage.naturalHeight / 2);
  
  return canvas.toDataURL('image/jpeg', 0.92);
}

export function ImageEditor({
  side,
  state,
  isAdjusting,
  isProcessing,
  onAdjustmentChange,
  onAutoAdjust,
  onResetAdjustments,
  onClear,
  onCrop,
}: ImageEditorProps) {
  const displayUrl = state.adjustedDataUrl || state.proxiedDataUrl || state.originalUrl;
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const [rotatedPreview, setRotatedPreview] = useState<string>('');
  const [isRotating, setIsRotating] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const rotationTimeoutRef = useRef<number | null>(null);

  // Determine which image to use for editing
  const imageForEdit = state.adjustedDataUrl || state.proxiedDataUrl;
  const canEdit = imageForEdit && imageForEdit.startsWith('data:');

  // Load source image when modal opens
  useEffect(() => {
    if (editModalOpen && imageForEdit) {
      const img = new window.Image();
      img.onload = () => {
        sourceImageRef.current = img;
        setRotatedPreview(imageForEdit);
      };
      img.src = imageForEdit;
    }
    return () => {
      sourceImageRef.current = null;
    };
  }, [editModalOpen, imageForEdit]);

  // Handle rotation changes with debouncing
  const handleRotationChange = useCallback((newRotation: number) => {
    setRotation(newRotation);
    setIsRotating(true);
    
    // Clear any pending timeout
    if (rotationTimeoutRef.current) {
      clearTimeout(rotationTimeoutRef.current);
    }
    
    // Debounce the actual rotation to avoid lag while sliding
    rotationTimeoutRef.current = setTimeout(() => {
      if (sourceImageRef.current) {
        const preview = createRotatedPreview(sourceImageRef.current, newRotation);
        setRotatedPreview(preview);
        // Reset crop when rotation changes since dimensions change
        setCrop(undefined);
        setCompletedCrop(undefined);
      }
      setIsRotating(false);
    }, 150);
  }, []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (rotationTimeoutRef.current) {
        clearTimeout(rotationTimeoutRef.current);
      }
    };
  }, []);

  const handleOpenEdit = useCallback(() => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    setRotation(0);
    setRotatedPreview('');
    setEditModalOpen(true);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditModalOpen(false);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setRotation(0);
    setRotatedPreview('');
  }, []);

  // Initialize crop when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    // Start with a centered 90% crop
    const initialCrop = centerCrop(
      makeAspectCrop(
        { unit: '%', width: 90 },
        width / height,
        width,
        height
      ),
      width,
      height
    );
    setCrop(initialCrop);
  }, []);

  const handleApply = useCallback(() => {
    if (completedCrop && onCrop && imgRef.current && rotatedPreview) {
      // Pass the rotated preview (rotation already baked in) and displayed dimensions
      const displayedWidth = imgRef.current.width;
      const displayedHeight = imgRef.current.height;
      onCrop(completedCrop, rotatedPreview, displayedWidth, displayedHeight);
    }
    handleCloseEdit();
  }, [completedCrop, rotatedPreview, onCrop, handleCloseEdit]);

  // Allow applying when we have a completed crop
  const canApply = !!completedCrop && completedCrop.width > 0 && completedCrop.height > 0;

  if (!state.originalUrl) return null;

  return (
    <>
      <Card padding="md" radius="md" withBorder style={{ flex: 1 }} pos="relative">
        {/* Header with title and actions */}
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>
            {side === 'obverse' ? 'Obverse (Front)' : 'Reverse (Back)'}
          </Text>
          <Group gap={4}>
            {/* Edit tools - only show when we have a data URL */}
            {canEdit && (
              <Tooltip label="Rotate & crop" position="top" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={handleOpenEdit}
                  disabled={isProcessing || isAdjusting}
                >
                  <IconCrop size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {canEdit && onClear && (
              <Box w={1} h={16} bg="var(--mantine-color-dark-4)" mx={4} />
            )}
            {onClear && (
              <Tooltip label="Remove image" position="top" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={onClear}
                  disabled={isProcessing}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
        
        {/* Image preview */}
        <Box pos="relative" mb="md" style={{ 
          backgroundColor: 'var(--mantine-color-dark-7)',
          borderRadius: 'var(--mantine-radius-sm)',
          padding: '1rem',
          minHeight: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {isAdjusting && (
            <Box pos="absolute" top={10} right={10} style={{ zIndex: 10 }}>
              <Loader size="sm" />
            </Box>
          )}
          <Image
            src={displayUrl}
            alt={side}
            mah={300}
            maw="100%"
            w="auto"
            h="auto"
            fit="contain"
            radius="sm"
            style={{ 
              maxWidth: 'calc(100% - 0.5rem)',
              transition: 'opacity 0.15s ease',
              opacity: isAdjusting ? 0.7 : 1,
            }}
          />
        </Box>

        {/* Adjustment sliders */}
        <Stack gap="xs" mb="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Brightness: {state.adjustments.brightness}</Text>
            <Group gap={4}>
              <Tooltip label="Auto-adjust brightness & contrast" position="top" withArrow>
                <ActionIcon 
                  size="xs" 
                  variant="subtle"
                  disabled={isProcessing}
                  onClick={onAutoAdjust}
                >
                  <IconWand size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Reset all adjustments" position="top" withArrow>
                <ActionIcon 
                  size="xs" 
                  variant="subtle"
                  disabled={isProcessing}
                  onClick={onResetAdjustments}
                >
                  <IconRefresh size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          <Slider
            min={-100}
            max={100}
            disabled={isProcessing}
            value={state.adjustments.brightness}
            onChange={(v) => onAdjustmentChange('brightness', v)}
            marks={[{ value: 0, label: '0' }]}
            size="sm"
          />
          
          <Text size="xs" c="dimmed" mt="xs">Contrast: {state.adjustments.contrast}</Text>
          <Slider
            min={-100}
            max={100}
            disabled={isProcessing}
            value={state.adjustments.contrast}
            onChange={(v) => onAdjustmentChange('contrast', v)}
            marks={[{ value: 0, label: '0' }]}
            size="sm"
          />
        </Stack>
      </Card>

      {/* Rotate & Crop Modal */}
      <Modal
        opened={editModalOpen}
        onClose={handleCloseEdit}
        title={`Edit ${side === 'obverse' ? 'Obverse' : 'Reverse'} Image`}
        size="xl"
        centered
        styles={{
          body: { padding: 0 },
        }}
      >
        <Stack gap={0}>
          {/* Crop area */}
          <Box
            p="md"
            style={{
              backgroundColor: 'var(--mantine-color-dark-8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              maxHeight: '500px',
              overflow: 'auto',
              position: 'relative',
            }}
          >
            {isRotating && (
              <Box
                pos="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                }}
              >
                <Loader size="sm" />
              </Box>
            )}
            {rotatedPreview && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                style={{ maxHeight: '450px' }}
              >
                <img
                  ref={imgRef}
                  src={rotatedPreview}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  style={{
                    maxHeight: '450px',
                    maxWidth: '100%',
                    display: 'block',
                  }}
                />
              </ReactCrop>
            )}
          </Box>

          {/* Controls */}
          <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}>
            <Stack gap="md">
              {/* Rotation slider */}
              <Group gap="sm" align="center">
                <IconRotate2 size={18} style={{ opacity: 0.6, flexShrink: 0 }} />
                <Text size="xs" c="dimmed" w={50}>Rotate</Text>
                <Slider
                  value={rotation}
                  min={-180}
                  max={180}
                  step={1}
                  onChange={handleRotationChange}
                  style={{ flex: 1 }}
                  label={(value) => `${value}°`}
                  marks={[
                    { value: -90, label: '-90°' },
                    { value: 0, label: '0°' },
                    { value: 90, label: '90°' },
                  ]}
                />
              </Group>

              <Text size="xs" c="dimmed" ta="center">
                Adjust rotation first, then draw your crop area
              </Text>

              {/* Action buttons */}
              <Group justify="space-between">
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={() => {
                    handleRotationChange(0);
                  }}
                >
                  Reset
                </Button>
                <Group gap="sm">
                  <Button
                    variant="subtle"
                    color="gray"
                    leftSection={<IconX size={16} />}
                    onClick={handleCloseEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="filled"
                    color="sage"
                    leftSection={<IconCheck size={16} />}
                    onClick={handleApply}
                    disabled={!canApply || isRotating}
                  >
                    Apply Changes
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Box>
        </Stack>
      </Modal>
    </>
  );
}
