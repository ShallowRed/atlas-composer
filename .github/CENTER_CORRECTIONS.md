# Territory Center Corrections

## Overview
This document tracks all territory center coordinate corrections to match d3-composite-projections exactly.

## Source Analysis
Reference: `node_modules/d3-composite-projections/src/conicConformalFrance.js`

The d3-composite-projections library defines 11 overseas territories (not 12):
- **Included**: Guyane, Martinique, Guadeloupe, Saint-Barthélemy, Saint-Pierre-et-Miquelon, Mayotte, Réunion, Nouvelle-Calédonie, Wallis-et-Futuna, Polynésie française (with 2 projections: polynesie + polynesie2)
- **NOT included**: TAAF, Saint-Martin

## Corrections Applied

### 1. Guadeloupe (FR-GP)
- **Before**: [-61.551, 16.265]
- **After**: [-61.46, 16.14]
- **Source**: d3-cp line 61 `guadeloupe = mercator().center([-61.46, 16.14])`

### 2. Martinique (FR-MQ)
- **Before**: [-61.024, 14.642]
- **After**: [-61.03, 14.67]
- **Source**: d3-cp line 59 `martinique = mercator().center([-61.03, 14.67])`

### 3. Guyane (FR-GF)
- **Before**: [-53.1, 3.9]
- **After**: [-53.2, 3.9]
- **Source**: d3-cp line 57 `guyane = mercator().center([-53.2, 3.9])`

### 4. Saint-Pierre-et-Miquelon (FR-PM)
- **Before**: [-56.327, 46.885]
- **After**: [-56.23, 46.93]
- **Source**: d3-cp line 65 `stPierreMiquelon = mercator().center([-56.23, 46.93])`

### 5. Mayotte (FR-YT)
- **Before**: [45.166, -12.827]
- **After**: [45.16, -12.8]
- **Source**: d3-cp line 67 `mayotte = mercator().center([45.16, -12.8])`

### 6. La Réunion (FR-RE)
- **Before**: [55.536, -21.115]
- **After**: [55.52, -21.13]
- **Source**: d3-cp line 69 `reunion = mercator().center([55.52, -21.13])`

### 7. Wallis-et-Futuna (FR-WF) ⚠️ CRITICAL FIX
- **Before**: [-176.176, -13.768]
- **After**: [-178.1, -14.3]
- **Source**: d3-cp line 73 `wallisFutuna = mercator().center([-178.1, -14.3])`
- **Impact**: Old center caused overlap with mainland France

### 8. Nouvelle-Calédonie (FR-NC) ⚠️ CRITICAL FIX
- **Before**: [165.618, -20.904]
- **After**: [165.8, -21.07]
- **Source**: d3-cp line 71 `nouvelleCaledonie = mercator().center([165.8, -21.07])`
- **Impact**: Old center caused misalignment

### 9. Polynésie française (FR-PF) ⚠️ CRITICAL FIX
- **Before**: [-149.566, -17.679]
- **After**: [-150.55, -17.11]
- **Source**: d3-cp lines 75-76
  - `polynesie = mercator().center([-150.55, -17.11])` (scale 0.5)
  - `polynesie2 = mercator().center([-150.55, -17.11])` (scale 0.06)
- **Impact**: Old center caused misalignment, dual projection not yet implemented

### 10. Saint-Barthélemy (FR-BL)
- **Before**: [-62.85, 17.90]
- **After**: [-62.85, 17.92]
- **Source**: d3-cp line 63 `saintBarthelemy = mercator().center([-62.85, 17.92])`

### 11. Saint-Martin (FR-MF) ⚠️ NOT IN D3-CP
- **Current**: [-63.082, 18.067]
- **Source**: Custom (d3-composite-projections only includes Saint-Barthélemy)
- **Note**: Uses same scale multiplier (5.0) as Saint-Barthélemy

### 12. TAAF (FR-TF) ⚠️ NOT IN D3-CP
- **Current**: [69.348, -49.280]
- **Scale**: baseScaleMultiplier 0.1 (reduced from 1.0)
- **Source**: Custom (d3-composite-projections does NOT include TAAF)
- **Note**: Not part of standard d3-cp, included for completeness

## Geographic Accuracy Impact

All centers now match d3-composite-projections exactly, ensuring:
1. ✅ Proper geographic alignment
2. ✅ No overlaps between territories
3. ✅ Consistent visual composition with d3-cp reference
4. ✅ Correct relative positioning

## Known Limitations

### Polynésie française Dual Projection
d3-composite-projections uses TWO projections for Polynésie française:
- **polynesie** (scale 0.5): Main islands (Society Islands)
  - clipExtent y: 0.06-0.0864
  - translate: [x + 0.115 * k, y + 0.075 * k]
- **polynesie2** (scale 0.06): Remote islands (Marquesas, Tuamotu, Gambier, Austral)
  - clipExtent y: 0.033-0.06
  - translate: [x + 0.11 * k, y + 0.045 * k]

**Current Implementation**: Only shows main islands (polynesie projection)
**Future Enhancement**: Implement dual projection system for complete coverage

## References
- d3-composite-projections: https://github.com/rveciana/d3-composite-projections
- conicConformalFrance.js: node_modules/d3-composite-projections/src/conicConformalFrance.js

## Related Documentation
- [SCALE_FIX_SUMMARY.md](.github/SCALE_FIX_SUMMARY.md)
- [POSITIONING_FIX_SUMMARY.md](.github/POSITIONING_FIX_SUMMARY.md)
- [COMPLETE_PROJECTION_REFACTORING.md](.github/COMPLETE_PROJECTION_REFACTORING.md)
