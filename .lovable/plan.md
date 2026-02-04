

# Rename "Opacity" to "Stroke Opacity"

## Change Summary

Rename the "Opacity" label in the Feature Inspector to "Stroke Opacity" to make it clearer that this slider controls the transparency of the border/outline, not the fill area.

---

## File Change

| File | Line | Change |
|------|------|--------|
| `src/components/editor/FeatureInspector.tsx` | 192 | Change `Opacity` to `Stroke Opacity` |

---

## Before vs After

**Before:**
```
Opacity                    80%
[==========●=========]
```

**After:**
```
Stroke Opacity             80%
[==========●=========]
```

---

## Implementation

Single line change in `src/components/editor/FeatureInspector.tsx`:

Line 192: `<Label className="text-xs">Opacity</Label>`

Changes to: `<Label className="text-xs">Stroke Opacity</Label>`

