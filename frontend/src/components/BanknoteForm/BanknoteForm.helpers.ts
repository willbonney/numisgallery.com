import { notifications } from '@mantine/notifications';
import pb from '../../lib/pocketbase';
import type { ImageAdjustments } from '../../utils/imageProcessing';
import {
  applyImageAdjustments,
  autoAdjustImage,
  DEFAULT_ADJUSTMENTS,
  proxyImage,
} from '../../utils/imageProcessing';

const SCRAPER_URL = import.meta.env.VITE_SCRAPER_URL || 'http://localhost:3001';

// Helper to get auth headers for scraper API calls
function getAuthHeaders(): HeadersInit {
  const token = pb.authStore.token;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

export type ImageState = {
  originalUrl: string;
  proxiedDataUrl: string | null;
  adjustedDataUrl: string | null;
  adjustments: ImageAdjustments;
  isPmgFetched: boolean;
  isCropping?: boolean; // Whether we're in crop mode
};

export type ImageStateSetter = React.Dispatch<React.SetStateAction<ImageState>>;

// Base type shared by both world and US notes
type BaseExtractedPMGData = {
  grade?: string;
  isEpq?: boolean;
  isSpecimen?: boolean;
  pickNumber?: string;
  yearOfIssue?: string;
  faceValue?: number;
  currency?: string;
  serialNumber?: string;
  watermark?: string;
  pmgComments?: string[];
  confidence?: 'high' | 'medium' | 'low';
};

// World notes have a country and optional authority, no city
type WorldNoteExtractedData = BaseExtractedPMGData & {
  noteType: 'world';
  country: string;
  authority?: string; // e.g., "Banque de France" (text after comma)
  city?: never;
};

// US notes have authority and optional city, country is optional (extracted by AI)
type USNoteExtractedData = BaseExtractedPMGData & {
  noteType: 'us';
  country?: string; // e.g., "United States" (extracted by AI, not on label)
  authority: string; // e.g., "Federal Reserve", "United States"
  city?: string; // e.g., "Kansas City" (only for Federal Reserve Notes)
};

// Discriminated union for type-safe handling
export type ExtractedPMGData = WorldNoteExtractedData | USNoteExtractedData;

// Helper function to process image results (used by both queue and direct modes)
async function processImageResult(
  data: { obverseUrl: string; reverseUrl: string },
  setObverseState: ImageStateSetter,
  setReverseState: ImageStateSetter
) {
  if (data.obverseUrl && data.reverseUrl) {
    try {
      const [obverseProxy, reverseProxy] = await Promise.all([
        proxyImage(data.obverseUrl),
        proxyImage(data.reverseUrl),
      ]);

      setObverseState({
        originalUrl: data.obverseUrl,
        proxiedDataUrl: obverseProxy,
        adjustedDataUrl: null,
        adjustments: DEFAULT_ADJUSTMENTS,
        isPmgFetched: true,
      });
      setReverseState({
        originalUrl: data.reverseUrl,
        proxiedDataUrl: reverseProxy,
        adjustedDataUrl: null,
        adjustments: DEFAULT_ADJUSTMENTS,
        isPmgFetched: true,
      });
      
      notifications.show({
        title: 'Images Loaded',
        message: 'PMG images loaded successfully!',
        color: 'green',
      });
    } catch (proxyError) {
      console.error('Failed to convert images:', proxyError);
      setObverseState({
        originalUrl: data.obverseUrl,
        proxiedDataUrl: null,
        adjustedDataUrl: null,
        adjustments: DEFAULT_ADJUSTMENTS,
        isPmgFetched: true,
      });
      setReverseState({
        originalUrl: data.reverseUrl,
        proxiedDataUrl: null,
        adjustedDataUrl: null,
        adjustments: DEFAULT_ADJUSTMENTS,
        isPmgFetched: true,
      });
      notifications.show({
        title: 'Images Loaded',
        message: 'Images loaded (direct URLs). Auto-adjust may not work due to CORS.',
        color: 'yellow',
      });
    }
  }
}

export async function fetchPMGImages(
  cert: string,
  grade: string,
  setObverseState: ImageStateSetter,
  setReverseState: ImageStateSetter,
  setFetchingImages: (value: boolean) => void
) {
  if (!cert || !grade || grade === 'Not Listed') {
    notifications.show({
      title: 'Missing Info',
      message: 'Enter cert number and select grade first',
      color: 'yellow',
    });
    return;
  }

  setFetchingImages(true);
  
  try {
    // Submit request (may be queued or processed directly)
    const submitResponse = await fetch(
      `${SCRAPER_URL}/api/pmg-images`,
      {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cert: cert.trim(),
          grade: grade,
        }),
      }
    );
    
    const submitData = await submitResponse.json();
    
    if (!submitResponse.ok) {
      throw new Error(submitData.error || 'Failed to process request');
    }
    
    // Check if response is from queue system or direct processing
    if (submitData.jobId && submitData.status === 'queued') {
      // Queue mode - poll for completion
      const jobId = submitData.jobId;
      const initialPosition = submitData.position;
      
      if (initialPosition > 1) {
        notifications.show({
          title: 'Request Queued',
          message: `Your request is in queue (position ${initialPosition}). Processing...`,
          color: 'blue',
          autoClose: 3000,
        });
      }
      
      // Poll for job completion
      const pollInterval = 2000; // Poll every 2 seconds
      const maxPollTime = 300000; // Max 5 minutes
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxPollTime) {
        const statusResponse = await fetch(
          `${SCRAPER_URL}/api/pmg-images/${jobId}`,
          { headers: getAuthHeaders() }
        );
        
        const statusData = await statusResponse.json();
        
        if (!statusResponse.ok) {
          throw new Error(statusData.error || 'Failed to check job status');
        }
        
        if (statusData.status === 'completed' && statusData.result) {
          const data = statusData.result;
          await processImageResult(data, setObverseState, setReverseState);
          break; // Job completed
        } else if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Job failed');
        } else if (statusData.position > 0) {
          // Still in queue, show position update
          console.log(`[Queue] Position: ${statusData.position}`);
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      
      if (Date.now() - startTime >= maxPollTime) {
        throw new Error('Request timed out. Please try again.');
      }
    } else {
      // Direct processing mode - result is immediate
      await processImageResult(submitData, setObverseState, setReverseState);
    }
    
  } catch (error) {
    notifications.show({
      title: 'Fetch Failed',
      message: error instanceof Error ? error.message : 'Could not fetch images',
      color: 'red',
    });
  } finally {
    setFetchingImages(false);
  }
}

