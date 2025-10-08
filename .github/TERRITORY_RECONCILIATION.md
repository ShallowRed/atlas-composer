# Territory Reconciliation Analysis

## Overview
This document reconciles three sources of French territory data:
1. **d3-composite-projections** (reference implementation)
2. **scripts/configs/france.js** (data fetching configuration)
3. **src/data/territories/france.data.ts** (application configuration)

## Territory Matrix

| Territory | Code | d3-cp | fetch script | app config | Natural Earth ID | ISO |
|-----------|------|-------|--------------|------------|------------------|-----|
| France Métropolitaine | FR-MET | ✅ (europe) | ✅ | ✅ | 250 | FRA |
| Guyane | FR-GF | ✅ | ❌ | ✅ | ??? | GUF |
| Martinique | FR-MQ | ✅ | ❌ | ✅ | ??? | MTQ |
| Guadeloupe | FR-GP | ✅ | ❌ | ✅ | ??? | GLP |
| Saint-Barthélemy | FR-BL | ✅ | ❌ | ✅ | ??? | BLM |
| Saint-Pierre-et-Miquelon | FR-PM | ✅ | ✅ | ✅ | 666 | SPM |
| Mayotte | FR-YT | ✅ | ❌ | ✅ | ??? | MYT |
| La Réunion | FR-RE | ✅ | ❌ | ✅ | ??? | REU |
| Nouvelle-Calédonie | FR-NC | ✅ | ✅ | ✅ | 540 | NCL |
| Wallis-et-Futuna | FR-WF | ✅ | ✅ | ✅ | 876 | WLF |
| Polynésie française | FR-PF | ✅ (2x) | ✅ | ✅ (1x) | 258 | PYF |
| Polynésie française 2 | FR-PF-2 | ✅ (polynesie2) | N/A | ❌ | 258 | PYF |
| Saint-Martin | FR-MF | ❌ | ✅ | ✅ | 663 | MAF |
| TAAF | FR-TF | ❌ | ✅ | ✅ | 260 | ATF |

## Summary

### In d3-composite-projections (11 territories, 12 projections)
1. ✅ Europe (mainland)
2. ✅ Guyane
3. ✅ Martinique
4. ✅ Guadeloupe
5. ✅ Saint-Barthélemy
6. ✅ Saint-Pierre-et-Miquelon
7. ✅ Mayotte
8. ✅ La Réunion
9. ✅ Nouvelle-Calédonie
10. ✅ Wallis-et-Futuna
11. ✅ Polynésie française (polynesie - main islands)
12. ✅ Polynésie française (polynesie2 - Marquesas/remote islands)

### In fetch script (7 territories)
1. ✅ France métropolitaine (250)
2. ✅ Saint-Pierre-et-Miquelon (666)
3. ✅ Wallis-et-Futuna (876)
4. ✅ Polynésie française (258)
5. ✅ Nouvelle-Calédonie (540)
6. ✅ Terres australes françaises (260)
7. ✅ Saint-Martin (663)

### In app config (12 territories)
All 12 territories from d3-cp + Saint-Martin + TAAF

## Issues Identified

### 1. Missing from fetch script (5 DOM - Départements d'Outre-Mer)
These are **French departments**, not collectivities, and should have Natural Earth IDs:
- ❌ **Guadeloupe** (FR-GP) - ISO: GLP
- ❌ **Martinique** (FR-MQ) - ISO: MTQ
- ❌ **Guyane** (FR-GF) - ISO: GUF
- ❌ **La Réunion** (FR-RE) - ISO: REU
- ❌ **Mayotte** (FR-YT) - ISO: MYT

### 2. Missing from fetch script
- ❌ **Saint-Barthélemy** (FR-BL) - ISO: BLM

### 3. Not in d3-composite-projections
- ⚠️ **Saint-Martin** (FR-MF) - In fetch script and app, but d3-cp only has Saint-Barthélemy
- ⚠️ **TAAF** (FR-TF) - In fetch script and app, but NOT in d3-cp

