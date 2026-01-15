import pb from '../lib/pocketbase';

const SCRAPER_URL = import.meta.env.VITE_SCRAPER_URL || 'http://localhost:3001';

export type ImageAdjustments = {
  brightness: number;
  contrast: number;
  rotation: number; // 0, 90, 180, or 270 degrees
};


export const DEFAULT_ADJUSTMENTS: ImageAdjustments = { brightness: 0, contrast: 0, rotation: 0 };

// Helper to get auth headers for scraper API calls
function getAuthHeaders(): HeadersInit {
  const token = pb.authStore.token;
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }
  return { 'Authorization': `Bearer ${token}` };
}

// Check if URL is from PocketBase (same origin or our PocketBase instance)
function isPocketBaseUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pbUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';
    const pbUrlObj = new URL(pbUrl);
    return urlObj.origin === pbUrlObj.origin || url.includes('/api/files/');
  } catch {
    return false;
  }
}

// Convert external image URL to data URL (bypasses CORS and stores locally)
export async function proxyImage(url: string): Promise<string> {
  try {
    // For PocketBase URLs, try to use them directly first (they might work with CORS)
    if (isPocketBaseUrl(url)) {
      try {
        // Try to fetch directly and convert to data URL
        const token = pb.authStore.token;
        const response = await fetch(url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        
        if (response.ok) {
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                resolve(reader.result);
              } else {
                reject(new Error('Failed to convert image to data URL'));
              }
            };
            reader.onerror = () => reject(new Error('Failed to read image'));
            reader.readAsDataURL(blob);
          });
        }
      } catch (directError) {
        // If direct fetch fails, fall through to proxy
        console.debug('Direct fetch failed, trying proxy:', directError);
      }
    }

    // Use proxy for external URLs or if direct fetch failed
    const proxyUrl = `${SCRAPER_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
    
    // Fetch image through our CORS proxy with auth
    const response = await fetch(proxyUrl, { headers: getAuthHeaders() });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    // Get image as blob
    const blob = await response.blob();
    
    // Convert blob to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert image to data URL'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error(`Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Apply brightness/contrast adjustments to an image using Canvas
export async function applyImageAdjustments(
  imageDataUrl: string,
  adjustments: ImageAdjustments
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const brightness = adjustments.brightness;
      const contrast = adjustments.contrast;
      const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        // Apply contrast
        data[i] = contrastFactor * (data[i] - 128) + 128;
        data[i + 1] = contrastFactor * (data[i + 1] - 128) + 128;
        data[i + 2] = contrastFactor * (data[i + 2] - 128) + 128;

        // Apply brightness
        data[i] += brightness;
        data[i + 1] += brightness;
        data[i + 2] += brightness;

        // Clamp values
        data[i] = Math.max(0, Math.min(255, data[i]));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

// Auto-adjust: analyze image and suggest brightness/contrast fixes
// PMG holder images often look washed out - this algorithm is tuned for them
export async function autoAdjustImage(imageDataUrl: string): Promise<ImageAdjustments> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    
    // Enable CORS to allow canvas operations on cross-origin images
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Use smaller size for analysis
      const scale = Math.min(1, 300 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Build histogram and collect luminance values
      const luminances: number[] = [];
      const histogram = new Array(256).fill(0);
      
      for (let i = 0; i < data.length; i += 4) {
        const luminance = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        luminances.push(luminance);
        histogram[luminance]++;
      }

      // Sort for percentile calculation
      luminances.sort((a, b) => a - b);
      const pixelCount = luminances.length;
      
      // Use percentiles for more robust min/max (ignore outliers)
      const p5 = luminances[Math.floor(pixelCount * 0.05)];
      const p50 = luminances[Math.floor(pixelCount * 0.50)]; // median
      const p95 = luminances[Math.floor(pixelCount * 0.95)];
      const avgLuminance = luminances.reduce((a, b) => a + b, 0) / pixelCount;
      
      // Effective range (ignoring extreme outliers)
      const effectiveRange = p95 - p5;
      
      // Calculate standard deviation for contrast analysis
      const variance = luminances.reduce((sum, val) => sum + Math.pow(val - avgLuminance, 2), 0) / pixelCount;
      const stdDev = Math.sqrt(variance);

      let brightness = 0;
      let contrast = 0;

      // Brightness: VERY aggressive - PMG images in holders are often quite dark
      // Target median around 165 for excellent visibility (increased from 150)
      const targetMedian = 165;
      
      if (p50 < 100) {
        // Very dark images: extremely aggressive (2x multiplier)
        brightness = Math.round((targetMedian - p50) * 2.0);
      } else if (p50 < 140) {
        // Moderately dark images: very aggressive (1.5x multiplier)
        brightness = Math.round((targetMedian - p50) * 1.5);
      } else if (p50 < 155) {
        // Slightly dark: still aggressive (1.2x multiplier)
        brightness = Math.round((targetMedian - p50) * 1.2);
      } else if (p50 > 175) {
        // Too bright: tone down
        brightness = Math.round((targetMedian - p50) * 0.7);
      }

      // Contrast: Moderate adjustment for PMG holders
      // Target std dev around 55-58 for good contrast
      const targetStdDev = 56;
      if (stdDev < targetStdDev) {
        contrast = Math.round((targetStdDev - stdDev) * 1.3); // Reduced from 1.8 to 1.3
      }
      
      // Also check effective range - should be at least 210 for good contrast
      const targetRange = 210;
      if (effectiveRange < targetRange) {
        const rangeBoost = Math.round((targetRange - effectiveRange) * 0.25); // Reduced from 0.4 to 0.25
        contrast = Math.max(contrast, rangeBoost);
      }

      // Clamp to moderate values
      brightness = Math.max(-50, Math.min(120, brightness));
      contrast = Math.max(0, Math.min(65, contrast)); // Reduced max from 80 to 65

      console.log('Auto-adjust analysis:', {
        p5, p50, p95, avgLuminance: Math.round(avgLuminance),
        effectiveRange, stdDev: Math.round(stdDev),
        targetMedian, targetStdDev: 56, targetRange: 210,
        result: { brightness, contrast }
      });

      resolve({ brightness, contrast, rotation: 0 });
    };

    img.onerror = () => reject(new Error('Failed to analyze image'));
    img.src = imageDataUrl;
  });
}

