# Fix: Territory Sizing After Scale Refactoring

## Problem
After removing the hardcoded `scale` property and trying to calculate it dynamically, territories became tiny and spaced far apart.

## Root Cause
The initial fix used `projection.fitSize([500, 500])` for all territories, which made them all the **same pixel size** (500px). This defeated the purpose of proportional sizing - territories should be sized **relative to each other** based on their geographic extent.

## Solution
Restored the original proportional scaling logic, but now computed dynamically:

### Original Formula (was hardcoded):
```javascript
// For Conic projections (mainland)
scale = 42000 / maxSpan

// For Mercator projections (overseas)
scale = (42000 / maxSpan) * 0.25
```

### New Implementation (dynamic):
```typescript
private calculateProportionalScale(
  projection: GeoProjection,
  bounds: [[number, number], [number, number]],
  _referenceExtent: number,
): number {
  const territoryExtent = this.calculateGeographicExtent(bounds)
  const projectionFamily = this.getProjectionFamily(projection)
  const BASE_CONSTANT = 42000

  if (projectionFamily === 'conic') {
    return BASE_CONSTANT / territoryExtent
  } else {
    // Mercator compensation: 0.25 multiplier
    return (BASE_CONSTANT / territoryExtent) * 0.25
  }
}
```

### Key Changes in CustomCompositeProjection.ts:

1. **Added `calculateGeographicExtent()`** - Computes max span of bounds
2. **Added `getProjectionFamily()`** - Detects if projection is conic or mercator
3. **Updated `calculateProportionalScale()`** - Uses the original formula dynamically
4. **Modified `initialize()`** - Calculates mainland extent as reference (for future use)

### Why This Works:

The formula `scale = 42000 / maxSpan` ensures:
- **Larger territories** (bigger maxSpan) → **smaller scale** → appropriate pixel size
- **Smaller territories** (smaller maxSpan) → **larger scale** → still visible
- **Proportional sizing**: A territory with 5° span will be 1/3 the size of one with 15° span

The `0.25` multiplier for Mercator compensates for how Mercator projections render ~4x larger than Conic projections at the same scale value.

## Result
✅ Territories now properly sized relative to their geographic extent
✅ No more tiny maps with huge spacing
✅ Same visual appearance as before, but without hardcoded scales
✅ Cleaner configuration (no duplicate bounds)
