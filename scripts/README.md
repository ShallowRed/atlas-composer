# Geographic Data Pipeline Tools

This directory contains tools to simplify the process of adding and managing geographic territories.

## 🎯 Problem Solved

Adding a new country previously required:
- ❌ Manual inspection of Natural Earth data in QGIS
- ❌ Calculating polygon bounds by hand
- ❌ Trial-and-error to identify which polygon is which territory
- ❌ Duplicating configuration in multiple files
- ❌ 30-60 minutes of tedious work

Now it takes **~30 seconds**.

## 🛠️ Available Tools

### 1. **Country Analyzer** (`npm run geodata:analyze`)

Analyzes Natural Earth data and suggests configuration using the shared CLI utilities.

```bash
npm run geodata:analyze -- <natural-earth-id> [--resolution=10m|50m|110m]
```

**What it does:**
- Lists all polygons with bounds, areas, and centers
- Identifies the mainland (largest polygon)
- Groups nearby polygons (archipelagos)
- Suggests configuration structure with polygon indices

**Example:**
```bash
npm run geodata:analyze -- 620
npm run geodata:analyze -- 620 --resolution=10m
```

**Output:**
```
[✓] Found: Portugal (ID 620)
[✓] Geometry: MultiPolygon with 9 polygon(s)

Polygon 1 — MAINLAND CANDIDATE
  Bounds: [-9.48, 37.01] → [-6.21, 42.14]
  Approx area: 9.23 deg²

Polygon 0
  Bounds: [-17.24, 32.65] → [-16.69, 32.87]
  Approx area: 0.07 deg²
  Likely separate territory / island
```

### 2. **Configuration Validator** (`validate-configs.js`)

Validates consistency between backend config, frontend config, and generated data.

```bash
# Validate one country
npm run geodata:validate -- portugal

# Validate all countries
npm run geodata:validate -- --all
```

**What it checks:**
- ✓ Backend config exists
- ✓ Frontend config exists
- ✓ Generated data files exist
- ✓ Territory codes match between all files
- ✓ All referenced territories exist in data
- ✓ No orphaned territories

**Example output:**
```
Validating: portugal

ℹ Backend config found: 3 territory definitions
ℹ Generated data found: FeatureCollection with 3 features
ℹ Frontend config found
ℹ ✓ Backend config and data are in sync (3 territories)
ℹ ✓ Frontend config references valid data
```

### 3. **Data Generator** (`prepare-geodata.js`)

Generates optimized territory data from Natural Earth.

```bash
npm run geodata:prepare -- <country> [--resolution=10m|50m|110m]
```

**What it does:**
- Downloads Natural Earth world data
- Filters to specified territories
- Extracts embedded territories (e.g., DOM from France)
- Generates GeoJSON FeatureCollection
- Creates metadata file

### 4. **Country Lookup** (`npm run geodata:lookup`)

Lightweight helper for exploring Natural Earth metadata when you only have a fuzzy name or code.

```bash
npm run geodata:lookup -- portugal
npm run geodata:lookup -- 620 --resolution=10m
```

**What it does:**
- Lists matching countries by name/ID fragment
- Prints raw Natural Earth properties
- Highlights polygons that look like separate territories
- Suggests `polygonIndices` snippets for quick config scaffolding

## 📖 How to Add a New Country

### Step 1: Find Natural Earth ID

```bash
# Download world data if needed
npm run geodata:prepare -- world

# Then analyze to find IDs (they're printed on error)
npm run geodata:analyze -- 999
# Shows available country IDs
```

Or search Natural Earth documentation: https://www.naturalearthdata.com/

### Step 2: Analyze the Country

```bash
npm run geodata:analyze -- <ID>
```

Example for Spain (ID 724):
```bash
npm run geodata:analyze -- 724
```

### Step 3: Create Backend Config

Create `scripts/configs/spain.js` based on analyzer output:

```javascript
export default {
  name: 'Spain',
  description: 'Spain with Canary and Balearic Islands',

  territories: {
    // Use analyzer suggestions, adjust names and codes
    '724': {
      name: 'Spain Mainland',
      code: 'ES-MAIN',
      iso: 'ESP',
      mainlandPolygon: 0 // From analyzer
    },
    '724-1': {
      name: 'Canary Islands',
      code: 'ES-CN',
      iso: 'ESP',
      extractFrom: 724,
      polygonIndices: [1] // From analyzer
    },
    '724-2': {
      name: 'Balearic Islands',
      code: 'ES-IB',
      iso: 'ESP',
      extractFrom: 724,
      polygonIndices: [2] // From analyzer
    }
  },

  outputName: 'spain'
}
```

