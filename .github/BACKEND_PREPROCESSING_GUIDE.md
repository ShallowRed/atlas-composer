# Backend Pre-Processing Implementation Guide

## Overview
This guide details how to implement backend pre-processing of French territories, moving complexity from client runtime to build-time data preparation.

## Goal
Transform Natural Earth's 7-feature structure into a clean 13-feature structure with all territories pre-extracted and ready to render.

---

## Step 1: Update prepare-geodata.js

### Add Territory Extraction Logic

After line ~180 (in `filterTerritories` function), add extraction logic:

```javascript
/**
 * Extracts DOM territories from France mainland MultiPolygon
 * @param {object} mainlandGeometry - France (250) geometry with embedded DOM
 * @param {object} config - Configuration with extraction rules
 * @returns {Array} Array of extracted territory geometries
 */
function extractDOMTerritories(mainlandGeometry, config) {
  if (mainlandGeometry.type !== 'MultiPolygon') {
    return []
  }

  const extracted = []
  const mainlandPolygons = []

  // Territories to extract (from config with extractFrom: 250)
  const extractionRules = Object.entries(config)
    .filter(([_, terr]) => terr.extractFrom === 250)
    .map(([id, terr]) => ({ id, ...terr }))

  // Iterate through each polygon in the MultiPolygon
  for (const polygon of mainlandGeometry.coordinates) {
    const firstRing = polygon[0]
    if (!firstRing || firstRing.length === 0)
      continue

    // Calculate polygon bounds
    const lons = firstRing.map(coord => coord[0])
    const lats = firstRing.map(coord => coord[1])
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    // Try to match against extraction rules
    let matched = false
    const tolerance = 0.1

    for (const rule of extractionRules) {
      const [[configMinLon, configMinLat], [configMaxLon, configMaxLat]] = rule.bounds

      if (
        minLon >= (configMinLon - tolerance)
        && maxLon <= (configMaxLon + tolerance)
        && minLat >= (configMinLat - tolerance)
        && maxLat <= (configMaxLat + tolerance)
      ) {
        // This polygon belongs to a DOM territory
        extracted.push({
          id: rule.id,
          type: 'MultiPolygon',
          coordinates: [polygon],
          properties: {
            name: rule.name,
            code: rule.code,
            iso: rule.iso,
            id: rule.id,
          }
        })
        matched = true
        break
      }
    }

    // If not matched, it's part of mainland
    if (!matched) {
      mainlandPolygons.push(polygon)
    }
  }

  return {
    mainland: {
      ...mainlandGeometry,
      coordinates: mainlandPolygons
    },
    extracted
  }
}

/**
 * Duplicates a territory geometry for multiple projections
 * @param {object} geometry - Original geometry
 * @param {object} config - Configuration with duplication rules
 * @returns {Array} Array with original and duplicate geometries
 */
function duplicateTerritories(geometries, config) {
  const result = [...geometries]

  // Find duplication rules (duplicateFrom property)
  const duplicationRules = Object.entries(config)
    .filter(([_, terr]) => terr.duplicateFrom)
    .map(([id, terr]) => ({ id, ...terr }))

  for (const rule of duplicationRules) {
    const sourceGeometry = geometries.find(g =>
      String(g.id) === String(rule.duplicateFrom)
      || g.properties?.code === rule.duplicateFrom
    )

    if (sourceGeometry) {
      result.push({
        ...sourceGeometry,
        id: rule.id,
        properties: {
          name: rule.name,
          code: rule.code,
          iso: rule.iso,
          id: rule.id,
        }
      })
    }
  }

  return result
}
```

### Update filterTerritories Function

Replace the current `filterTerritories` function with:

