import pb from '../lib/pocketbase';

// Convert data URL to File object for PocketBase upload
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}

// Get image URL from PocketBase file field using the SDK method
// This is the recommended approach per PocketBase documentation
export function getImageUrl(
  record: { id: string; collectionId: string; collectionName: string },
  filename: string | undefined | null,
  thumb?: string
): string {
  if (!filename || !record.id || !record.collectionName) {
    return ''; // Return empty string if filename or required fields are missing
  }
  
  // Use PocketBase SDK's getURL method (recommended approach)
  // This properly handles thumbnails when thumb sizes are configured
  const options = thumb ? { thumb } : {};
  return pb.files.getURL(record, filename, options);
}

