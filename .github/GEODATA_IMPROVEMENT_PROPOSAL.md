# Geographic Data Pipeline Improvement Proposal

## Current Problems

### 1. **Manual Configuration Duplication**
Territory configuration exists in **two places** with overlapping data:

**Backend** (`scripts/configs/[country].js`):
```javascript
territories: {
  '250': { name: 'France métropolitaine', code: 'FR-MET', iso: 'FRA' },
  '250-GP': {
    name: 'Guadeloupe',
    code: 'FR-GP',
    iso: 'GLP',
    extractFrom: 250,
    bounds: [[-61.81, 15.83], [-61.0, 16.51]],
  },
  // ... 12 more territories
}
```

**Frontend** (`src/data/territories/[country].data.ts`):
```typescript
export const MAINLAND_FRANCE: TerritoryConfig = {
  code: 'FR-MET',
  name: 'France métropolitaine',
  center: [2.5, 46.5],
  offset: [0, 0],
  bounds: [[-5.5, 41.0], [10.0, 51.5]],
}
// ... 12 more territories with offsets, centers, projection types
```

### 2. **Manual Polygon Identification**
To extract embedded territories, we manually:
1. Download world data
2. Find the country's Natural Earth ID
3. Inspect MultiPolygon coordinates
4. Calculate bounds for each polygon
5. Guess which polygon is which territory
6. Hardcode bounds in config

### 3. **No Automated Discovery**
When adding a new country, we need to:
- Manually find Natural Earth IDs
- Manually inspect MultiPolygon structure
- Manually calculate bounds for extraction
- Manually configure frontend territory definitions
- Manually set offsets for composite projections

### 4. **Fragile Bounds Matching**
Extraction uses hardcoded bounds with tolerance:
```javascript
if (
  minLon >= (configMinLon - tolerance) &&
  maxLon <= (configMaxLon + tolerance) &&
  minLat >= (configMinLat - tolerance) &&
  maxLat <= (configMaxLat + tolerance)
)
```
This is fragile and requires manual adjustment.

---

## Proposed Solutions

### Solution 1: **Unified Configuration Source**

Create a single source of truth with automatic metadata generation.

#### Implementation

**New file**: `scripts/configs/unified/france.json`
```json
{
  "id": "france",
  "name": "France",
  "description": "France métropolitaine et territoires d'outre-mer",
  "naturalEarthId": 250,
  "mainlandCode": "FR-MET",

  "territories": [
    {
      "code": "FR-MET",
      "name": "France métropolitaine",
      "iso": "FRA",
      "type": "mainland",
      "projectionType": "conic",
      "center": [2.5, 46.5],
      "offset": [0, 0]
    },
    {
      "code": "FR-GP",
      "name": "Guadeloupe",
      "iso": "GLP",
      "type": "extracted",
      "region": "Caribbean",
      "extractFrom": "FR-MET",
      "polygonIndex": 0,
      "projectionType": "mercator",
      "center": [-61.4, 16.2],
      "offset": [150, 450]
    }
  ]
}
```

**Generate both backend and frontend configs**:
```bash
# Generate backend extraction config
npm run geodata:generate-backend france

# Generate frontend TypeScript definitions
npm run geodata:generate-frontend france

# Or both at once
npm run geodata:generate france
```

---

### Solution 2: **Automated Polygon Analysis Tool**

Create a CLI tool to analyze Natural Earth data and suggest configurations.

#### Implementation

**New file**: `scripts/analyze-country.js`

```bash
# Analyze a country's Natural Earth data
npm run geodata:analyze -- --country france --id 250

# Output:
# ✓ Found: France (ID 250)
# ✓ Geometry: MultiPolygon with 13 polygons
#
# Polygon Analysis:
#
# Polygon 0: [-61.81, 15.83] → [-61.00, 16.51]
#   → Likely: Caribbean territory (Guadeloupe?)
#   → Area: 1,628 km²
#
# Polygon 1: [-5.50, 41.00] → [10.00, 51.50]
#   → Likely: MAINLAND (largest polygon)
#   → Area: 543,940 km²
#
# Polygon 2: [-61.23, 14.39] → [-60.81, 14.88]
#   → Likely: Caribbean territory (Martinique?)
#   → Area: 1,128 km²
#
# Suggested configuration:
# {
#   "250": { "name": "France", "code": "FR-MET", "type": "mainland" },
#   "250-0": { "bounds": [[-61.81, 15.83], [-61.00, 16.51]], "type": "extracted" },
#   "250-2": { "bounds": [[-61.23, 14.39], [-60.81, 14.88]], "type": "extracted" }
# }
```

**Features**:
- Calculate polygon areas to identify mainland
- Group nearby polygons (e.g., archipelagos)
- Suggest territory codes based on known patterns
- Interactive mode to confirm/adjust suggestions
- Export to unified config format

---

### Solution 3: **Interactive Territory Mapper**

Create a visual web tool to map polygons to territories.

#### Implementation

**New file**: `scripts/map-territories.html`

```bash
npm run geodata:map france
# Opens browser at http://localhost:3000
```

**Features**:
- Display all polygons on a map
- Click to select and name each polygon
- Auto-calculate bounds
- Drag to set composite projection offsets
- Export configuration JSON
- Import existing config to modify

**UI Flow**:
1. Select country from Natural Earth data
2. Map displays all polygons with indices
3. Click polygon → Form appears:
   - Territory Code (e.g., FR-GP)
   - Territory Name (e.g., Guadeloupe)
   - ISO Code (e.g., GLP)
   - Type: [Mainland | Extracted | Separate]
   - Region Group (e.g., Caribbean)