### 4. Dual projection not implemented
- ⚠️ **Polynésie française 2** (polynesie2) - Marquesas and remote islands
  - Center: [-150.55, -17.11] (same as polynesie)
  - Scale: 0.06 (much smaller than polynesie's 0.5)
  - Translate: [x + 0.11 * k, y + 0.045 * k]
  - ClipExtent: y: 0.033-0.06 (between Wallis-et-Futuna and main Polynésie)

## Natural Earth Data Structure - CONFIRMED ✅

The Natural Earth dataset for France includes:

### Separate Features (7 territories)
These have their own geometry entries in the TopoJSON:
1. ✅ France métropolitaine (250) - **Contains 10 polygons including DOM**
2. ✅ Saint-Pierre-et-Miquelon (666)
3. ✅ Wallis-et-Futuna (876)
4. ✅ Saint-Martin (663)
5. ✅ Polynésie française (258)
6. ✅ Nouvelle-Calédonie (540)
7. ✅ Terres australes françaises (260)

### Embedded in France Métropolitaine (250) - 5 DOM
These are **polygons within the France (250) MultiPolygon** and must be extracted:
1. ✅ **Mayotte** (Polygon 3: lon 45, lat -12)
2. ✅ **La Réunion** (Polygon 4: lon 55, lat -21)
3. ✅ **Martinique** (Polygon 5: lon -61, lat 14)
4. ✅ **Guadeloupe** (Polygons 6-8: lon -61, lat 15-16)
5. ✅ **Guyane** (Polygon 9: lon -54 to -51, lat 2-5)

### Not in Natural Earth Dataset
- ❌ **Saint-Barthélemy** (FR-BL) - Too small or part of Guadeloupe in Natural Earth

**Key Insight**: The 5 French overseas departments (DOM) are integral parts of France and share the same Natural Earth ID (250), but as separate polygons in the MultiPolygon geometry. This is why `extractOverseasFromMainland()` exists in `GeoDataService.ts`.

## Recommended Architecture: Backend Pre-Processing

### Current Problem
- Client-side extraction logic (`extractOverseasFromMainland()`) adds complexity
- FR-PF-2 needs special handling to reuse FR-PF geometry
- DOM territories embedded in France (250) require runtime extraction
- Mixing data preparation concerns with rendering concerns

### Proposed Solution: Pre-Process in Backend Scripts
**Goal**: Generate clean, ready-to-render TopoJSON with all territories as separate features

#### Backend (scripts/prepare-geodata.js)
```
Natural Earth Download
    ↓
Extract DOM from France (250) MultiPolygon
    ↓
Duplicate FR-PF → FR-PF-2 (same geometry)
    ↓
Enrich all territories with metadata
    ↓
Generate clean TopoJSON with 13 separate features
```

#### Client (GeoDataService.ts)
```
Load TopoJSON → Convert to GeoJSON → Render
(No extraction, no special cases, pure data loading)
```

### Implementation Plan

#### 1. Update `scripts/prepare-geodata.js`
Add territory extraction and splitting logic:
- **Extract 5 DOM** from France (250) MultiPolygon into separate features
  - FR-YT (Mayotte) - Polygon 3
  - FR-RE (La Réunion) - Polygon 4
  - FR-MQ (Martinique) - Polygon 5
  - FR-GP (Guadeloupe) - Polygons 6-8
  - FR-GF (Guyane) - Polygon 9
- **Keep mainland** as FR-MET (Polygons 0-2 only)
- **Duplicate FR-PF** → FR-PF-2 (same geometry, different code)
- **Result**: 13 territories instead of 7

#### 2. Update `scripts/configs/france.js`
Add all territories including DOM:
```javascript
territories: {
  250: { name: 'France métropolitaine', code: 'FR-MET', iso: 'FRA' },
  // Add DOM with virtual IDs or keep 250 and split by bounds
  '250-YT': { name: 'Mayotte', code: 'FR-YT', iso: 'MYT', extractFrom: 250, bounds: [[44.98, -13.0], [45.3, -12.64]] },
  '250-RE': { name: 'La Réunion', code: 'FR-RE', iso: 'REU', extractFrom: 250, bounds: [[55.22, -21.39], [55.84, -20.87]] },
  '250-MQ': { name: 'Martinique', code: 'FR-MQ', iso: 'MTQ', extractFrom: 250, bounds: [[-61.23, 14.39], [-60.81, 14.88]] },
  '250-GP': { name: 'Guadeloupe', code: 'FR-GP', iso: 'GLP', extractFrom: 250, bounds: [[-61.81, 15.83], [-61.0, 16.52]] },
  '250-GF': { name: 'Guyane', code: 'FR-GF', iso: 'GUF', extractFrom: 250, bounds: [[-54.6, 2.1], [-51.6, 5.8]] },
  666: { name: 'Saint-Pierre-et-Miquelon', code: 'FR-PM', iso: 'SPM' },
  876: { name: 'Wallis-et-Futuna', code: 'FR-WF', iso: 'WLF' },
  663: { name: 'Saint-Martin', code: 'FR-MF', iso: 'MAF' },
  258: { name: 'Polynésie française', code: 'FR-PF', iso: 'PYF' },
  '258-2': { name: 'Polynésie française (îles éloignées)', code: 'FR-PF-2', iso: 'PYF', duplicateFrom: 258 },
  540: { name: 'Nouvelle-Calédonie', code: 'FR-NC', iso: 'NCL' },
  260: { name: 'Terres australes françaises', code: 'FR-TF', iso: 'ATF' },
}
```

#### 3. Simplify `GeoDataService.ts`
**Remove**:
- ❌ `extractOverseasFromMainland()` method
- ❌ `extractMainlandRegion()` method
- ❌ Special FR-PF-2 handling in `getOverseasData()`
- ❌ Complex extraction logic in `getOverseasData()`

**Keep**:
- ✅ Simple data loading and conversion
- ✅ Area/bounds calculation
- ✅ Feature collection assembly

**Result**: ~150 lines of code removed, much simpler service

#### 4. Update Output Structure
Current (7 features):
```json
{
  "objects": {
    "territories": {
      "geometries": [
        { "id": "250", "properties": { "code": "FR-MET" } }, // Contains 10 polygons!
        { "id": "666", "properties": { "code": "FR-PM" } },
        { "id": "876", "properties": { "code": "FR-WF" } },
        { "id": "663", "properties": { "code": "FR-MF" } },
        { "id": "258", "properties": { "code": "FR-PF" } },
        { "id": "540", "properties": { "code": "FR-NC" } },
        { "id": "260", "properties": { "code": "FR-TF" } }
      ]
    }
  }
}
```

Proposed (13 features):
```json
{
  "objects": {
    "territories": {
      "geometries": [
        { "id": "250", "properties": { "code": "FR-MET" } }, // Only mainland polygons
        { "id": "250-YT", "properties": { "code": "FR-YT" } }, // Extracted
        { "id": "250-RE", "properties": { "code": "FR-RE" } }, // Extracted
        { "id": "250-MQ", "properties": { "code": "FR-MQ" } }, // Extracted
        { "id": "250-GP", "properties": { "code": "FR-GP" } }, // Extracted
        { "id": "250-GF", "properties": { "code": "FR-GF" } }, // Extracted
        { "id": "666", "properties": { "code": "FR-PM" } },
        { "id": "876", "properties": { "code": "FR-WF" } },
        { "id": "663", "properties": { "code": "FR-MF" } },
        { "id": "258", "properties": { "code": "FR-PF" } }, // Original
        { "id": "258-2", "properties": { "code": "FR-PF-2" } }, // Duplicate
        { "id": "540", "properties": { "code": "FR-NC" } },
        { "id": "260", "properties": { "code": "FR-TF" } }
      ]
    }
  }
}
```

### Benefits of Backend Pre-Processing

1. **✅ Separation of Concerns**
   - Data preparation → Backend scripts (run once)
   - Data rendering → Client app (runtime)

2. **✅ Performance**
   - No runtime extraction/splitting
   - No polygon analysis in browser
   - Faster initial load

3. **✅ Simplicity**
   - Client code becomes trivial: load → render
   - Easy to understand and maintain
   - Fewer edge cases to handle

4. **✅ Correctness**
   - Pre-validated territory extraction
   - Consistent output every time
   - Easy to debug in isolation

5. **✅ Flexibility**
   - Can add more extraction rules easily
   - Can generate multiple resolutions
   - Can add territory variants (e.g., FR-PF-3 for even more remote islands)

6. **✅ Documentation**
   - Output structure is self-documenting
   - Each feature has explicit code
   - No hidden extraction logic

### Saint-Barthélemy Handling

**Issue**: Not in Natural Earth data (too small)

**Options**:
1. **Remove from config** - Simplest, accept limitation
2. **Use placeholder** - Empty geometry with metadata
3. **Find high-res source** - Natural Earth 10m or other dataset
4. **Combine with Guadeloupe** - Show as part of GP with note

**Recommendation**: Option 1 (remove) or Option 2 (placeholder with warning)

### Migration Path

1. ✅ **Phase 1**: Update reconciliation document (this document)
2. ⏳ **Phase 2**: Update `scripts/prepare-geodata.js` with extraction logic
3. ⏳ **Phase 3**: Update `scripts/configs/france.js` with DOM configs
4. ⏳ **Phase 4**: Regenerate data files (`node scripts/prepare-geodata.js france`)
5. ⏳ **Phase 5**: Simplify `GeoDataService.ts` (remove extraction methods)
6. ⏳ **Phase 6**: Test rendering with new structure
7. ⏳ **Phase 7**: Update documentation and examples

### Testing Strategy

1. **Verify extraction**: Compare extracted territories with current runtime extraction
2. **Verify geometry**: Ensure no polygon loss during extraction
3. **Verify rendering**: All territories render in correct positions
4. **Verify areas**: Territory areas match expected values
5. **Verify FR-PF-2**: Duplicate has same geometry as FR-PF

### Long-term Considerations

1. **Other regions**: Apply same pattern to EU, Spain, Portugal configs
2. **Territory variants**: Support multiple projections per territory (like FR-PF/FR-PF-2)
3. **Custom geometries**: Support territory modifications (clipping, simplification)
4. **Metadata enrichment**: Add more territory attributes during preparation

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Done | Reconciliation document updated with new architecture |
| Phase 2 | ⏳ TODO | Update `scripts/prepare-geodata.js` with extraction logic |
| Phase 3 | ⏳ TODO | Update `scripts/configs/france.js` with DOM configurations |
| Phase 4 | ⏳ TODO | Regenerate data files with new structure |
| Phase 5 | ⏳ TODO | Simplify `GeoDataService.ts` (remove extraction) |
| Phase 6 | ⏳ TODO | Test rendering with pre-processed data |
| Phase 7 | ⏳ TODO | Update documentation |

## Files to Modify

### Backend (Data Preparation)
- `scripts/prepare-geodata.js` - Add territory extraction/splitting logic
- `scripts/configs/france.js` - Add DOM and FR-PF-2 configurations
- Output: `src/public/data/france-territories-*.json` - 13 features instead of 7

### Client (Simplification)
- `src/services/GeoDataService.ts` - Remove ~150 lines of extraction logic
- `src/data/territories/france.data.ts` - Already updated with FR-PF-2 ✅
- `src/config/regions/france.config.ts` - Already updated with FR-PF-2 ✅

### Documentation
- `.github/TERRITORY_DATA_ARCHITECTURE.md` - Update to reflect new flow
- `.github/CENTER_CORRECTIONS.md` - Add note about backend processing
- `README.md` - Update territory count and processing description

## References
- Natural Earth: https://www.naturalearthdata.com/
- d3-composite-projections: https://github.com/rveciana/d3-composite-projections
- French overseas territories: https://en.wikipedia.org/wiki/Overseas_France
- TopoJSON specification: https://github.com/topojson/topojson-specification
