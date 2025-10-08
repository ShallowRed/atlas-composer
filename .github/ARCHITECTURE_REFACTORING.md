# Architecture Refactoring Summary

## Problem Statement
The client-side application (`GeoDataService.ts`) was handling complex territory extraction logic at runtime:
- Extracting 5 DOM territories from France (250) MultiPolygon
- Creating FR-PF-2 duplicate from FR-PF geometry
- ~200 lines of extraction code running on every data load

## Solution: Backend Pre-Processing
Move all territory extraction and splitting to **build-time** in `scripts/prepare-geodata.js`.

---

## Architecture Change

### Before (Current)
```
Natural Earth (7 features)
    ↓
Client loads TopoJSON
    ↓
GeoDataService.extractOverseasFromMainland()
    → Extract DOM from France (250)
    → Special handling for FR-PF-2
    ↓
13 territories ready to render
```

### After (Proposed)
```
Natural Earth (7 features)
    ↓
scripts/prepare-geodata.js
    → Extract DOM from France (250)
    → Duplicate FR-PF → FR-PF-2
    ↓
Clean TopoJSON (13 features)
    ↓
Client loads TopoJSON
    ↓
GeoDataService (simple conversion)
    ↓
13 territories ready to render
```

---

## Expected Results

### Data Structure
**Input** (Natural Earth): 7 territories
**Output** (Processed): 13 territories

### Code Simplification

**GeoDataService.ts changes**:
- Remove `extractMainlandRegion()` (~40 lines)
- Remove `extractOverseasFromMainland()` (~75 lines)
- Simplify `getMainLandData()` (~30 lines removed)
- Simplify `getOverseasData()` (~50 lines removed)
- **Total**: ~195 lines deleted

---

## Current Status

### Completed ✅
- Territory reconciliation analysis
- Architecture design
- Implementation guide created
- Client-side configs updated
- FR-PF-2 added to application

### Remaining ⏳
- Backend script implementation
- Data regeneration
- Client simplification
- Testing

---

## Next Steps

See `.github/BACKEND_PREPROCESSING_GUIDE.md` for implementation details.

**Priority**: Update `scripts/prepare-geodata.js` with extraction logic.