4. Composite mode: Drag territories to set offsets
5. Export → Generates unified JSON config

---

### Solution 4: **Smart Extraction with Polygon Indexing**

Instead of bounds matching, use polygon indices directly.

#### Implementation

**Backend Config**:
```javascript
territories: {
  '250': {
    name: 'France métropolitaine',
    code: 'FR-MET',
    mainlandPolygon: 1  // Explicitly specify which polygon is mainland
  },
  '250-GP': {
    name: 'Guadeloupe',
    code: 'FR-GP',
    extractFrom: 250,
    polygonIndices: [0]  // Instead of bounds, use indices
  },
  '250-MQ': {
    name: 'Martinique',
    code: 'FR-MQ',
    extractFrom: 250,
    polygonIndices: [2]
  },
  '250-30': {
    name: 'Azores',
    code: 'PT-30',
    extractFrom: 620,
    polygonIndices: [2, 3, 4, 5, 6, 7, 8]  // Multiple polygons
  }
}
```

**Advantages**:
- No tolerance issues
- Explicit and predictable
- Works even if data slightly changes
- Easier to understand and maintain

---

### Solution 5: **Generated Metadata File**

Have the backend script generate a comprehensive metadata file that the frontend can use directly.

#### Implementation

**Generated file**: `src/public/data/france-metadata-50m.json`

```json
{
  "name": "France",
  "mainlandCode": "FR-MET",
  "territories": {
    "FR-MET": {
      "name": "France métropolitaine",
      "code": "FR-MET",
      "iso": "FRA",
      "type": "mainland",
      "bounds": [[-5.5, 41.0], [10.0, 51.5]],
      "center": [2.5, 46.5],
      "area": 543940,
      "polygonCount": 1,
      "suggestedProjection": "conic",
      "suggestedOffset": [0, 0]
    },
    "FR-GP": {
      "name": "Guadeloupe",
      "code": "FR-GP",
      "iso": "GLP",
      "type": "extracted",
      "region": "Caribbean",
      "bounds": [[-61.81, 15.83], [-61.00, 16.51]],
      "center": [-61.4, 16.2],
      "area": 1628,
      "polygonCount": 1,
      "suggestedProjection": "mercator",
      "suggestedOffset": [150, 450]
    }
  },
  "regions": {
    "Caribbean": ["FR-GP", "FR-MQ", "FR-GF", "FR-MF"],
    "Pacific": ["FR-NC", "FR-PF", "FR-WF"],
    "Indian Ocean": ["FR-RE", "FR-YT", "FR-TF"]
  }
}
```

**Frontend uses this directly**:
```typescript
// Load metadata instead of hardcoding
const metadata = await fetch('/data/france-metadata-50m.json')
const territories = Object.values(metadata.territories)
  .map(t => ({
    ...t,
    offset: userOffsets[t.code] || t.suggestedOffset
  }))
```

---

## Recommended Implementation Plan

### Phase 1: Quick Wins (1-2 days)
1. ✅ **Switch to polygon indices** instead of bounds matching
   - Update extraction logic in `prepare-geodata.js`
   - Update France and Portugal configs
   - More reliable, easier to maintain

2. ✅ **Enhanced metadata generation**
   - Calculate centers, areas, polygon counts
   - Add suggested projections and offsets
   - Frontend can use this to reduce hardcoding

### Phase 2: Automation Tools (3-5 days)
3. **Create `analyze-country.js` CLI tool**
   - Analyzes Natural Earth data
   - Calculates polygon metadata
   - Suggests configuration structure
   - Exports draft config

4. **Create `generate-configs.js` script**
   - Takes unified JSON config
   - Generates backend extraction config
   - Generates frontend TypeScript definitions
   - Validates consistency

### Phase 3: Interactive Tools (1-2 weeks)
5. **Create web-based territory mapper**
   - Visual polygon selection
   - Interactive offset adjustment
   - Export/import configurations
   - Preview composite projections

### Phase 4: Complete Migration (1 week)
6. **Migrate all countries to unified config**
   - Convert France, Portugal, Spain, EU configs
   - Update documentation
   - Add validation tests

---

## Benefits Summary

| Current State | After Implementation |
|--------------|---------------------|
| Manual polygon inspection | Automated analysis tool |
| Hardcoded bounds (fragile) | Polygon indices (explicit) |
| Duplicate config (backend + frontend) | Single source of truth |
| Manual bound calculation | Auto-calculated metadata |
| Trial-and-error offset adjustment | Visual interactive tool |
| Risk of inconsistency | Validated generation |

**Time savings per new country**: ~4-6 hours → ~30 minutes

---

## File Structure (Proposed)

```
scripts/
  configs/
    unified/                    # NEW: Single source of truth
      france.json
      portugal.json
      spain.json

  tools/                        # NEW: Helper tools
    analyze-country.js          # Analyze Natural Earth data
    generate-configs.js         # Generate backend/frontend configs
    validate-config.js          # Validate consistency

  web/                          # NEW: Interactive tools
    territory-mapper/
      index.html
      app.js

  prepare-geodata.js            # Updated to use polygon indices

src/
  public/data/
    france-territories-50m.json
    france-metadata-50m.json    # Enhanced with suggestions

  config/regions/
    france.config.ts            # Can be auto-generated or use metadata

  data/territories/
    france.data.ts              # Can be auto-generated or use metadata
```

---

## Next Steps

1. **Discuss and prioritize** which solutions to implement
2. **Phase 1 prototype**: Implement polygon indices + enhanced metadata
3. **Validate** with France and Portugal
4. **Iterate** based on feedback
5. **Scale** to other countries

What are your thoughts on this approach? Which solutions would provide the most value for your workflow?
