# Scripts & Build Tools Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Core Scripts](#core-scripts)
5. [Developer Utilities](#developer-utilities)
6. [API Reference](#api-reference)
7. [Configuration System](#configuration-system)
8. [Data Processing Pipeline](#data-processing-pipeline)
9. [Best Practices](#best-practices)

## Overview

Atlas Composer's scripts system provides a robust TypeScript-based toolkit for geodata preparation, validation, and development workflows. The scripts bridge the gap between Natural Earth raw data and the optimized TopoJSON files used by the application.

### Key Features

- **TypeScript-First**: Fully typed scripts with compile-time safety
- **Schema Validation**: Runtime JSON Schema validation using AJV
- **Natural Earth Integration**: Automated downloading and filtering of geodata
- **Territory Extraction**: Smart polygon extraction from MultiPolygon geometries
- **Developer Tools**: Utilities for exploring and analyzing country data
- **Node.js Subpath Imports**: Clean import paths using `#types/*` and `#scripts/*` aliases

### Design Patterns

- **Adapter Pattern**: Transforms JSON configs into backend-specific formats
- **Factory Pattern**: Consistent data structure creation
- **CLI Pattern**: User-friendly command-line interfaces with help text
- **Pipeline Pattern**: Multi-stage data processing with clear separation

## Architecture

### Directory Structure

```
scripts/
├── prepare-geodata.ts          # Main geodata preparation pipeline
├── validate-configs.ts         # Config/data consistency validation
├── tsconfig.json               # TypeScript configuration for Node.js
│
├── config/                     # Configuration adapters and loaders
│   ├── adapter.ts              # JSON-to-backend config transformation
│   └── loader.ts               # Config file loading with validation
│
├── utils/                      # Shared utilities
│   ├── cli-args.ts             # CLI argument parsing
│   ├── logger.ts               # Colored console output
│   ├── ne-data.ts              # Natural Earth data fetcher
│   └── schema-validator.ts     # AJV-based JSON Schema validator
│
└── dev/                        # Developer utilities
    ├── lookup-country.ts       # Look up any country in Natural Earth
    └── analyze-country.ts      # Analyze country polygon structure

types/
├── atlas-config.ts             # JSON configuration types
├── backend-config.ts           # Backend processing types
└── index.ts                    # Barrel exports
```

### Module System

The scripts use **ES Modules** with **Node.js subpath imports** for clean dependencies:

```typescript
// Type imports (shared between frontend and backend)
import type { JSONAtlasConfig } from '#types/atlas-config'
import type { BackendConfig } from '#types/backend-config'

// Script imports (backend-only utilities)
import { loadConfig } from '#scripts/config/loader'
import { logger } from '#scripts/utils/logger'
```

**TypeScript Configuration:**
- `moduleResolution: "NodeNext"` for Node.js ESM support
- `rootDir: ".."` to access shared types
- Includes `types/**/*.ts` for type sharing
- Separate from frontend config (no bundler-specific features)

## Quick Start

### Running Scripts

```bash
# Prepare geodata for an atlas
pnpm geodata:prepare france
pnpm geodata:prepare portugal --resolution=10m

# Validate config/data consistency
pnpm geodata:validate france
pnpm geodata:validate --all

# Look up a country in Natural Earth
pnpm geodata:lookup france
pnpm geodata:lookup 620  # By country ID

# Analyze country polygon structure
pnpm geodata:analyze 250  # France
pnpm geodata:analyze 620  # Portugal
```

### Help Text

All scripts include built-in help:

```bash
pnpm geodata:prepare --help
pnpm geodata:validate --help
pnpm geodata:lookup --help
pnpm geodata:analyze --help
```

## Core Scripts

### 1. `prepare-geodata.ts`

**Purpose**: Downloads Natural Earth data, filters territories, and creates optimized TopoJSON files.

**Usage:**
```bash
pnpm geodata:prepare <atlas> [--resolution=10m|50m|110m]
```

**Examples:**
```bash
pnpm geodata:prepare france              # France at 50m resolution
pnpm geodata:prepare portugal --resolution=10m  # Portugal at 10m
pnpm geodata:prepare eu                  # European Union
```

**Processing Pipeline:**

1. **Load Configuration**
   - Reads JSON config from `configs/<atlas>.json`
   - Validates against JSON Schema
   - Transforms to backend-specific format

2. **Download World Data**
   - Fetches Natural Earth dataset at specified resolution
   - Caches in `node_modules/.cache/natural-earth/`
   - Converts TopoJSON to GeoJSON for processing

3. **Filter Territories**
   - Matches countries by Natural Earth ID
   - Applies territory extraction rules
   - Handles territory duplication for projection needs

4. **Extract Embedded Territories**
   - Separates overseas territories from mainland MultiPolygon
   - Uses geographic bounds matching with tolerance
   - Critical for France (extracts 5 DOM territories)

5. **Duplicate Territories**
   - Creates projection-specific territory copies
   - Example: French Polynesia duplicated for split positioning

6. **Generate Output**
   - Creates GeoJSON FeatureCollection
   - Converts to optimized TopoJSON format
   - Generates metadata file with territory details

**Output Files:**
```
src/public/data/
├── world-countries-50m.json              # Cached world data
├── france-territories-50m.json           # Territory geometries (TopoJSON)
└── france-metadata-50m.json              # Territory metadata
```

**Key Functions:**

- `extractEmbeddedTerritories()`: Extracts overseas territories from mainland
- `duplicateTerritories()`: Creates projection-specific copies
- `filterTerritories()`: Main territory filtering logic
- `saveData()`: Writes JSON files to disk

**Territory Extraction Example:**

```typescript
// France config includes extraction rules
{
  "id": "250",
  "code": "FR-MET",
  "extractionRules": [
    {
      "id": "FR-GP",
      "bounds": [[-61.8, 15.8], [-61.0, 16.5]]  // Guadeloupe bounds
    }
    // ... more rules
  ]
}
```

During processing:
```
Step 2: Filter territories
[i]   Extracted from FR-MET: FR-YT, FR-RE, FR-MQ, FR-GP, FR-GF
[i]   Duplicated 258 → FR-PF-2
[✓]   Total territories: 13
```

### 2. `validate-configs.ts`

**Purpose**: Validates consistency between JSON configs and generated geodata files.

**Usage:**
```bash
pnpm geodata:validate <atlas>    # Validate single atlas
pnpm geodata:validate --all      # Validate all atlases
```

**Examples:**
```bash
pnpm geodata:validate france
pnpm geodata:validate --all
```

**Validation Checks:**

1. **Configuration Loading**
   - Config file exists and is valid JSON
   - Passes JSON Schema validation
   - Backend adapter can transform it

2. **Data File Existence**
   - TopoJSON territories file exists
   - Metadata file exists
   - Files are valid JSON

3. **Territory Synchronization**
   - Config territories match generated data
   - No missing territories in data
   - No extra territories in data
   - IDs and codes are consistent

4. **Metadata Validation**
   - Territory count matches
   - All territory details present
   - Proper structure and types

**Output:**
```
Validating: france

✔ Config and data match
✔ Metadata is valid

Summary:
  Config territories: 13
  Data territories:   13

✓ VALID
```

**Exit Codes:**
- `0`: All validations passed
- `1`: Validation errors found

## Developer Utilities

### 1. `lookup-country.ts`

**Purpose**: Look up any country in Natural Earth by name or ID. Provides quick insight into geometry structure for configuration authoring.

**Usage:**
```bash
pnpm geodata:lookup <query> [--resolution=10m|50m|110m]
```

**Examples:**
```bash
pnpm geodata:lookup france
pnpm geodata:lookup portugal
pnpm geodata:lookup 620         # By Natural Earth ID
pnpm geodata:lookup spain --resolution=10m
```

**Output:**
```
Looking up country: france

Found: France
  ID:         250
  Code:       FRA
  ISO:        FR
  Name:       France
  Formal:     French Republic
  Type:       Sovereign country
  Continent:  Europe
  Region:     Western Europe
  Subregion:  Western Europe

Geometry: MultiPolygon
  Polygons: 8

  Polygon #0 (Mainland):
    Bounds: lon [-5.14, 9.56], lat [41.33, 51.09]
    Rings:  1
    Area:   ~35,892 km²

  Polygon #1 (Overseas):
    Bounds: lon [-61.81, -61.00], lat [15.83, 16.52]
    Rings:  2
    Area:   ~165 km²
    Distance: ~6,600 km from mainland

  [... more polygons ...]
```

**Use Cases:**
- Verify Natural Earth country IDs before creating configs
- Understand polygon structure for extraction planning
- Check coordinate bounds for extraction rules
- Identify overseas territories that need extraction

### 2. `analyze-country.ts`

**Purpose**: Analyzes Natural Earth data to help configure territory extraction. Provides detailed polygon analysis and configuration suggestions.

**Usage:**
```bash
pnpm geodata:analyze <country-id> [--resolution=10m|50m|110m]
```

**Examples:**
```bash
pnpm geodata:analyze 250              # France
pnpm geodata:analyze 620 --resolution=10m  # Portugal (10m)
pnpm geodata:analyze 724              # Spain
```

**Output:**
```
Analyzing country ID: 250

Country Information:
  Name:       France
  Code:       FRA
  ISO:        FR
  Type:       MultiPolygon
  Polygons:   8

Polygon Analysis:

  #0 - MAINLAND (91.2% of total area)
    Bounds:  [[-5.14, 41.33], [9.56, 51.09]]
    Center:  [2.21, 46.21]
    Area:    35,892 km²
    Region:  Europe
    Rings:   1

  #1 - CARIBBEAN (0.4% of total area)
    Bounds:  [[-61.81, 15.83], [-61.00, 16.52]]
    Center:  [-61.40, 16.18]
    Area:    165 km²
    Region:  Caribbean
    Distance from mainland: 6,623 km
    Rings:   2

  [... more polygons ...]

Configuration Suggestions:

Mainland Territory:
{
  "id": "250",
  "code": "FR-MET",
  "name": "Metropolitan France",
  "role": "mainland"
}

Overseas Territories:
[
  {
    "id": "250-1",
    "code": "FR-GP",
    "name": "Guadeloupe",
    "role": "overseas",
    "bounds": [[-61.81, 15.83], [-61.00, 16.52]]
  }
  // ... more suggested configs
]

Notes:
- Mainland is polygon #0 (largest)
- 7 overseas territories identified
- All overseas are >1000 km from mainland
- Consider extraction rules for DOM territories
```

**Use Cases:**
- Plan territory extraction strategy
- Generate ready-to-use configuration snippets
- Understand geographic regions and groupings
- Identify polygon indices for extraction rules

## API Reference

### Configuration Adapters

#### `loadConfig(atlasId: string)`

Loads and validates an atlas configuration.

```typescript
import { loadConfig } from '#scripts/config/loader'

const { backend, json } = await loadConfig('france')
// backend: BackendConfig - Transformed for script processing
// json: JSONAtlasConfig - Raw JSON configuration
```

**Returns:**
- `backend`: Backend-specific configuration with adapted types
- `json`: Original JSON configuration

**Throws:**
- Error if config file not found
- Error if JSON Schema validation fails
- Error if adapter transformation fails

#### `listConfigs()`

Lists all available atlas configurations.

```typescript
import { listConfigs } from '#scripts/config/loader'

const atlases = await listConfigs()
// ['france', 'portugal', 'spain', 'eu']
```

**Returns:** Array of atlas IDs (filename without `.json`)

### Natural Earth Data

#### `fetchWorldData(resolution: string)`

Downloads and caches Natural Earth world data.

```typescript
import { fetchWorldData } from '#scripts/utils/ne-data'

const topology = await fetchWorldData('50m')
// Returns TopoJSON topology with all countries
```

**Parameters:**
- `resolution`: `'10m'`, `'50m'`, or `'110m'`

**Returns:** TopoJSON Topology object

**Caching:** Data is cached in `node_modules/.cache/natural-earth/`

### Validation

#### `validateSchema(data: unknown)`

Validates data against the atlas JSON Schema.

```typescript
import { validateSchema } from '#scripts/utils/schema-validator'

const result = await validateSchema(data)
if (!result.valid) {
  console.error(result.errors)
}
```

**Parameters:**
- `data`: Unknown data to validate

**Returns:**
```typescript
{
  valid: boolean
  errors?: Array<{
    instancePath: string
    message: string
  }>
}
```

### Logging

#### `logger`

Colored console output utility.

```typescript
import { logger } from '#scripts/utils/logger'

logger.info('Processing...')
logger.success('✓ Complete')
logger.error('✗ Failed')
logger.warn('⚠ Warning')
logger.section('=== Step 1 ===')
```

**Methods:**
- `info(message)`: Blue info message
- `success(message)`: Green success message
- `error(message)`: Red error message
- `warn(message)`: Yellow warning message
- `section(title)`: Cyan section header

### CLI Arguments

#### `parseArgs(argv: string[])`

Parses command-line arguments.

```typescript
import { parseArgs } from '#scripts/utils/cli-args'

const args = parseArgs(process.argv.slice(2))
// { _: ['france'], resolution: '50m', help: false }
```

#### `getResolution(args: ParsedArgs)`

Gets resolution from args with default fallback.

```typescript
import { getResolution } from '#scripts/utils/cli-args'

const resolution = getResolution(args) // '10m', '50m', or '110m'
```

#### `validateRequired(args: ParsedArgs, name: string)`

Validates required positional argument exists.

```typescript
import { validateRequired } from '#scripts/utils/cli-args'

validateRequired(args, 'atlas')
// Throws if first positional arg is missing
```

## Configuration System

### JSON Schema Validation

All atlas configurations are validated against `configs/schema.json`:

**Key Constraints:**
- Territory IDs must match pattern `^[A-Z]{2}(-[A-Z0-9]+)?(-\d+)?$`
- Bounds must be nested arrays: `[[minLon, minLat], [maxLon, maxLat]]`
- Roles must be: `mainland`, `overseas`, `embedded`, or `member-state`
- Projections must match known types

**Runtime Validation:**
```typescript
// Automatic validation during config loading
const { backend } = await loadConfig('france')
// Throws if validation fails
```

### Backend Config Adapter

Transforms JSON configs into backend-specific format:

**JSON Config → Backend Config:**
```typescript
// JSON (storage format)
{
  "id": "250",
  "code": "FR-MET",
  "name": { "en": "Metropolitan France" }
}

// Backend (processing format)
{
  id: "250",
  code: "FR-MET",
  name: "Metropolitan France",  // Default language extracted
  role: "mainland"
}
```

**Key Transformations:**
- Flattens nested structures
- Extracts default language strings
- Adds computed properties
- Normalizes arrays

## Data Processing Pipeline

### Complete Workflow

```
1. User runs: pnpm geodata:prepare france

2. Load Configuration
   ├─ Read configs/france.json
   ├─ Validate against schema
   └─ Transform to BackendConfig

3. Download World Data
   ├─ Check cache: node_modules/.cache/natural-earth/
   ├─ Download if missing from Natural Earth
   └─ Convert TopoJSON → GeoJSON

4. Filter Territories
   ├─ Match by Natural Earth ID
   ├─ Apply extraction rules
   └─ Handle duplication rules

5. Extract Embedded Territories
   ├─ For each extraction rule:
   │  ├─ Find polygon matching bounds
   │  ├─ Remove from mainland geometry
   │  └─ Create new feature
   └─ Example: FR-MET → FR-GP, FR-MQ, FR-GF, FR-RE, FR-YT

6. Duplicate Territories
   └─ Create projection-specific copies (e.g., FR-PF-2)

7. Generate Output
   ├─ Create GeoJSON FeatureCollection
   ├─ Convert to TopoJSON (optimized)
   ├─ Generate metadata JSON
   └─ Save to src/public/data/

8. Validation (optional)
   ├─ Compare config vs generated data
   ├─ Check territory counts
   └─ Verify metadata consistency
```

### Territory Extraction Details

**Problem:** Natural Earth stores mainland + overseas territories in a single MultiPolygon feature.

**Solution:** Extract polygons by matching geographic bounds.

**Example - France:**

```typescript
// Config specifies extraction rules
{
  "id": "250",
  "code": "FR-MET",
  "extractionRules": [
    {
      "id": "FR-GP",
      "name": { "en": "Guadeloupe" },
      "bounds": [[-61.81, 15.83], [-61.00, 16.52]]
    }
  ]
}

// Processing extracts polygon #1 from feature 250
// Creates new feature with id="FR-GP"
// Removes polygon #1 from FR-MET geometry
```

**Algorithm:**
1. Iterate through each polygon in MultiPolygon
2. Calculate polygon bounds
3. Compare with extraction rule bounds (with tolerance)
4. If match: separate polygon into new feature
5. Remaining polygons stay in mainland feature

**Tolerance:** 0.5° buffer to account for Natural Earth precision

**Critical Fix (2025-01):** Bounds format must be nested arrays `[[minLon, minLat], [maxLon, maxLat]]`, not flat array `[minLon, minLat, maxLon, maxLat]`. See type definitions in `types/atlas-config.ts` and `types/backend-config.ts`.

### Territory Duplication

**Problem:** Some territories need to appear twice for projection layout.

**Solution:** Duplicate features with unique IDs.

**Example - French Polynesia:**

```typescript
// Config specifies duplication
{
  "duplicates": [
    {
      "sourceCode": "258",    // French Polynesia
      "targetCode": "FR-PF-2" // Duplicate with new ID
    }
  ]
}

// Processing creates two features:
// - Original: id="258"
// - Duplicate: id="FR-PF-2"
```

**Use Case:** Split view with territory appearing in two different projections.

## Best Practices

### 1. Always Validate After Generation

```bash
# Generate data
pnpm geodata:prepare france

# Immediately validate
pnpm geodata:validate france
```

### 2. Use Developer Tools Before Creating Configs

```bash
# Step 1: Look up country
pnpm geodata:lookup france

# Step 2: Analyze structure
pnpm geodata:analyze 250

# Step 3: Use analysis output to create config
```

### 3. Start with 50m Resolution

50m is the sweet spot for web display:
- Smaller file sizes than 10m
- Better detail than 110m
- Faster generation and processing

Use 10m only for production maps requiring highest detail.

### 4. Test Extraction Rules Incrementally

When adding extraction rules:
1. Add one rule at a time
2. Run `prepare-geodata` and check output
3. Verify extracted territory appears correctly
4. Add next rule

### 5. Use TypeScript for Type Safety

Scripts are fully typed - leverage this:

```typescript
import type { BackendConfig, BackendTerritory } from '#types/backend-config'

function processTerritories(config: BackendConfig) {
  // TypeScript ensures correct structure
  for (const territory of Object.values(config.territories)) {
    // territory.code, territory.name, etc. are type-checked
  }
}
```

### 6. Handle Errors Gracefully

```typescript
try {
  const { backend } = await loadConfig('france')
}
catch (error) {
  logger.error(`Failed to load config: ${error.message}`)
  process.exit(1)
}
```

### 7. Cache Natural Earth Data

Data is automatically cached in `node_modules/.cache/natural-earth/`. To clear cache:

```bash
rm -rf node_modules/.cache/natural-earth
```

### 8. Use Consistent Naming Conventions

**Territory Codes:**
- Mainland: `{ISO}-MET` (e.g., `FR-MET`)
- Overseas: `{ISO}-{ABBR}` (e.g., `FR-GP` for Guadeloupe)
- Duplicates: `{ISO}-{ABBR}-{N}` (e.g., `FR-PF-2`)

**File Naming:**
- Configs: `{atlas}.json` (e.g., `france.json`)
- Territories: `{atlas}-territories-{resolution}.json`
- Metadata: `{atlas}-metadata-{resolution}.json`

### 9. Document Extraction Rules

Add comments in config files explaining extraction logic:

```json
{
  "extractionRules": [
    {
      "id": "FR-GP",
      "bounds": [[-61.81, 15.83], [-61.00, 16.52]],
      "_comment": "Guadeloupe - Caribbean islands at 16°N 61°W"
    }
  ]
}
```

### 10. Keep Scripts Idempotent

Scripts should produce the same output when run multiple times:
- Overwrite existing files (don't append)
- Clear state before processing
- Use deterministic sorting

---

**Built with TypeScript, AJV, and Natural Earth data** • [View Source](https://github.com/ShallowRed/atlas-composer/tree/main/scripts)