```javascript
function filterTerritories(worldData, territoriesConfig) {
  // Step 1: Filter initial territories by ID
  const territoryIds = Object.keys(territoriesConfig)
    .filter(id => !territoriesConfig[id].extractFrom && !territoriesConfig[id].duplicateFrom)

  const idLookup = new Map()
  for (const id of territoryIds) {
    const paddedId = id.padStart(3, '0')
    idLookup.set(paddedId, id)
    idLookup.set(id, id)
  }

  let geometries = worldData.objects.countries.geometries
    .filter(geometry => idLookup.has(String(geometry.id)))
    .map((geometry) => {
      const geomId = String(geometry.id)
      const configId = idLookup.get(geomId)
      const territory = territoriesConfig[configId]

      return {
        ...geometry,
        properties: {
          ...geometry.properties,
          name: territory.name,
          code: territory.code,
          iso: territory.iso,
          id: configId,
        },
      }
    })

  // Step 2: Extract DOM territories from France (250)
  const franceGeometry = geometries.find(g => g.properties.code === 'FR-MET')
  if (franceGeometry && franceGeometry.type === 'MultiPolygon') {
    const { mainland, extracted } = extractDOMTerritories(franceGeometry, territoriesConfig)

    // Replace France with mainland-only version
    geometries = geometries.map(g =>
      g.properties.code === 'FR-MET' ? { ...g, ...mainland } : g
    )

    // Add extracted territories
    geometries.push(...extracted)
  }

  // Step 3: Duplicate territories (e.g., FR-PF → FR-PF-2)
  geometries = duplicateTerritories(geometries, territoriesConfig)

  return {
    type: worldData.type,
    transform: worldData.transform,
    objects: {
      territories: {
        type: 'GeometryCollection',
        geometries,
      },
    },
    arcs: worldData.arcs,
  }
}
```

---

## Step 2: Update scripts/configs/france.js

Replace the `territories` object with:

```javascript
/**
 * French territories mapping: Natural Earth ID → Territory metadata
 *
 * Special keys:
 * - extractFrom: Extract this territory from another (e.g., DOM from France 250)
 * - duplicateFrom: Duplicate geometry from another territory (e.g., FR-PF-2 from FR-PF)
 * - bounds: Geographic bounds for extraction matching
 */
territories: {
  // Mainland (will be split to extract DOM)
  250: {
    name: 'France métropolitaine',
    code: 'FR-MET',
    iso: 'FRA'
  },

  // DOM - Extracted from France (250) MultiPolygon
  '250-YT': {
    name: 'Mayotte',
    code: 'FR-YT',
    iso: 'MYT',
    extractFrom: 250,
    bounds: [[44.98, -13.0], [45.3, -12.64]]
  },
  '250-RE': {
    name: 'La Réunion',
    code: 'FR-RE',
    iso: 'REU',
    extractFrom: 250,
    bounds: [[55.22, -21.39], [55.84, -20.87]]
  },
  '250-MQ': {
    name: 'Martinique',
    code: 'FR-MQ',
    iso: 'MTQ',
    extractFrom: 250,
    bounds: [[-61.23, 14.39], [-60.81, 14.88]]
  },
  '250-GP': {
    name: 'Guadeloupe',
    code: 'FR-GP',
    iso: 'GLP',
    extractFrom: 250,
    bounds: [[-61.81, 15.83], [-61.0, 16.52]]
  },
  '250-GF': {
    name: 'Guyane',
    code: 'FR-GF',
    iso: 'GUF',
    extractFrom: 250,
    bounds: [[-54.6, 2.1], [-51.6, 5.8]]
  },

  // COM - Separate Natural Earth features
  666: {
    name: 'Saint-Pierre-et-Miquelon',
    code: 'FR-PM',
    iso: 'SPM'
  },
  876: {
    name: 'Wallis-et-Futuna',
    code: 'FR-WF',
    iso: 'WLF'
  },
  663: {
    name: 'Saint-Martin',
    code: 'FR-MF',
    iso: 'MAF'
  },
  540: {
    name: 'Nouvelle-Calédonie',
    code: 'FR-NC',
    iso: 'NCL'
  },
  260: {
    name: 'Terres australes françaises',
    code: 'FR-TF',
    iso: 'ATF'
  },

  // Polynésie française - Original and duplicate for dual projection
  258: {
    name: 'Polynésie française',
    code: 'FR-PF',
    iso: 'PYF'
  },
  '258-2': {
    name: 'Polynésie française (îles éloignées)',
    code: 'FR-PF-2',
    iso: 'PYF',
    duplicateFrom: 258
  },
},
```

---

## Step 3: Regenerate Data

Run the preparation script:

```bash
# Generate 50m resolution (default)
node scripts/prepare-geodata.js france

# Or generate 10m for higher detail
NE_RESOLUTION=10m node scripts/prepare-geodata.js france
```

**Expected output**: `france-territories-50m.json` with 13 geometries instead of 7

---

## Step 4: Simplify GeoDataService.ts

### Remove These Methods

