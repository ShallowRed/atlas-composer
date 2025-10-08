# Scale Fix Summary: Custom Composite Projection

## Problem
Overseas territories were displaying at incorrect sizes in custom composite projection mode:
- La Réunion appeared larger than Guadeloupe (incorrect)
- Territories were not proportionally sized relative to mainland France
- The automatic scale calculation was fundamentally flawed

## Root Cause Analysis

### Previous Approach (WRONG)
```typescript
// Tried to calculate proportional scales from geographic extent
const territoryExtent = calculateGeographicExtent(bounds)
const scale = (BASE_CONSTANT / territoryExtent) * multiplier
```

**Problems:**
1. Different projection types (Mercator vs Conic) have different scale behaviors
2. Trying to compensate with a single multiplier (0.25, then 0.1, then 0.6) doesn't work
3. No way to manually adjust for visual composition needs
4. Resulted in incorrect relative sizes

### d3-composite-projections Approach (CORRECT)
```javascript
// From conicConformalFrance.js
europe.scale(_)
guyane.scale(_ * 0.6)
martinique.scale(_ * 1.6)
guadeloupe.scale(_ * 1.4)
reunion.scale(_ * 1.2)
```

**Key Insights:**
1. Uses a **single reference scale** for all projections
2. Each territory has a **manually-tuned multiplier**
3. Multiplier = 1.0 means **true geographic proportions**
4. Multiplier > 1.0 = **larger for visibility** (small islands)
5. Multiplier < 1.0 = **smaller for composition** (large territories)

## Solution Implemented

### 1. Added `baseScaleMultiplier` to Territory Type
```typescript
export interface TerritoryConfig {
  // ... existing fields
  baseScaleMultiplier?: number // Scale multiplier relative to mainland (default: 1.0)
}
```

### 2. Updated Territory Data with Multipliers from d3-composite-projections
```typescript
// src/data/territories/france.data.ts
{
  code: 'FR-GP',
  name: 'Guadeloupe',
  // ...
  baseScaleMultiplier: 1.4, // From d3-composite-projections
},
{
  code: 'FR-RE',
  name: 'La Réunion',
  // ...
  baseScaleMultiplier: 1.2, // From d3-composite-projections
},
```

### 3. Refactored CustomCompositeProjection to Use Unified Base Scale
```typescript
// src/services/CustomCompositeProjection.ts
private initialize() {
  const REFERENCE_SCALE = 2800 // Same reference for all territories

  // Mainland always uses reference scale
  mainlandProjection.scale(REFERENCE_SCALE)

  // Overseas territories use reference * baseScaleMultiplier
  overseasTerritories.forEach((territory) => {
    const baseMultiplier = territory.baseScaleMultiplier ?? 1.0
    const territoryScale = REFERENCE_SCALE * baseMultiplier
    projection.scale(territoryScale)
  })
}
```

### 4. Removed Incorrect Scale Calculation Methods
Deleted:
- `calculateProportionalScale()` - flawed approach
- `calculateGeographicExtent()` - no longer needed
- `getProjectionFamily()` - no longer needed

## Results

### Scale Comparison (NEW)
```
Territory                    Base Multiplier    Final Scale
France Métropolitaine        1.0                2800
Saint-Martin                 5.0                14000  (tiny island, 5x for visibility)
Guadeloupe                   1.4                3920   ✓
Martinique                   1.6                4480
Guyane                       0.6                1680   (large, reduced)
Saint-Pierre-et-Miquelon     1.3                3640
Mayotte                      1.6                4480
La Réunion                   1.2                3360   ✓ SMALLER than Guadeloupe!
TAAF                         1.0                2800   (proportional)
Nouvelle-Calédonie           0.3                840    (very large, heavily reduced)
Wallis-et-Futuna             2.7                7560
Polynésie française          0.5                1400   (large archipelago, reduced)
Saint-Barthélemy             5.0                14000  (tiny island, 5x for visibility)
```

### Key Improvements
✅ **La Réunion (3360) < Guadeloupe (3920)** - Correct proportions!
✅ All territories now use the same reference scale (2800)
✅ Multipliers from d3-composite-projections ensure proper composition
✅ Users can still adjust with scaleMultiplier controls (separate from base)
✅ Easy to add new regions - just set appropriate baseScaleMultiplier

## How It Works

1. **Reference Scale**: All projections start with the same base scale (2800)
2. **Base Multiplier**: Territory data specifies artistic adjustment (from d3-composite-projections)
3. **User Multiplier**: UI controls provide additional user adjustments (starts at 1.0)
4. **Final Scale**: `REFERENCE_SCALE * baseScaleMultiplier * userScaleMultiplier`

## For Adding New Regions

When adding a new region, set `baseScaleMultiplier` in territory data:
- **1.0**: True geographic proportions (good starting point)
- **0.3-0.8**: Large territories that need to be smaller
- **1.2-2.0**: Small territories that need better visibility
- **3.0-5.0**: Very small islands/territories

Reference d3-composite-projections library for proven values if available.

## Files Modified
- ✅ `src/types/territory.d.ts` - Added baseScaleMultiplier field
- ✅ `src/data/territories/france.data.ts` - Added multipliers to all territories
- ✅ `src/services/CustomCompositeProjection.ts` - Refactored to unified base scale
- ✅ Build: Successful (440.71 kB, 154.15 kB gzipped)
- ✅ Tests: No errors

## Verification
Run `node verify-new-scales.js` to see the scale calculations.
