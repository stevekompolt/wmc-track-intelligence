
# Map Style Switcher

## Overview
Add a layer/style switcher control to the TrackMap component so users can change between different map types. Currently the map uses `dark-v11` which is very dark - we'll add options for lighter and more varied map styles.

---

## Mapbox Style Options

We'll include these commonly used Mapbox styles:

| Style | Mapbox URL | Description |
|-------|------------|-------------|
| Dark | `mapbox://styles/mapbox/dark-v11` | Current dark theme |
| Light | `mapbox://styles/mapbox/light-v11` | Light/white theme |
| Streets | `mapbox://styles/mapbox/streets-v12` | Standard street map |
| Satellite | `mapbox://styles/mapbox/satellite-v9` | Aerial imagery |
| Satellite Streets | `mapbox://styles/mapbox/satellite-streets-v12` | Satellite with labels |
| Outdoors | `mapbox://styles/mapbox/outdoors-v12` | Terrain-focused |

---

## UI Design

A floating button with a **Layers icon** in the bottom-right corner of the map. Clicking it opens a dropdown menu with the style options. The current selection shows a checkmark.

Position: Bottom-right (avoiding conflict with navigation controls in top-right)

---

## Implementation

### Changes to TrackMap.tsx

1. **Add state** for current map style
2. **Add style configuration array** with name, id, and icon
3. **Add dropdown menu** with Layers button trigger
4. **Handle style change** using `map.setStyle()` method
5. **Preserve camera position** when changing styles (center, zoom, pitch, bearing)

---

## Technical Details

### Style Change Logic
```text
1. User clicks Layers button → dropdown opens
2. User selects a style → call map.setStyle(newStyleUrl)
3. Mapbox reloads tiles with new style
4. Camera position (center, zoom, pitch, bearing) is preserved automatically
```

### Component Structure
```text
TrackMap
├── Map container
├── Track name overlay (top-left)
└── Style switcher (bottom-right)
    ├── Layers button (trigger)
    └── Dropdown menu
        ├── Dark ✓ (if selected)
        ├── Light
        ├── Streets
        ├── Satellite
        ├── Satellite Streets
        └── Outdoors
```

---

## Files Changed

| File | Action |
|------|--------|
| `src/components/editor/TrackMap.tsx` | Add style state, dropdown menu, and setStyle handler |

---

## Visual Result

- Floating **Layers** icon button (bottom-right corner)
- Dropdown with 6 map style options
- Current style indicated with checkmark
- Smooth transition when changing styles