### Step 4: Generate Data

```bash
npm run geodata:prepare -- spain
```

### Step 5: Create Frontend Config

Create `src/config/regions/spain.config.ts` and `src/data/territories/spain.data.ts`.

Use existing configs as templates:
- `src/config/regions/portugal.config.ts`
- `src/data/territories/portugal.data.ts`

### Step 6: Validate

```bash
npm run geodata:validate -- spain
```

Fix any errors or warnings reported.

## 🔧 Configuration Best Practices

### Use Polygon Indices (Not Bounds)

**❌ Old way (fragile):**
```javascript
'620-20': {
  extractFrom: 620,
  bounds: [[-17.5, 32.5], [-16.5, 33.0]]  // Breaks if data changes slightly
}
```

**✅ New way (explicit):**
```javascript
'620-20': {
  extractFrom: 620,
  polygonIndices: [0]  // Explicit polygon index
}
```

### Specify Mainland Polygon

```javascript
'620': {
  name: 'Portugal Continental',
  code: 'PT-CONT',
  mainlandPolygon: 1  // Explicitly specify which polygon
}
```

### Group Archipelagos

```javascript
'620-30': {
  name: 'Azores',
  code: 'PT-30',
  extractFrom: 620,
  polygonIndices: [2, 3, 4, 5, 6, 7, 8]  // All Azores islands
}
```

## 🚀 Future Improvements

See [GEODATA_IMPROVEMENT_PROPOSAL.md](../.github/GEODATA_IMPROVEMENT_PROPOSAL.md) for:

- **Unified configuration** - Single source of truth (JSON)
- **Auto-generated TypeScript** - Generate frontend configs
- **Interactive web mapper** - Visual configuration tool
- **Enhanced metadata** - Auto-calculate centers, offsets
- **One-command setup** - `npm run geodata:add spain`

## 📝 Configuration Files Reference

### Backend Config (`scripts/configs/[country].js`)

```javascript
export default {
  name: 'Country Name',
  description: 'Description',

  territories: {
    '<NE-ID>': {
      name: 'Territory Name',
      code: 'XX-CODE', // 2-letter country + identifier
      iso: 'ISO', // 3-letter ISO code
      mainlandPolygon: 0 // Which polygon is mainland (optional)
    },
    '<NE-ID>-<N>': {
      name: 'Extracted Territory',
      code: 'XX-TER',
      iso: 'ISO',
      extractFrom: '<NE-ID>', // Extract from this parent
      polygonIndices: [0, 1] // Which polygons to extract
    }
  },

  outputName: 'country' // Output file prefix
}
```

### Generated Data (`src/public/data/[country]-territories-50m.json`)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "620",
      "properties": {
        "name": "Portugal Continental",
        "code": "PT-CONT",
        "iso": "PRT"
      },
      "geometry": { "type": "MultiPolygon", "coordinates": [...] }
    }
  ]
}
```

### Generated Metadata (`src/public/data/[country]-metadata-50m.json`)

```json
{
  "name": "Portugal",
  "description": "...",
  "territories": {
    "620": {
      "name": "Portugal Continental",
      "code": "PT-CONT",
      ...
    }
  }
}
```

## 🐛 Troubleshooting

### "Country not found"
Run analyzer with wrong ID to see available countries:
```bash
npm run geodata:analyze -- 999
```

### "Backend config not found"
Create `scripts/configs/<country>.js` using template above.

### "Generated data not found"
Run:
```bash
npm run geodata:prepare -- <country>
```

### "Territories don't match"
Run validator to see differences:
```bash
npm run geodata:validate -- <country>
```

## 📚 Additional Resources

- [Full Improvement Proposal](../.github/GEODATA_IMPROVEMENT_PROPOSAL.md)
- [Quick Start Guide](../.github/GEODATA_QUICKSTART.md)
- [Natural Earth Data](https://www.naturalearthdata.com/)
- [World Atlas Package](https://github.com/topojson/world-atlas)
