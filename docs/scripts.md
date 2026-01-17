# Scripts & Build Tools Quick Reference

## Overview

TypeScript-based toolkit for geodata preparation, validation, and development workflows.

**Key Features**:
- TypeScript-first with full type safety
- Schema validation using AJV
- Natural Earth integration
- Smart polygon extraction
- Developer CLI utilities

## Quick Start

```bash
# Prepare geodata for an atlas
pnpm geodata:prepare france
pnpm geodata:prepare portugal --resolution=10m

# Validate config/data consistency
pnpm geodata:validate france
pnpm geodata:validate --all

# Look up country in Natural Earth
pnpm geodata:lookup france
pnpm geodata:lookup 250        # By country ID

# Analyze country polygon structure
pnpm geodata:analyze 250       # Get config suggestions
```

## Core Scripts

### 1. prepare-geodata.ts

**Purpose**: Downloads Natural Earth data, filters territories, creates optimized TopoJSON files

```bash
pnpm geodata:prepare <atlas> [--resolution=10m|50m|110m]
```

**Pipeline**:
1. Load & validate JSON config from `configs/<atlas>.json`
2. Download Natural Earth data at specified resolution
3. Filter territories by Natural Earth ID
4. Extract embedded territories (separate polygons from source features)
5. Duplicate territories for projection needs
6. Generate optimized TopoJSON output

**Output**:
```
src/public/data/
├── {atlas}-territories-{res}.json  # Territory geometries (TopoJSON)
└── {atlas}-metadata-{res}.json     # Territory metadata
```

**Example Output**:
```
Step 1: Load configuration
[✓] Loaded: france

Step 2: Download world data
[i] Fetching Natural Earth 50m...
[✓] Loaded 242 countries

Step 3: Filter territories
[i] Extracted from FR-MET: FR-YT, FR-RE, FR-MQ, FR-GP, FR-GF
[i] Duplicated 258 → FR-PF-2
[✓] Total territories: 13

Step 4: Generate output
[✓] Saved: france-territories-50m.json
[✓] Saved: france-metadata-50m.json
```

### 2. validate-configs.ts

**Purpose**: Validates consistency between JSON configs and generated geodata files

```bash
pnpm geodata:validate <atlas>   # Validate single atlas
pnpm geodata:validate --all     # Validate all atlases
```

**Checks**:
- Config file exists and valid JSON
- Passes JSON Schema validation
- Data files exist (territories + metadata)
- Territory counts match (config vs data)
- Territory IDs/codes consistent

**Example Output**:
```
Validating: france

✔ Config and data match
✔ Metadata is valid

Summary:
  Config territories: 13
  Data territories:   13

✓ VALID
```

### 3. lookup-country.ts

**Purpose**: Look up any country in Natural Earth by name or ID

```bash
pnpm geodata:lookup <query> [--resolution=10m|50m|110m]
```

**Examples**:
```bash
pnpm geodata:lookup france
pnpm geodata:lookup 250         # By Natural Earth ID
pnpm geodata:lookup "nether"    # Partial match
```

**Output**:
```
Looking up: france

Found: France
  ID:         250
  Code:       FRA
  ISO:        FR
  Name:       France
  Type:       Sovereign country
  Continent:  Europe

Geometry: MultiPolygon
  Polygons: 8

Polygon #0:
  Bounds: lon [-5.14, 9.56], lat [41.33, 51.09]
  Area:   ~35,892 km²

Polygon #1:
  Bounds: lon [-61.81, -61.00], lat [15.83, 16.52]
  Area:   ~165 km²
```

### 4. analyze-country.ts

**Purpose**: Analyzes polygon structure and provides configuration suggestions

```bash
pnpm geodata:analyze <country-id> [--resolution=10m|50m|110m]
```

**Examples**:
```bash
pnpm geodata:analyze 250              # France
pnpm geodata:analyze 620              # Portugal
pnpm geodata:analyze 724              # Spain
```

**Output**:
```
Analyzing country ID: 250

Country: France (FRA)
Type: MultiPolygon with 8 polygons

Polygons (sorted by area):

#0 (91.2% of total area)
  Bounds:  [[-5.14, 41.33], [9.56, 51.09]]
  Center:  [2.21, 46.21]
  Area:    35,892 km²

#1 (0.4% of total area)
  Bounds:  [[-61.81, 15.83], [-61.00, 16.52]]
  Center:  [-61.40, 16.18]
  Area:    165 km²
```

## Directory Structure