```typescript
// ❌ DELETE: extractMainlandRegion() - Lines ~250-290
// ❌ DELETE: extractOverseasFromMainland() - Lines ~305-380
```

### Simplify getMainLandData()

```typescript
async getMainLandData(): Promise<GeoJSON.FeatureCollection | null> {
  await this.loadData()

  if (!this.config.mainlandCode) {
    return null
  }

  const mainland = this.territoryData.get(this.config.mainlandCode)
  if (!mainland) return null

  // No extraction needed - mainland is already clean!
  return {
    type: 'FeatureCollection',
    features: [mainland.feature],
  }
}
```

### Simplify getOverseasData()

```typescript
async getOverseasData(): Promise<Array<{ name: string, code: string, data: GeoJSON.FeatureCollection, area: number, region: string }>> {
  await this.loadData()
  const overseasData = []

  // Simple: just filter out mainland
  for (const [code, territoryData] of this.territoryData) {
    if (code !== this.config.mainlandCode) {
      const territoryConfig = this.config.overseasTerritories.find((t: TerritoryConfig) => t.code === code)
      overseasData.push({
        name: territoryData.territory.name,
        code: territoryData.territory.code,
        area: territoryData.territory.area,
        region: territoryConfig?.region || 'Other',
        data: {
          type: 'FeatureCollection' as const,
          features: [territoryData.feature],
        },
      })
    }
  }

  // No extraction logic, no FR-PF-2 special case!
  return overseasData.sort((a, b) => {
    if (a.region !== b.region) {
      return a.region.localeCompare(b.region)
    }
    return b.area - a.area
  })
}
```

**Result**: ~150-200 lines of code deleted! 🎉

---

## Step 5: Verify Output

### Check Territory Count

```bash
node -e "
const data = require('./src/public/data/france-territories-50m.json');
console.log('Territories:', data.objects.territories.geometries.length);
console.log('Codes:', data.objects.territories.geometries.map(g => g.properties.code));
"
```

**Expected**:
```
Territories: 13
Codes: [
  'FR-MET', 'FR-YT', 'FR-RE', 'FR-MQ', 'FR-GP', 'FR-GF',
  'FR-PM', 'FR-WF', 'FR-MF', 'FR-PF', 'FR-PF-2', 'FR-NC', 'FR-TF'
]
```

### Verify DOM Extraction

```bash
node scripts/verify-dom-extraction.cjs
```

Should show: ✅ All 5 DOM territories successfully matched!

### Test Rendering

1. Start dev server: `npm run dev`
2. Select "Projection personnalisée"
3. Enable all territories
4. Verify:
   - ✅ 13 territories render
   - ✅ FR-PF and FR-PF-2 both appear (different scales)
   - ✅ DOM territories render separately
   - ✅ No overlaps or missing territories

---

## Step 6: Update Documentation

### Update TERRITORY_DATA_ARCHITECTURE.md

Change the data flow diagram from:

```
Natural Earth → extractOverseasFromMainland() → Application
```

To:

```
Natural Earth → prepare-geodata.js (extract & split) → Clean TopoJSON → Application
```

### Update README.md

Change territory count from 7 to 13 and explain pre-processing.

---

## Benefits Achieved

✅ **Client simplicity**: GeoDataService becomes trivial
✅ **Performance**: No runtime extraction overhead
✅ **Correctness**: Pre-validated at build time
✅ **Maintainability**: Extraction logic in one place
✅ **Debuggability**: Can inspect output TopoJSON directly
✅ **Flexibility**: Easy to add more extraction rules

---

## Rollback Plan

If issues arise:

1. Keep old `france-territories-50m.json` as `france-territories-50m.old.json`
2. Restore old `GeoDataService.ts` from git
3. Investigate issues
4. Re-run preparation script with fixes

---

## Testing Checklist

- [ ] All 13 territories in output TopoJSON
- [ ] FR-MET has only 3 polygons (no DOM)
- [ ] Each DOM has correct polygon(s)
- [ ] FR-PF-2 geometry matches FR-PF
- [ ] All territories render correctly
- [ ] No runtime errors in console
- [ ] Territory areas are correct
- [ ] Composite projection works
- [ ] Built-in projection works

---

## Next Steps

After French territories work:

1. Apply same pattern to other regions (EU, Spain, Portugal)
2. Add more territory variants if needed
3. Consider adding territory clipping/simplification
4. Add territory metadata enrichment
