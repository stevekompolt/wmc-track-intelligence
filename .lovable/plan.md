

# Fix Map Overlay Image Rendering

## Problem Summary

The overlay image is not appearing on the map due to two issues:

1. **SVG files are not supported** - Mapbox GL JS cannot render SVG images as raster sources
2. **Blob URLs need conversion** - Mapbox requires fully-decoded image data for reliable rendering

---

## Solution Overview

1. **Remove SVG from accepted formats** - Only accept PNG and JPEG
2. **Convert uploaded images to data URLs** - More reliable for Mapbox rendering
3. **Add error handling** - Show user-friendly message when image fails to load
4. **Add image format validation** - Prevent unsupported formats early

---

## File Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/components/editor/OverlayEditorPanel.tsx` | Modify | Fix accepted formats, add validation |
| `src/types/overlay.ts` | Modify | Add image conversion utility |
| `src/hooks/useMapOverlayRenderer.ts` | Modify | Add error handling for image load failures |

---

## Implementation Details

### 1. Update File Input to Accept Only PNG/JPEG

Remove SVG from accepted formats since Mapbox cannot render it:

```text
Before: accept="image/png,image/svg+xml"
After:  accept="image/png,image/jpeg,image/jpg"
```

### 2. Convert File to Data URL

Convert blob to base64 data URL for reliable Mapbox rendering:

```text
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
```

### 3. Add Image Load Error Handler

Show toast notification when Mapbox fails to load the image:

```text
map.on('error', (e) => {
  if (e.sourceId === 'overlay-image') {
    toast.error('Failed to load overlay image');
  }
});
```

### 4. Update Upload Handler

```text
const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
    toast.error('Only PNG and JPEG images are supported');
    return;
  }
  
  // Convert to data URL for reliable rendering
  const dataUrl = await fileToDataUrl(file);
  onSetImageUrl(dataUrl);
};
```

### 5. Update UI Help Text

Change upload area text from "PNG/SVG" to "PNG/JPEG":

```text
Before: "Click to upload PNG/SVG"
After:  "Click to upload PNG or JPEG"
```

---

## Technical Notes

### Why Data URLs Instead of Blob URLs?

| Approach | Pros | Cons |
|----------|------|------|
| Blob URL | Memory efficient | Revoked on page unload, CORS issues |
| Data URL | Self-contained, reliable | Larger in memory, base64 encoded |

For overlay images (typically < 5MB), data URLs are more reliable.

### Why No SVG Support?

Mapbox GL JS uses WebGL to render `image` sources. SVG requires:
1. Parsing XML
2. Rasterizing to canvas
3. Converting to texture

This is not supported by the `image` source type. A workaround would be to rasterize SVG to canvas first, but that adds complexity. For this use case, requiring PNG/JPEG is simpler.

---

## User Experience Changes

1. **Clearer upload guidance** - "PNG or JPEG" instead of "PNG/SVG"
2. **Validation feedback** - Toast if wrong format is uploaded
3. **Error recovery** - Toast if Mapbox fails to render

---

## Summary

This fix ensures:
- Only supported image formats are accepted
- Images are converted to reliable data URLs
- Users receive clear feedback on errors
- The overlay renders immediately after upload

