

# Fix: Ugly Blue/Red Styling on Image Button

## Problem
The "Image" button in the Feature Toolbox has an unattractive bright blue active/focus state with a red-ish outline, inconsistent with the other dark-themed buttons.

## Change

**File: `src/pages/TrackEditor.tsx` (lines ~407-416)**

Update the Image button to match the styling pattern of the other toolbox buttons. The other buttons toggle between `variant="default"` (active) and `variant="outline"` (inactive) based on drawing mode. The Image button should use the same `variant="outline"` style but with a `focus-visible` ring that matches the dark theme instead of the default blue ring.

Add `focus-visible:ring-0` or use a muted focus style so it doesn't flash bright blue when clicked:

```tsx
<Button
  variant="outline"
  size="sm"
  className="h-9 justify-start gap-2 hover:border-primary hover:text-primary focus-visible:ring-1 focus-visible:ring-primary/50"
  onClick={handleCreateOverlay}
  disabled={featureDrawing.isDrawing}
>
```

This removes the harsh default blue focus ring and replaces it with a subtle primary-colored ring that matches the dark UI theme.

## Impact
- Visual-only change, no logic changes
- Single line edit in `TrackEditor.tsx`
