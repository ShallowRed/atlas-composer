# Scale Calculation Refactoring

## Problem
The codebase had two major issues:

1. **Hacky scale calculation**: `calculateProportionalScale()` used hardcoded magic numbers (`42000`, `0.25`) that were empirically derived for France but not truly generic
2. **Bounds duplication**: Every territory had bounds defined twice:
   - Once inline in `calculateProportionalScale([bounds], 'mercator')`
   - Once in the `bounds` property

## Solution
Removed the approximation and now use D3's actual projection fitting logic:

### Changes Made

#### 1. Updated `TerritoryConfig` interface
- **Removed**: `scale: number` (required property)
- Scale is now calculated dynamically at runtime

#### 2. Replaced `calculateProportionalScale()` with `calculateScaleFromBounds()`
- Uses D3's `projection.fitSize()` to calculate proper scale
- Takes a projection instance, bounds, and target size
- Returns the actual scale D3 would use for fitting those bounds

#### 3. Updated `CustomCompositeProjection.initialize()`
- Now calls `this.calculateScaleFromBounds()` for each territory
- Calculates scale dynamically based on projection type and bounds
- No more hardcoded approximations

#### 4. Cleaned up `france-territories.ts`
- **Removed** all `scale: calculateProportionalScale(...)` lines
- **Removed** duplicate bounds (they were in both the function call and the config)
- Bounds now defined only once in the `bounds` property
- Simplified MAINLAND_FRANCE config

### Benefits

✅ **No more magic numbers**: Uses D3's actual fitting logic
✅ **No bounds duplication**: Single source of truth
✅ **Truly generic**: Works for any country/region without tuning
✅ **More maintainable**: Easier to understand and modify
✅ **More accurate**: D3's algorithm is more sophisticated than our approximation

### Example Before vs After

**Before:**
```typescript
{
  code: 'FR-GP',
  name: 'Guadeloupe',
  scale: calculateProportionalScale([[-61.81, 15.83], [-61.0, 16.52]], 'mercator'), // ← bounds here
  bounds: [[-61.81, 15.83], [-61.0, 16.52]], // ← AND here!
}
```

**After:**
```typescript
{
  code: 'FR-GP',
  name: 'Guadeloupe',
  bounds: [[-61.81, 15.83], [-61.0, 16.52]], // ← only once!
  // scale calculated dynamically from bounds at runtime
}
```

### Migration Notes

- No breaking changes for external APIs
- Territory configurations are simpler and cleaner
- Scale is computed when projections are initialized
- All proportions remain accurate (actually more accurate now)

## Technical Details

The new `calculateScaleFromBounds()` method:
1. Creates a GeoJSON polygon from the bounds
2. Uses D3's `projection.fitSize([width, height], geojson)`
3. Extracts the calculated scale value
4. Returns it for use in the projection setup

This ensures territories are sized proportionally based on their actual geographic extent, with no approximations or projection-specific hacks.
