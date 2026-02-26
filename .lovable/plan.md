

# Add Hidden UTAH-2026 Page

## Overview
Add a new route `/utah-2026` that renders a full-screen Cesium Ion Story iframe. The page will not appear in the navigation menu — it's only accessible via direct URL.

## Changes

### 1. New File: `src/pages/Utah2026.tsx`
Create a simple page component that renders the Cesium Ion iframe at full size within the layout.

```tsx
export default function Utah2026() {
  return (
    <div className="h-full w-full">
      <iframe
        title="WMC Utah 2026"
        width="100%"
        height="100%"
        src="https://ion.cesium.com/stories/viewer/?id=3b83c565-be61-4509-b89a-b31235d7d3c1"
        frameBorder="0"
        allow="fullscreen"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
}
```

### 2. Edit: `src/App.tsx`
Add a new route inside the protected layout routes:

```tsx
<Route path="/utah-2026" element={<Utah2026 />} />
```

Import the new page component. No navigation links added — the page is only reachable by typing `/utah-2026` in the URL bar.

## Impact
- No changes to navigation or existing pages
- Single new page + one route registration
- Accessible to any authenticated user

