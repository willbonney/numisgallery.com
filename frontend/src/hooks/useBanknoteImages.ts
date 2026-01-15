import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PixelCrop } from 'react-image-crop';
import {
  applyImageAdjustmentsDebounced,
  autoAdjustImageWithFeedback,
  fetchPMGImages as fetchPMGImagesHelper,
  type ImageState,
} from '../components/BanknoteForm/BanknoteForm.helpers';
import type { Banknote } from '../types/banknote';
import { dataUrlToFile, getImageUrl } from '../utils/fileHelpers';
import { DEFAULT_ADJUSTMENTS } from '../utils/imageProcessing';

// Helper to crop an image
// pixelCrop coordinates are in the displayed image's coordinate space
// displayedWidth/Height are the dimensions of the image as shown in the crop UI
async function createCroppedImage(
  imageSrc: string,
  pixelCrop: PixelCrop,
  displayedWidth: number,
  displayedHeight: number
): Promise<string> {
  const image = new window.Image();
  
  return new Promise((resolve, reject) => {
    image.onload = () => {
      // Calculate scale between displayed and natural image size
      const scaleX = displayedWidth > 0 ? image.naturalWidth / displayedWidth : 1;
      const scaleY = displayedHeight > 0 ? image.naturalHeight / displayedHeight : 1;
      
      // Scale crop coordinates to natural image size
      const scaledCrop = {
        x: Math.round(pixelCrop.x * scaleX),
        y: Math.round(pixelCrop.y * scaleY),
        width: Math.round(pixelCrop.width * scaleX),
        height: Math.round(pixelCrop.height * scaleY),
      };

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = scaledCrop.width;
      canvas.height = scaledCrop.height;
      
      ctx.drawImage(
        image,
        scaledCrop.x,
        scaledCrop.y,
        scaledCrop.width,
        scaledCrop.height,
        0,
        0,
        scaledCrop.width,
        scaledCrop.height
      );

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = imageSrc;
  });
}

interface UseBanknoteImagesProps {
  banknote?: Banknote;
  isEditing: boolean;
  user: { id: string } | null;
}

export function useBanknoteImages({ banknote, isEditing, user }: UseBanknoteImagesProps) {
  const [obverseState, setObverseState] = useState<ImageState>({
    originalUrl: banknote?.obverseImage && banknote.id && banknote.collectionId && banknote.collectionName
      ? getImageUrl({ id: banknote.id, collectionId: banknote.collectionId, collectionName: banknote.collectionName }, banknote.obverseImage)
      : '',
    proxiedDataUrl: null,
    adjustedDataUrl: null,
    adjustments: DEFAULT_ADJUSTMENTS,
    isPmgFetched: false,
  });

  const [reverseState, setReverseState] = useState<ImageState>({
    originalUrl: banknote?.reverseImage && banknote.id && banknote.collectionId && banknote.collectionName
      ? getImageUrl({ id: banknote.id, collectionId: banknote.collectionId, collectionName: banknote.collectionName }, banknote.reverseImage)
      : '',
    proxiedDataUrl: null,
    adjustedDataUrl: null,
    adjustments: DEFAULT_ADJUSTMENTS,
    isPmgFetched: false,
  });

  const [fetchingImages, setFetchingImages] = useState(false);
  const [adjustingObverse, setAdjustingObverse] = useState(false);
  const [adjustingReverse, setAdjustingReverse] = useState(false);
  const adjustTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [obverseFile, setObverseFile] = useState<File | null>(null);
  const [reverseFile, setReverseFile] = useState<File | null>(null);
  const [obverseUrlError, setObverseUrlError] = useState<string | null>(null);
  const [reverseUrlError, setReverseUrlError] = useState<string | null>(null);
  const [loadingObverseUrl, setLoadingObverseUrl] = useState(false);
  const [loadingReverseUrl, setLoadingReverseUrl] = useState(false);

  // Automatically proxy images when editing to enable adjustments
  useEffect(() => {
    async function proxyExistingImages() {
      if (!user) {
        return;
      }

      if (isEditing && obverseState.originalUrl && !obverseState.proxiedDataUrl) {
        try {
          const { proxyImage } = await import('../utils/imageProcessing');
          const proxied = await proxyImage(obverseState.originalUrl);
          setObverseState(prev => ({ ...prev, proxiedDataUrl: proxied }));
        } catch (error) {
          if (error instanceof Error && !error.message.includes('Unauthorized') && !error.message.includes('401')) {
            console.debug('Failed to proxy obverse image (adjustments may not be available):', error.message);
          }
        }
      }
      if (isEditing && reverseState.originalUrl && !reverseState.proxiedDataUrl) {
        try {
          const { proxyImage } = await import('../utils/imageProcessing');
          const proxied = await proxyImage(reverseState.originalUrl);
          setReverseState(prev => ({ ...prev, proxiedDataUrl: proxied }));
        } catch (error) {
          if (error instanceof Error && !error.message.includes('Unauthorized') && !error.message.includes('401')) {
            console.debug('Failed to proxy reverse image (adjustments may not be available):', error.message);
          }
        }
      }
    }
    proxyExistingImages();
  }, [user, isEditing, obverseState.originalUrl, reverseState.originalUrl, obverseState.proxiedDataUrl, reverseState.proxiedDataUrl]);

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return true;
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const fetchPMGImages = useCallback((cert: string, grade: string) => {
    fetchPMGImagesHelper(cert, grade, setObverseState, setReverseState, setFetchingImages);
  }, []);

  const clearImages = useCallback(() => {
    setObverseFile(null);
    setReverseFile(null);
    setObverseState({
      originalUrl: '',
      proxiedDataUrl: null,
      adjustedDataUrl: null,
      adjustments: DEFAULT_ADJUSTMENTS,
      isPmgFetched: false,
    });
    setReverseState({
      originalUrl: '',
      proxiedDataUrl: null,
      adjustedDataUrl: null,
      adjustments: DEFAULT_ADJUSTMENTS,
      isPmgFetched: false,
    });
  }, []);

  const handleAdjustmentChange = useCallback(async (
    side: 'obverse' | 'reverse',
    field: 'brightness' | 'contrast',
    value: number
  ) => {
    const setState = side === 'obverse' ? setObverseState : setReverseState;
    const state = side === 'obverse' ? obverseState : reverseState;
    const setAdjusting = side === 'obverse' ? setAdjustingObverse : setAdjustingReverse;

    const newAdjustments = { ...state.adjustments, [field]: value };
    applyImageAdjustmentsDebounced(state, newAdjustments, setState, setAdjusting, adjustTimeoutRef);
  }, [obverseState, reverseState]);

  const handleAutoAdjust = useCallback((side: 'obverse' | 'reverse') => {
    const state = side === 'obverse' ? obverseState : reverseState;
    const setState = side === 'obverse' ? setObverseState : setReverseState;
    const setAdjusting = side === 'obverse' ? setAdjustingObverse : setAdjustingReverse;

    autoAdjustImageWithFeedback(state, setState, setAdjusting);
  }, [obverseState, reverseState]);

  const handleResetAdjustments = useCallback(async (side: 'obverse' | 'reverse') => {
    const setState = side === 'obverse' ? setObverseState : setReverseState;
    setState(prev => ({
      ...prev,
      adjustments: DEFAULT_ADJUSTMENTS,
      adjustedDataUrl: null,
    }));
  }, []);

  const handleCrop = useCallback(async (
    side: 'obverse' | 'reverse',
    croppedAreaPixels: PixelCrop,
    rotatedImageSrc: string, // The rotated preview image to crop from
    displayedWidth: number = 0,
    displayedHeight: number = 0
  ) => {
    const setState = side === 'obverse' ? setObverseState : setReverseState;
    const setAdjusting = side === 'obverse' ? setAdjustingObverse : setAdjustingReverse;

    if (!rotatedImageSrc || !rotatedImageSrc.startsWith('data:')) {
      notifications.show({
        title: 'Cannot Edit',
        message: 'Image must be loaded first',
        color: 'orange',
      });
      return;
    }

    setAdjusting(true);
    try {
      // Crop from the rotated preview (rotation is already applied)
      const processedImage = await createCroppedImage(rotatedImageSrc, croppedAreaPixels, displayedWidth, displayedHeight);
      
      // Update both proxied (base) and adjusted (display) to the processed version
      setState(prev => ({
        ...prev,
        proxiedDataUrl: processedImage,
        adjustedDataUrl: processedImage,
        // Reset brightness/contrast since we're working on a new base image
        adjustments: DEFAULT_ADJUSTMENTS,
      }));

      // Also update the file if we have one
      if (side === 'obverse' && obverseFile) {
        const newFile = dataUrlToFile(processedImage, obverseFile.name);
        setObverseFile(newFile);
      } else if (side === 'reverse' && reverseFile) {
        const newFile = dataUrlToFile(processedImage, reverseFile.name);
        setReverseFile(newFile);
      }

      notifications.show({
        title: 'Image Updated',
        message: 'Crop applied',
        color: 'green',
      });
    } catch (error) {
      console.error('Failed to process image:', error);
      notifications.show({
        title: 'Edit Failed',
        message: 'Could not process image',
        color: 'red',
      });
    } finally {
      setAdjusting(false);
    }
  }, [obverseState, reverseState, obverseFile, reverseFile]);

  const handleObverseUrlChange = useCallback((url: string) => {
    setObverseUrlError(null);
    setObverseState(prev => ({
      ...prev,
      originalUrl: url,
      proxiedDataUrl: null,
      adjustedDataUrl: null,
      adjustments: DEFAULT_ADJUSTMENTS,
    }));
  }, []);

  const handleObverseUrlBlur = useCallback(async (url: string) => {
    if (!url.trim()) {
      setObverseUrlError(null);
      return;
    }

    if (!validateUrl(url)) {
      setObverseUrlError('Please enter a valid URL (e.g., https://example.com/image.jpg)');
      return;
    }

    setLoadingObverseUrl(true);
    setObverseUrlError(null);
    try {
      const { proxyImage } = await import('../utils/imageProcessing');
      const proxiedUrl = await proxyImage(url);
      setObverseState(prev => ({
        ...prev,
        originalUrl: url,
        proxiedDataUrl: proxiedUrl,
        adjustedDataUrl: null,
        adjustments: DEFAULT_ADJUSTMENTS,
      }));
    } catch (error) {
      setObverseUrlError(error instanceof Error ? error.message : 'Failed to load image. Please check the URL and try again.');
      setObverseState(prev => ({
        ...prev,
        originalUrl: url,
        proxiedDataUrl: null,
        adjustedDataUrl: null,
        adjustments: DEFAULT_ADJUSTMENTS,
      }));
    } finally {
      setLoadingObverseUrl(false);
    }
  }, []);

  const handleReverseUrlChange = useCallback((url: string) => {
    setReverseUrlError(null);
    setReverseState(prev => ({
      ...prev,
      originalUrl: url,
      proxiedDataUrl: null,
      adjustedDataUrl: null,
      adjustments: DEFAULT_ADJUSTMENTS,
    }));
  }, []);

  const handleReverseUrlBlur = useCallback(async (url: string) => {
    if (!url.trim()) {
      setReverseUrlError(null);
      return;
    }

    if (!validateUrl(url)) {
      setReverseUrlError('Please enter a valid URL (e.g., https://example.com/image.jpg)');
      return;
    }

    setLoadingReverseUrl(true);
    setReverseUrlError(null);
    try {
      const { proxyImage } = await import('../utils/imageProcessing');
      const proxiedUrl = await proxyImage(url);
      setReverseState(prev => ({
        ...prev,
        originalUrl: url,
        proxiedDataUrl: proxiedUrl,
        adjustedDataUrl: null,
        adjustments: DEFAULT_ADJUSTMENTS,
      }));
    } catch (error) {
      setReverseUrlError(error instanceof Error ? error.message : 'Failed to load image. Please check the URL and try again.');
      setReverseState(prev => ({
        ...prev,
        originalUrl: url,
        proxiedDataUrl: null,
        adjustedDataUrl: null,
        adjustments: DEFAULT_ADJUSTMENTS,
      }));
    } finally {
      setLoadingReverseUrl(false);
    }
  }, []);

  const handleObverseFileUpload = useCallback(async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      setObverseFile(file);
      setObverseState({
        originalUrl: dataUrl,
        proxiedDataUrl: dataUrl,
        adjustedDataUrl: null,
        adjustments: DEFAULT_ADJUSTMENTS,
        isPmgFetched: false,
      });
    } catch {
      notifications.show({
        title: 'Upload Failed',
        message: 'Failed to read image file',
        color: 'red',
      });
    }
  }, []);

  const handleReverseFileUpload = useCallback(async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      setReverseFile(file);
      setReverseState({
        originalUrl: dataUrl,
        proxiedDataUrl: dataUrl,
        adjustedDataUrl: null,
        adjustments: DEFAULT_ADJUSTMENTS,
        isPmgFetched: false,
      });
    } catch {
      notifications.show({
        title: 'Upload Failed',
        message: 'Failed to read image file',
        color: 'red',
      });
    }
  }, []);

  const handleClearObverseFile = useCallback(() => {
    setObverseFile(null);
    setObverseUrlError(null);
    setObverseState({
      originalUrl: '',
      proxiedDataUrl: null,
      adjustedDataUrl: null,
      adjustments: DEFAULT_ADJUSTMENTS,
      isPmgFetched: false,
    });
  }, []);

  const handleClearReverseFile = useCallback(() => {
    setReverseFile(null);
    setReverseUrlError(null);
    setReverseState({
      originalUrl: '',
      proxiedDataUrl: null,
      adjustedDataUrl: null,
      adjustments: DEFAULT_ADJUSTMENTS,
      isPmgFetched: false,
    });
  }, []);

  const getFilesForSubmission = useCallback(() => {
    let obverseFileToUpload: File | undefined;
    let reverseFileToUpload: File | undefined;

    const finalObverseDataUrl = obverseState.adjustedDataUrl || obverseState.proxiedDataUrl;
    const finalReverseDataUrl = reverseState.adjustedDataUrl || reverseState.proxiedDataUrl;

    if (finalObverseDataUrl && finalObverseDataUrl.startsWith('data:')) {
      obverseFileToUpload = dataUrlToFile(finalObverseDataUrl, 'obverse.jpg');
    } else if (obverseFile) {
      obverseFileToUpload = obverseFile;
    }

    if (finalReverseDataUrl && finalReverseDataUrl.startsWith('data:')) {
      reverseFileToUpload = dataUrlToFile(finalReverseDataUrl, 'reverse.jpg');
    } else if (reverseFile) {
      reverseFileToUpload = reverseFile;
    }

    return { obverseFileToUpload, reverseFileToUpload };
  }, [obverseState, reverseState, obverseFile, reverseFile]);

  const hasPmgImages = obverseState.isPmgFetched || reverseState.isPmgFetched;

  return {
    // State
    obverseState,
    reverseState,
    obverseFile,
    reverseFile,
    fetchingImages,
    adjustingObverse,
    adjustingReverse,
    obverseUrlError,
    reverseUrlError,
    loadingObverseUrl,
    loadingReverseUrl,
    hasPmgImages,
    // Actions
    fetchPMGImages,
    clearImages,
    handleAdjustmentChange,
    handleAutoAdjust,
    handleResetAdjustments,
    handleCrop,
    handleObverseUrlChange,
    handleObverseUrlBlur,
    handleReverseUrlChange,
    handleReverseUrlBlur,
    handleObverseFileUpload,
    handleReverseFileUpload,
    handleClearObverseFile,
    handleClearReverseFile,
    getFilesForSubmission,
  };
}