```
scripts/
├── prepare-geodata.ts          # Main geodata pipeline
├── validate-configs.ts         # Config/data validation
├── tsconfig.json               # TypeScript config for Node.js
│
├── config/
│   ├── adapter.ts              # JSON → backend transformation
│   └── loader.ts               # Config loading with validation
│
├── utils/
│   ├── cli-args.ts             # CLI argument parsing
│   ├── logger.ts               # Colored console output
│   ├── ne-data.ts              # Natural Earth fetcher
│   └── schema-validator.ts     # JSON Schema validator
│
└── dev/
    ├── lookup-country.ts       # Country lookup utility
    └── analyze-country.ts      # Polygon analysis utility

types/
├── atlas-config.ts             # JSON config types
├── backend-config.ts           # Backend processing types
└── index.ts                    # Barrel exports
```

## Key API Functions

### Config Loading

```typescript
import { loadConfig } from '#scripts/config/loader'

const { backend, json } = await loadConfig('france')
// backend: BackendConfig - Transformed for processing
// json: JSONAtlasConfig - Raw JSON config
```

### Natural Earth Data

```typescript
import { fetchWorldData } from '#scripts/utils/ne-data'

const topology = await fetchWorldData('50m')
// Returns TopoJSON with all countries
// Cached in node_modules/.cache/natural-earth/
```

### Schema Validation

```typescript
import { validateSchema } from '#scripts/utils/schema-validator'

const result = await validateSchema(data)
if (!result.valid) {
  console.error(result.errors)
}
```

### Logging

```typescript
import { logger } from '#scripts/utils/logger'

logger.info('Processing...') // Blue
logger.success('✓ Complete') // Green
logger.error('✗ Failed') // Red
logger.warn('⚠ Warning') // Yellow
logger.section('=== Step 1 ===') // Cyan
```

## Territory Extraction

**Problem**: Natural Earth stores multiple territories in single MultiPolygon

**Solution**: Extract polygons by matching geographic bounds

**Example**:
```json
{
  "id": "250",
  "code": "FR-MET"
}

{
  "id": "250-1",
  "code": "FR-GP",
  "extraction": {
    "extractFrom": "250",
    "polygonIndices": [1]  // Extract polygon #1 (Guadeloupe)
  }
}
```

**Algorithm**:
1. Iterate through MultiPolygon
2. Calculate polygon bounds
3. Compare with extraction rule bounds (0.5° tolerance)
4. If match: separate polygon into new feature
5. Remaining polygons stay in source feature

**Critical**: Bounds format must be nested arrays `[[minLon, minLat], [maxLon, maxLat]]`

## Territory Duplication

**Problem**: Some territories need to appear twice for projection layouts

**Solution**: Duplicate features with unique IDs

**Example**:
```json
{
  "duplicates": [
    {
      "sourceCode": "258", // French Polynesia
      "targetCode": "FR-PF-2" // Duplicate with new ID
    }
  ]
}
```

Creates two features:
- Original: `id="258"`
- Duplicate: `id="FR-PF-2"`

## Best Practices

### 1. Always Validate After Generation
```bash
pnpm geodata:prepare france
pnpm geodata:validate france
```

### 2. Use Developer Tools Before Creating Configs
```bash
pnpm geodata:lookup france    # Find country ID
pnpm geodata:analyze 250      # Get polygon structure
# Use output to create config
```

### 3. Start with 50m Resolution
50m is the sweet spot:
- Smaller than 10m (faster)
- Better detail than 110m
- Good for web display

Use 10m only for production high-detail maps.

### 4. Test Extraction Rules Incrementally
Add one extraction rule at a time, test, then add next.

### 5. Cache Management
Data cached in `node_modules/.cache/natural-earth/`

To clear cache:
```bash
rm -rf node_modules/.cache/natural-earth
```

### 6. Naming Conventions

**Territory Codes**:
- Metropolitan: `{ISO}-MET` (e.g., `FR-MET` for France Metropolitaine)
- Overseas: `{ISO}-{ABBR}` (e.g., `FR-GP` for Guadeloupe)
- Duplicates: `{ISO}-{ABBR}-{N}` (e.g., `FR-PF-2`)

**Files**:
- Configs: `{atlas}.json`
- Territories: `{atlas}-territories-{res}.json`
- Metadata: `{atlas}-metadata-{res}.json`

## Complete Workflow

```
1. Research
   pnpm geodata:lookup "Netherlands"
   pnpm geodata:analyze 528

2. Create Config
   configs/netherlands.json

3. Generate Data
   pnpm geodata:prepare netherlands

4. Validate
   pnpm geodata:validate netherlands

5. Test
   pnpm dev
```

## Related Docs

- `add-new-atlas.md` - Step-by-step guide for adding new atlas
- `atlases.md` - Atlas system architecture
- `projections.md` - Projection system reference
