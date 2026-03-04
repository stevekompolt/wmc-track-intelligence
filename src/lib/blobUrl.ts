// Convert base64 data URLs to blob URLs for Mapbox compatibility
// Mapbox GL JS struggles with large inline base64 data URLs but handles blob: URLs fine

const blobUrlCache = new Map<string, string>();

export function dataUrlToBlobUrl(dataUrl: string): string {
  if (!dataUrl.startsWith('data:')) return dataUrl;

  // Return cached blob URL if we already converted this exact data URL
  const cached = blobUrlCache.get(dataUrl);
  if (cached) return cached;

  try {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/data:(.*?);/)?.[1] || 'image/png';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    blobUrlCache.set(dataUrl, blobUrl);
    return blobUrl;
  } catch (e) {
    console.error('Failed to convert data URL to blob URL:', e);
    return dataUrl;
  }
}

export function revokeBlobUrl(dataUrl: string): void {
  const blobUrl = blobUrlCache.get(dataUrl);
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrlCache.delete(dataUrl);
  }
}

export function revokeAllBlobUrls(): void {
  blobUrlCache.forEach(blobUrl => URL.revokeObjectURL(blobUrl));
  blobUrlCache.clear();
}
