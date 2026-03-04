

# Fix: Overlay Image Not Rendering on Map

## Diagnosis

The overlay image IS in memory (visible in the inspector preview as an `<img>` tag), and the bounding box is valid (corner markers render correctly). No console errors about missing imageUrl. The diagnostic warning we added doesn't fire, confirming the imageUrl exists.

The root cause is that **Mapbox GL JS struggles with very large base64 data URLs** passed directly to `map.addSource({ type: 'image', url: ... })`. While `<img>` tags handle base64 data URLs fine, Mapbox's internal image decoding pipeline can silently fail or ignore very large inline data URLs (typically > 1-2 MB).

## Fix

Convert base64 data URLs to **Blob URLs** before passing them to Mapbox's image source. Blob URLs (`blob:https://...`) are efficiently handled by Mapbox because the browser serves them as regular HTTP resources.

### Changes

**`src/hooks/useMultiOverlayRenderer.ts`**:
- Add a helper function `dataUrlToBlobUrl(dataUrl)` that converts base64 data URLs to blob URLs
- Maintain a `Map<string, string>` of overlay ID → blob URL for cleanup (revoking)
- In `updateOverlayLayer`, convert `overlay.imageUrl` to a blob URL before passing to `map.addSource` / `source.updateImage`
- On unmount, revoke all blob URLs to prevent memory leaks

**`src/hooks/useSharedFeatureRenderer.ts`**:
- Apply the same blob URL conversion in `updateOverlayLayer` for consistency in non-editor modes

### Implementation Detail

```ts
function dataUrlToBlobUrl(dataUrl: string): string {
  // Only convert data: URLs, pass through regular URLs
  if (!dataUrl.startsWith('data:')) return dataUrl;
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  return URL.createObjectURL(blob);
}
```

This is a targeted fix — only the Mapbox rendering path changes. The rest of the overlay system (storage, inspector preview, context state) continues using the original data URL.