export async function extractDataFromImages(
  obverseUrl: string,
  reverseUrl: string,
  setExtractingData: (value: boolean) => void,
  onDataExtracted: (data: ExtractedPMGData) => void
) {
  if (!obverseUrl || !reverseUrl) {
    notifications.show({
      title: 'No Images',
      message: 'Please fetch PMG images first',
      color: 'red',
    });
    return;
  }

  setExtractingData(true);
  try {
    const response = await fetch(`${SCRAPER_URL}/api/extract-pmg-data`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        obverseUrl,
        reverseUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract data');
    }

    const data = await response.json();
    onDataExtracted(data);

    notifications.show({
      title: 'Data Extracted',
      message: `Extracted with ${data.confidence} confidence. Please verify all fields, especially Pick/Friedberg Number.`,
      color: data.confidence === 'high' ? 'green' : 'yellow',
      autoClose: 8000,
    });
  } catch (error) {
    console.error('AI extraction error:', error);
    notifications.show({
      title: 'Extraction Failed',
      message: error instanceof Error ? error.message : 'Could not extract data',
      color: 'red',
    });
  } finally {
    setExtractingData(false);
  }
}

export async function applyImageAdjustmentsDebounced(
  state: ImageState,
  newAdjustments: ImageAdjustments,
  setState: ImageStateSetter,
  setAdjusting: (value: boolean) => void,
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
) {
  setState(prev => ({ ...prev, adjustments: newAdjustments }));

  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }

  timeoutRef.current = setTimeout(async () => {
    // Only use proxied data URL to avoid CORS issues
    // Check that it's actually a data URL (starts with "data:")
    if (!state.proxiedDataUrl || !state.proxiedDataUrl.startsWith('data:')) return;
    
    setAdjusting(true);
    try {
      const adjusted = await applyImageAdjustments(state.proxiedDataUrl, newAdjustments);
      setState(prev => ({ ...prev, adjustedDataUrl: adjusted }));
    } catch (error) {
      console.error('Failed to adjust image:', error);
    } finally {
      setAdjusting(false);
    }
  }, 150);
}

export async function autoAdjustImageWithFeedback(
  state: ImageState,
  setState: ImageStateSetter,
  setAdjusting: (value: boolean) => void
) {
  // Only use proxied data URL to avoid CORS issues
  // Check that it's actually a data URL (starts with "data:")
  if (!state.proxiedDataUrl || !state.proxiedDataUrl.startsWith('data:')) {
    notifications.show({
      title: 'Cannot Auto-Adjust',
      message: 'Image must be loaded as a data URL. The image may not have been properly proxied due to CORS restrictions.',
      color: 'orange',
    });
    return;
  }

  setAdjusting(true);
  try {
    const suggestedAdjustments = await autoAdjustImage(state.proxiedDataUrl);
    const adjusted = await applyImageAdjustments(state.proxiedDataUrl, suggestedAdjustments);
    setState(prev => ({
      ...prev,
      adjustments: suggestedAdjustments,
      adjustedDataUrl: adjusted,
    }));
    notifications.show({
      title: 'Auto-Adjusted',
      message: `Applied: Brightness ${suggestedAdjustments.brightness > 0 ? '+' : ''}${suggestedAdjustments.brightness}, Contrast ${suggestedAdjustments.contrast > 0 ? '+' : ''}${suggestedAdjustments.contrast}`,
      color: 'blue',
    });
  } catch {
    notifications.show({
      title: 'Auto-Adjust Failed',
      message: 'Could not analyze image',
      color: 'red',
    });
  } finally {
    setAdjusting(false);
  }
}

// NumberInput requires setTimeout due to internal rendering timing
export function selectNumberInputOnFocus(event: React.FocusEvent<HTMLInputElement>) {
  setTimeout(() => {
    event.target.select();
  }, 0);
}

