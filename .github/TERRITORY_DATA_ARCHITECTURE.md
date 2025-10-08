# French Territory Data Architecture

## Data Flow Overview

```
Natural Earth Dataset (france-territories-50m.json)
    ↓
GeoDataService.processTerritoriesData()
    ↓
extractOverseasFromMainland() [for embedded DOM]
    ↓
Application Territory Configuration (france.data.ts)
```

## Natural Earth Data Structure

### 7 Separate TopoJSON Features
1. **France métropolitaine** (ID 250) - MultiPolygon with 10 polygons
   - Polygons 0-2: Mainland + Corsica + islands
   - **Polygons 3-9: 5 DOM embedded** (see below)
2. Saint-Pierre-et-Miquelon (ID 666)
3. Wallis-et-Futuna (ID 876)
4. Saint-Martin (ID 663)
5. Polynésie française (ID 258)
6. Nouvelle-Calédonie (ID 540)
7. Terres australes françaises (ID 260)

### 5 DOM Embedded in France (250)
These polygons are part of the France (250) MultiPolygon:

| Polygon | Territory | Code | Bounds | Status |
|---------|-----------|------|--------|--------|
| 3 | Mayotte | FR-YT | lon[45.04, 45.22] lat[-12.98, -12.65] | ✅ Extracted |
| 4 | La Réunion | FR-RE | lon[55.23, 55.84] lat[-21.37, -20.86] | ✅ Extracted |
| 5 | Martinique | FR-MQ | lon[-61.22, -60.83] lat[14.43, 14.87] | ✅ Extracted |
| 6-8 | Guadeloupe | FR-GP | lon[-61.79, -61.17] lat[15.89, 16.51] | ✅ Extracted (3 polygons) |
| 9 | Guyane | FR-GF | lon[-54.62, -51.65] lat[2.12, 5.78] | ✅ Extracted |

## Extraction Process

### GeoDataService.extractOverseasFromMainland()
```typescript
// Iterate through France (250) MultiPolygon
for each polygon in france.geometry.coordinates:
  1. Calculate polygon bounds (minLon, maxLon, minLat, maxLat)
  2. Match against overseasTerritories bounds from config
  3. If match found and not duplicate:
     - Create separate Feature with territory properties
     - Calculate area from geometry
     - Add to extracted territories list
```

### Matching Logic
- Uses **tolerance = 0.1** for floating point comparison
- Checks if polygon bounds fall **within** configured territory bounds
- Prevents duplicates using `addedCodes` Set
- Guadeloupe matches 3 polygons (archipelago)

## Territory Configuration Reconciliation

### In d3-composite-projections (11 unique territories)
1. ✅ europe (mainland)
2. ✅ guyane
3. ✅ martinique
4. ✅ guadeloupe
5. ✅ saintBarthelemy
6. ✅ stPierreMiquelon
7. ✅ mayotte
8. ✅ reunion
9. ✅ nouvelleCaledonie
10. ✅ wallisFutuna
11. ✅ polynesie + polynesie2 (2 projections, 1 territory)

### In Natural Earth Dataset
| Territory | NE ID | Separate? | Embedded in 250? | d3-cp |
|-----------|-------|-----------|------------------|-------|
| France métropolitaine | 250 | ✅ | - | ✅ europe |
| Guyane | - | ❌ | ✅ Polygon 9 | ✅ guyane |
| Martinique | - | ❌ | ✅ Polygon 5 | ✅ martinique |
| Guadeloupe | - | ❌ | ✅ Polygons 6-8 | ✅ guadeloupe |
| Mayotte | - | ❌ | ✅ Polygon 3 | ✅ mayotte |
| La Réunion | - | ❌ | ✅ Polygon 4 | ✅ reunion |
| Saint-Pierre-et-Miquelon | 666 | ✅ | ❌ | ✅ stPierreMiquelon |
| Wallis-et-Futuna | 876 | ✅ | ❌ | ✅ wallisFutuna |
| Polynésie française | 258 | ✅ | ❌ | ✅ polynesie (+polynesie2) |
| Nouvelle-Calédonie | 540 | ✅ | ❌ | ✅ nouvelleCaledonie |
| Saint-Martin | 663 | ✅ | ❌ | ❌ NOT in d3-cp |
| TAAF | 260 | ✅ | ❌ | ❌ NOT in d3-cp |
| Saint-Barthélemy | - | ❌ | ❌ | ✅ saintBarthelemy |

### In Application Config (france.data.ts) - 12 territories
All of the above PLUS:
- ⚠️ Saint-Barthélemy (FR-BL) - **NOT in Natural Earth data** (too small for 50m resolution)

## Key Insights

### Why extractOverseasFromMainland Exists
French overseas departments (DOM) are **legally part of France** (integral territories), so Natural Earth includes them in the main France feature (ID 250) rather than as separate countries. This is correct from a political geography perspective but requires extraction for our composite projection needs.

### DOM vs COM
- **DOM** (Départements d'Outre-Mer): Integral parts of France, embedded in NE ID 250
  - Guadeloupe, Martinique, Guyane, La Réunion, Mayotte
- **COM** (Collectivités d'Outre-Mer): Separate administrative status, separate NE IDs
  - Saint-Pierre-et-Miquelon, Wallis-et-Futuna, Polynésie française, Nouvelle-Calédonie
  - Saint-Martin (also COM but not in d3-cp)

### Saint-Barthélemy Issue
- ✅ In d3-composite-projections (scale 5.0)
- ✅ In application config (france.data.ts)
- ❌ NOT in Natural Earth 50m dataset (too small)
- **Resolution**: Either fetch 10m data or remove from configuration

### TAAF Issue
- ❌ NOT in d3-composite-projections
- ✅ In Natural Earth (ID 260)
- ✅ In application config (custom addition, scale 0.1)
- **Status**: Acceptable custom addition for completeness

### Polynésie française Dual Projection
- d3-cp uses TWO projections:
  - polynesie (scale 0.5) - Main islands
  - polynesie2 (scale 0.06) - Marquesas/remote islands
- Natural Earth has ONE feature (ID 258)
- Application needs to handle dual projection rendering

## Data Validation

### Verification Script
Run `node scripts/verify-dom-extraction.cjs` to verify:
- ✅ All 5 DOM correctly matched to configured bounds
- ✅ No missing territories
- ✅ No duplicate extractions
- ✅ Bounds tolerance (0.1) appropriate

### Expected Output
```
✅ All 5 DOM territories successfully matched!
✅ extractOverseasFromMainland() should work correctly
```

## Next Steps

1. ✅ **DOM extraction verified** - Working correctly
2. ⚠️ **Decide on Saint-Barthélemy**:
   - Option A: Fetch Natural Earth 10m data (may include Saint-Barthélemy)
   - Option B: Remove from configuration
   - Option C: Accept missing geometry
3. ⏳ **Implement polynesie2** for complete Polynésie française coverage
4. ✅ **TAAF scale reduced** to 0.1 (already done)

## References
- Natural Earth: https://www.naturalearthdata.com/
- French administrative divisions: https://en.wikipedia.org/wiki/Administrative_divisions_of_France
- d3-composite-projections: https://github.com/rveciana/d3-composite-projections
