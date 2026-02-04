
# Collapsible Features List with Selected Feature Preview

## Overview

Make the FEATURES section collapsible like the FEATURE TOOLBOX. When collapsed, it will show only the currently selected feature (if any) as a quick preview, while hiding the rest of the list.

---

## Technical Changes

### File: `src/pages/TrackEditor.tsx`

Wrap the Features header and list in a `Collapsible` component with smart preview behavior:

| Change | Description |
|--------|-------------|
| Add Collapsible wrapper | Wrap the FEATURES header and FeatureList in `Collapsible` |
| Add CollapsibleTrigger | Make the header clickable with a ChevronDown icon |
| Show selected feature when collapsed | Display the currently selected feature name/icon in the header when collapsed |
| Wrap FeatureList in CollapsibleContent | Hide the full list when collapsed |

### Implementation Details

**Header behavior:**
- When expanded: Shows "FEATURES (count)" with collapse arrow
- When collapsed: Shows "FEATURES (count)" plus the selected feature name and icon (if any) as a preview chip

**Selected feature preview (when collapsed):**
```
FEATURES (5) • [icon] Finish Line     [▶]
```

This gives users quick context about which feature is selected without needing to expand the list.

---

## Code Structure

```text
<Collapsible defaultOpen>
  <CollapsibleTrigger>
    FEATURES (count)
    {collapsed && selectedFeature && (
      <preview chip showing selected feature>
    )}
    <ChevronDown />
  </CollapsibleTrigger>
  <CollapsibleContent>
    <FeatureList ... />
  </CollapsibleContent>
</Collapsible>
```

---

## Visual Result

**Expanded state:**
- Header with count and collapse arrow
- Full scrollable feature list below

**Collapsed state:**
- Header shows count + selected feature name/icon as inline preview
- List hidden to save space for Feature Inspector

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/TrackEditor.tsx` | Wrap Features section in Collapsible with selected feature preview |
