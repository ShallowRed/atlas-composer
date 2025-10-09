# Atlas System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Available Atlases](#available-atlases)
6. [API Reference](#api-reference)
7. [Adding New Atlases](#adding-new-atlases)
8. [Advanced Usage](#advanced-usage)
9. [Best Practices](#best-practices)

## Overview

Atlas Composer's atlas system provides a robust, auto-discoverable framework for managing cartographic atlases. It transforms JSON configuration files into complete, type-safe atlas definitions that power the entire application.

### Key Features

- **Auto-Discovery**: Automatically loads all atlas configs from `configs/` folder using Vite's glob imports
- **JSON-Driven**: Define atlases declaratively in JSON with schema validation
- **Type Safety**: Full TypeScript support with compile-time validation
- **Multi-Pattern Support**: Supports both traditional (1 mainland + N overseas) and multi-mainland (N member-states) patterns
- **Flexible Architecture**: Easy to add new atlases without touching code
- **Well-Tested**: Comprehensive test coverage with integration tests

### Design Patterns

- **Registry Pattern**: Centralized auto-discovery and access via singleton
- **Adapter Pattern**: Transforms JSON configs into application-specific configurations
- **Strategy Pattern**: Supports different atlas patterns (traditional vs multi-mainland)
- **Factory Pattern**: Consistent configuration object creation

## Architecture

### Directory Structure

```
src/core/atlases/
├── loader.ts                  # JSON-to-config transformation adapter
├── registry.ts                # Singleton auto-discovery registry
├── utils.ts                   # Pure territory helper functions
└── constants.ts               # Atlas-related constants

configs/
├── schema.json                # JSON Schema for validation
├── france.json                # France atlas definition
├── portugal.json              # Portugal atlas definition
├── spain.json                 # Spain atlas definition (WIP)
└── eu.json                    # European Union atlas definition
```

### Components

#### 1. Atlas Loader (Adapter)

Transforms JSON configurations into typed application configurations. Provides:
- Territory extraction and transformation
- Projection parameter loading
- Mode and group configuration creation
- Composite projection defaults generation
- Support for traditional and multi-mainland patterns

#### 2. Atlas Registry (Singleton)

Auto-discovers and registers all atlas configurations. Provides:
- Automatic loading from `configs/` folder
- Centralized access to all atlases
- Validation and error handling
- Helper functions for common operations

#### 3. Territory Utilities

Pure helper functions for territory operations:
- Territory lookups and filtering
- Name resolution (full, short)
- Translation and scale calculations
- Mainland/overseas classification

#### 4. Constants

Application-wide constants:
- Default projection types by category
- Translation ranges for UI controls
- Scale ranges for territory adjustment

## Quick Start

### Using an Existing Atlas

```typescript
import {
  getAtlasConfig,
  getAtlasTerritories,
  getProjectionParams
} from '@/core/atlases/registry'

// Get complete atlas configuration
const config = getAtlasConfig('france')
console.log(config.name) // "France"
console.log(config.supportedViewModes) // ["split", "composite-existing", ...]

// Get territories
const { mainland, overseas, all } = getAtlasTerritories('france')
console.log(mainland.name) // "France Métropolitaine"
console.log(overseas.length) // 8 overseas territories

// Get projection parameters
const params = getProjectionParams('france')
console.log(params.center) // { longitude: 2.5, latitude: 46.5 }
console.log(params.parallels.conic) // [45.898889, 47.696014]
```

### Listing Available Atlases

```typescript
import { getAtlasIds, getAvailableAtlases } from '@/core/atlases/registry'

// Get list for UI selector
const atlases = getAvailableAtlases()
// Returns: [
//   { value: 'france', label: 'France' },
//   { value: 'portugal', label: 'Portugal' },
//   { value: 'eu', label: 'European Union' }
// ]

// Get just the IDs
const ids = getAtlasIds()
// Returns: ['france', 'portugal', 'spain', 'eu']
```

### Working with Territories

```typescript
import { getAtlasConfig, getAtlasTerritories } from '@/core/atlases/registry'
import {
  createTerritoryMap,
  getTerritoryName,
  getTerritoryShortName,
  isMainlandTerritory
} from '@/core/atlases/utils'

const { all } = getAtlasTerritories('france')
const territoryMap = createTerritoryMap(all)

// Get territory names
const fullName = getTerritoryName(territoryMap, 'FR-GP')
// Returns: "Guadeloupe"

const shortName = getTerritoryShortName(territoryMap, 'FR-MET')
// Returns: "Métropole"

// Check if mainland
const config = getAtlasConfig('france')
const isMet = isMainlandTerritory(
  'FR-MET',
  config.splitModeConfig.mainlandCode
)
// Returns: true
```

## Core Concepts

### Atlas

A complete cartographic atlas definition for a country or region. Includes:
- Identification (ID, name, description)
- Territory definitions (mainland, overseas, embedded)
- Projection parameters and preferences
- View modes and display options
- Composite projection configuration

**Example: France atlas**
- 1 mainland (Métropole)
- 8 overseas territories (DOM-TOM)
- Multiple view modes (split, composite, unified)
- Optimized conic conformal projection

### Territory

A geographic entity with its own geometry and rendering configuration:

```typescript
interface TerritoryConfig {
  code: string // Unique identifier (e.g., "FR-MET", "FR-GP")
  name: string // Full name (e.g., "France Métropolitaine")
  shortName?: string // Short name (e.g., "Métropole")
  region?: string // Geographic region (e.g., "Caraïbes")
  center: [number, number] // [longitude, latitude]
  bounds: [[number, number], [number, number]] // [[west, south], [east, north]]
  offset: [number, number] // [x, y] rendering offset
  projectionType?: string // Preferred projection (e.g., "mercator")
  scale?: number // Rendering scale
  rotate?: [number, number] // Projection rotation
  parallels?: [number, number] // Standard parallels for conic
  clipExtent?: [number, number, number, number] // Clipping bounds
  baseScaleMultiplier?: number // Scale adjustment factor
}
```

### Territory Roles

Defines the type and function of a territory:

- **`mainland`**: The principal territory (traditional pattern)
- **`overseas`**: Overseas territories distant from mainland
- **`embedded`**: Territories embedded within another (e.g., enclaves)
- **`member-state`**: Equal member states (multi-mainland pattern, e.g., EU)

### Atlas Patterns

#### Traditional Pattern (France, Portugal)

One mainland + N overseas territories:
```
France = {
  mainland: France Métropolitaine
  overseas: [Guadeloupe, Martinique, Guyane, ...]
}
```

#### Multi-Mainland Pattern (EU, Malaysia)

N equal mainlands + optional overseas:
```
EU = {
  mainlands: [France, Germany, Italy, Spain, ...]
  overseas: [French Guiana, Martinique, ...]
}
```

### View Modes

Display modes that determine how territories are rendered:

- **`split`**: Separate maps for each territory
- **`composite-existing`**: Pre-built composite projection (e.g., `conicConformalFrance`)
- **`composite-custom`**: Custom composite with adjustable territory positions
- **`unified`**: Single projection for all territories

Atlases can specify which view modes are supported:
```json
{
  "viewModes": ["composite-existing", "unified"],
  "defaultViewMode": "composite-existing"
}
```

### Projection Parameters

Atlas-specific projection configuration:

```typescript
interface ProjectionParams {
  center: {
    longitude: number // Center longitude for projections
    latitude: number // Center latitude for projections
  }
  rotate: {
    mainland: [number, number] // Rotation for mainland projection
    azimuthal: [number, number] // Rotation for azimuthal projections
  }
  parallels: {
    conic: [number, number] // Standard parallels for conic projections
  }
}
```

### Projection Preferences

Recommendations for suitable projections:

```typescript
interface ProjectionPreferences {
  recommended?: string[] // Array of recommended projection IDs
  default?: {
    mainland?: string // Default projection for mainland
    overseas?: string // Default projection for overseas
  }
  prohibited?: string[] // Projections that don't work well
}
```

**Example: France preferences**
```json
{
  "projectionPreferences": {
    "recommended": ["conic-conformal", "albers"],
    "default": {
      "mainland": "conic-conformal",
      "overseas": "mercator"
    },
    "prohibited": ["gnomonic", "orthographic"]
  }
}
```

### Territory Modes

Pre-defined territory selections for display:

```typescript
interface TerritoryModeConfig {
  label: string // Display label
  codes: string[] // Territory codes to include
}
```

**Example: France modes**
```json
{
  "modes": [
    {
      "id": "all-territories",
      "label": "Tous les territoires",
      "territories": ["FR-MET", "FR-GP", "FR-MQ", ...]
    },
    {
      "id": "caribbean",
      "label": "Caraïbes",
      "territories": ["FR-GP", "FR-MQ", "FR-BL", "FR-MF"]
    }
  ]
}
```

## Available Atlases

### France (`france`)

Traditional atlas with mainland France and 8 overseas territories.

**Configuration:**
- **Mainland**: France Métropolitaine
- **Overseas**: 8 DOM-TOM (Guadeloupe, Martinique, Guyane, etc.)
- **Projection**: Lambert Conformal Conic (standard parallels: 45.90°, 47.70°)
- **Center**: [2.5°, 46.5°]
- **View Modes**: All modes supported
- **Territory Modes**: 7 modes (all, Caribbean, Americas, Indian Ocean, Pacific, Atlantic, Antarctica)

**Recommended Projections:**
- Primary: `conic-conformal`, `albers`
- Mainland default: `conic-conformal`
- Overseas default: `mercator`

**Use Cases:**
- French national mapping
- DOM-TOM territorial planning
- Multi-territory cartography

### Portugal (`portugal`)

Traditional atlas with mainland Portugal, Azores, and Madeira.

**Configuration:**
- **Mainland**: Portugal Continental
- **Overseas**: 2 archipelagos (Azores, Madeira)
- **Projection**: Lambert Conformal Conic
- **Center**: [-8.5°, 39.5°]
- **View Modes**: All modes supported
- **Territory Modes**: 3 modes (all, mainland only, islands only)

**Recommended Projections:**
- Primary: `conic-conformal`, `albers`
- Mainland default: `conic-conformal`
- Overseas default: `mercator`

**Use Cases:**
- Portuguese national mapping
- Atlantic archipelago visualization
- Regional planning

### European Union (`eu`)

Multi-mainland atlas with 27 equal member states.

**Configuration:**
- **Mainlands**: 27 EU member states (all with `member-state` role)
- **Overseas**: 9 overseas territories (French DOM-TOM)
- **Projection**: Lambert Conformal Conic for Europe
- **Center**: [10.0°, 52.0°]
- **View Modes**: `composite-existing`, `unified` only (no split or custom composite)
- **Default View Mode**: `composite-existing`

**Note on Architecture:**
The EU atlas uses the **multi-mainland pattern** where all member states are treated equally. No single country is designated as "the mainland" - all 27 countries have equal status as `member-state` territories.

**Recommended Projections:**
- Primary: `conic-conformal-europe`
- All territories: `conic-conformal`

**Use Cases:**
- EU-wide mapping
- Pan-European data visualization
- Multi-state territorial analysis

### Spain (`spain`) - Work in Progress

Traditional atlas with mainland Spain and overseas territories.

**Configuration:**
- **Mainland**: Spain Continental
- **Overseas**: Canary Islands, Ceuta, Melilla
- **Status**: Under development

## API Reference

### Atlas Registry Functions

#### `getAtlasConfig(atlasId: string): AtlasConfig`

Get the complete atlas configuration for UI and rendering.

```typescript
const config = getAtlasConfig('france')

// Returns AtlasConfig with:
// - id, name
// - geoDataConfig (data paths, topology name)
// - supportedViewModes, defaultViewMode
// - compositeProjections, defaultCompositeProjection
// - compositeProjectionConfig (traditional or multi-mainland)
// - splitModeConfig (mainland info)
// - hasTerritorySelector, territoryModeOptions
```

#### `getAtlasSpecificConfig(atlasId: string): AtlasSpecificConfig`

Get atlas-specific configuration (projection params, modes, groups).

```typescript
const specific = getAtlasSpecificConfig('france')

// Returns:
// - projectionParams: ProjectionParams
// - territoryModes: Record<string, TerritoryModeConfig>
// - territoryGroups: Record<string, TerritoryGroupConfig>
// - defaultCompositeConfig: CompositeProjectionDefaults
// - projectionPreferences: ProjectionPreferences
```

#### `getLoadedConfig(atlasId: string): LoadedAtlasConfig`

Get the complete loaded configuration (all data).

```typescript
const loaded = getLoadedConfig('france')

// Returns:
// - atlasConfig: AtlasConfig
// - atlasSpecificConfig: AtlasSpecificConfig
// - territories: { mainland, overseas, all, mainlands? }
```

#### `getProjectionParams(atlasId: string): ProjectionParams`

Get projection parameters for an atlas.

```typescript
const params = getProjectionParams('france')
console.log(params.center) // { longitude: 2.5, latitude: 46.5 }
console.log(params.parallels.conic) // [45.898889, 47.696014]
console.log(params.rotate.mainland) // [-3, 0]
```

#### `getAtlasTerritories(atlasId: string)`

Get all territories for an atlas.

```typescript
const territories = getAtlasTerritories('france')

// Traditional pattern returns:
// {
//   mainland: TerritoryConfig,
//   overseas: TerritoryConfig[],
//   all: TerritoryConfig[]
// }

// Multi-mainland pattern returns:
// {
//   mainland: TerritoryConfig,      // First mainland (backward compat)
//   mainlands: TerritoryConfig[],   // All mainlands
//   overseas: TerritoryConfig[],
//   all: TerritoryConfig[]
// }
```

#### `getMainlandTerritory(atlasId: string): TerritoryConfig`

Get the mainland territory.

```typescript
const mainland = getMainlandTerritory('france')
console.log(mainland.name) // "France Métropolitaine"
console.log(mainland.code) // "FR-MET"
```

#### `getOverseasTerritories(atlasId: string): TerritoryConfig[]`

Get overseas territories.

```typescript
const overseas = getOverseasTerritories('france')
console.log(overseas.length) // 8
console.log(overseas[0].name) // "Guadeloupe"
```

#### `getAllTerritories(atlasId: string): TerritoryConfig[]`

Get all territories (mainland + overseas).

```typescript
const all = getAllTerritories('france')
console.log(all.length) // 9 (1 mainland + 8 overseas)
```

#### `getAllAtlases(): Record<string, AtlasConfig>`

Get all atlas configurations as a record.

```typescript
const atlases = getAllAtlases()
// Returns: { france: AtlasConfig, portugal: AtlasConfig, ... }
```

#### `getAvailableAtlases(): Array<{ value: string, label: string }>`

Get list of available atlases for UI selector.

```typescript
const options = getAvailableAtlases()
// Returns: [
//   { value: 'france', label: 'France' },
//   { value: 'portugal', label: 'Portugal' },
//   ...
// ]
```

#### `hasAtlas(atlasId: string): boolean`

Check if an atlas exists in the registry.

```typescript
if (hasAtlas('france')) {
  // Atlas exists
}
```

#### `getAtlasIds(): string[]`

Get list of all atlas IDs.

```typescript
const ids = getAtlasIds()
// Returns: ['france', 'portugal', 'spain', 'eu']
```

### Territory Utility Functions

#### `createTerritoryMap(territories: TerritoryConfig[]): Map<string, TerritoryConfig>`

Create a lookup map by territory code.

```typescript
const territories = getAllTerritories('france')
const map = createTerritoryMap(territories)
const guadeloupe = map.get('FR-GP')
```

#### `getTerritoryConfig(territories: Map<string, TerritoryConfig>, code: string): TerritoryConfig | undefined`

Get territory configuration from a map.

```typescript
const map = createTerritoryMap(getAllTerritories('france'))
const territory = getTerritoryConfig(map, 'FR-GP')
```

#### `getTerritoryName(territories: Map<string, TerritoryConfig>, code: string): string`

Get territory full name (or code if not found).

```typescript
const name = getTerritoryName(map, 'FR-GP')
// Returns: "Guadeloupe"
```

#### `getTerritoryShortName(territories: Map<string, TerritoryConfig>, code: string): string`

Get territory short name (or full name if no short name, or code if not found).

```typescript
const shortName = getTerritoryShortName(map, 'FR-MET')
// Returns: "Métropole"
```

#### `isMainlandTerritory(code: string | undefined, mainlandCode: string | undefined, geoDataMainlandCode?: string): boolean`

Check if a territory is the mainland.

```typescript
const config = getAtlasConfig('france')
const isMet = isMainlandTerritory('FR-MET', config.splitModeConfig.mainlandCode)
// Returns: true
```

#### `createDefaultTranslations(territories: TerritoryConfig[]): Record<string, { x: number, y: number }>`

Create default translations from territory offsets.

```typescript
const territories = getAllTerritories('france')
const translations = createDefaultTranslations(territories)
// Returns: { 'FR-MET': { x: 80, y: 0 }, 'FR-GP': { x: -336, y: -39 }, ... }
```

#### `extractTerritoryCodes(territories: TerritoryConfig[]): string[]`

Extract territory codes from configurations.

```typescript
const territories = getAllTerritories('france')
const codes = extractTerritoryCodes(territories)
// Returns: ['FR-MET', 'FR-GP', 'FR-MQ', ...]
```

#### `calculateDefaultProjections(territories: TerritoryConfig[], fallback?: string): Record<string, string>`

Calculate default projections from territory configuration.

```typescript
const projections = calculateDefaultProjections(territories, 'mercator')
// Returns: { 'FR-MET': 'conic-conformal', 'FR-GP': 'mercator', ... }
```

#### `calculateDefaultScales(territories: TerritoryConfig[]): Record<string, number>`

Calculate default scales (all 1.0).

```typescript
const scales = calculateDefaultScales(territories)
// Returns: { 'FR-MET': 1.0, 'FR-GP': 1.0, ... }
```

#### `getTerritoryByCode(territories: TerritoryConfig[], code: string): TerritoryConfig | undefined`

Get territory from an array by code.

```typescript
const territories = getAllTerritories('france')
const territory = getTerritoryByCode(territories, 'FR-GP')
```

#### `getTerritoriesForMode(territories: TerritoryConfig[], mode: string, modeConfig: Record<string, any>): TerritoryConfig[]`

Get territories for a specific mode.

```typescript
const territories = getAllTerritories('france')
const specific = getAtlasSpecificConfig('france')
const caribbeanTerritories = getTerritoriesForMode(
  territories,
  'caribbean',
  specific.territoryModes
)
// Returns: [Guadeloupe, Martinique, Saint-Barthélemy, Saint-Martin]
```

## Adding New Atlases

### Step 1: Research the Geography

Analyze the country's polygon structure using Natural Earth data:

```bash
# Look up the country
pnpm geodata:lookup "Netherlands"
# Output: Netherlands found with ID: 360

# Analyze polygon structure
pnpm geodata:analyze 360
```

The analysis will show:
- Main territory polygons
- Overseas territories
- Suggested extraction bounds
- Ready-to-use config snippets

### Step 2: Create JSON Configuration

Create a new file in `configs/` (e.g., `configs/netherlands.json`):

```json
{
  "$schema": "./schema.json",
  "id": "netherlands",
  "name": "Netherlands",
  "description": "Netherlands with Caribbean territories",

  "projectionPreferences": {
    "recommended": ["conic-conformal", "mercator"],
    "default": {
      "mainland": "conic-conformal",
      "overseas": "mercator"
    }
  },

  "territories": [
    {
      "id": "360",
      "role": "mainland",
      "code": "NL-EUR",
      "name": "Netherlands (European)",
      "shortName": "Nederland",
      "iso": "NLD",
      "center": [5.5, 52.3],
      "bounds": [[3.3, 50.7], [7.2, 53.5]],
      "extraction": {
        "mainlandPolygon": 1
      },
      "rendering": {
        "offset": [0, 0],
        "projectionType": "conic-conformal",
        "parallels": [51.5, 53.0]
      }
    },
    {
      "id": "360-AW",
      "role": "overseas",
      "code": "NL-AW",
      "name": "Aruba",
      "iso": "ABW",
      "region": "Caribbean",
      "center": [-70.0, 12.5],
      "bounds": [[-70.1, 12.4], [-69.9, 12.6]],
      "extraction": {
        "extractFrom": "360",
        "polygonBounds": [[-70.1, 12.4], [-69.9, 12.6]]
      },
      "rendering": {
        "offset": [-200, -100],
        "baseScaleMultiplier": 2.0
      }
    }
  ],

  "projection": {
    "center": { "longitude": 5.5, "latitude": 52.3 },
    "rotate": {
      "mainland": [-5.5, 0],
      "azimuthal": [-5.5, -52.3]
    },
    "parallels": {
      "conic": [51.5, 53.0]
    }
  },

  "modes": [
    {
      "id": "all-territories",
      "label": "All territories",
      "territories": ["NL-EUR", "NL-AW", "NL-CW", "NL-SX", "NL-BQ"]
    },
    {
      "id": "caribbean",
      "label": "Caribbean territories",
      "territories": ["NL-AW", "NL-CW", "NL-SX", "NL-BQ"]
    }
  ],

  "groups": [
    {
      "id": "caribbean",
      "label": "Caribbean",
      "territories": ["NL-AW", "NL-CW", "NL-SX", "NL-BQ"]
    }
  ]
}
```

### Step 3: Generate Geographic Data

Generate TopoJSON files from Natural Earth data:

```bash
pnpm geodata:prepare netherlands
```

This creates:
- `public/data/netherlands-territories-50m.json` - Geometry data
- `public/data/netherlands-metadata-50m.json` - Territory metadata

### Step 4: Validate Configuration

Ensure data and config are consistent:

```bash
pnpm geodata:validate netherlands
```

This checks:
- All configured territories have geometry data
- All geometry data has config entries
- Bounds are correct
- No missing references

### Step 5: Test the Atlas

The atlas is automatically discovered on next app load. No code changes needed!

```bash
pnpm dev
```

Navigate to the app and select "Netherlands" from the atlas dropdown.

### Configuration Schema Reference

The JSON schema (`configs/schema.json`) validates:

**Required Fields:**
- `id`: Unique atlas identifier (lowercase, no spaces)
- `name`: Display name
- `territories`: Array of territory objects

**Territory Object:**
- `id`: Natural Earth ID or extraction identifier
- `role`: `"mainland"` | `"overseas"` | `"embedded"` | `"member-state"`
- `code`: Unique territory code (e.g., "NL-EUR")
- `name`: Display name
- `center`: [longitude, latitude]
- `bounds`: [[west, south], [east, north]]
- `extraction`: How to extract geometry from Natural Earth
- `rendering`: Display and projection settings

**Optional Fields:**
- `description`: Atlas description
- `projectionPreferences`: Recommended projections
- `projection`: Projection parameters
- `modes`: Territory selection modes
- `groups`: Territory grouping
- `viewModes`: Supported view modes (defaults to all)
- `defaultViewMode`: Initial view mode (defaults to 'composite-custom')

### Multi-Mainland Atlas Example

For multi-mainland atlases (like EU), use `"member-state"` role:

```json
{
  "id": "asean",
  "name": "ASEAN",
  "viewModes": ["composite-existing", "unified"],
  "defaultViewMode": "composite-existing",

  "territories": [
    {
      "id": "702",
      "role": "member-state",
      "code": "SG",
      "name": "Singapore",
      ...
    },
    {
      "id": "458",
      "role": "member-state",
      "code": "MY",
      "name": "Malaysia",
      ...
    },
    {
      "id": "360",
      "role": "member-state",
      "code": "ID",
      "name": "Indonesia",
      ...
    }
  ]
}
```

## Advanced Usage

### Custom Territory Filtering

```typescript
import { getAllTerritories } from '@/core/atlases/registry'

// Get territories by region
function getTerritoriesByRegion(atlasId: string, region: string) {
  const territories = getAllTerritories(atlasId)
  return territories.filter(t => t.region === region)
}

// Get Caribbean territories from France
const caribbean = getTerritoriesByRegion('france', 'Caraïbes')
console.log(caribbean.map(t => t.name))
// ['Guadeloupe', 'Martinique', 'Saint-Barthélemy', 'Saint-Martin']
```

### Dynamic Mode Selection

```typescript
import { getAllTerritories, getAtlasSpecificConfig } from '@/core/atlases/registry'
import { getTerritoriesForMode } from '@/core/atlases/utils'

// Get territories for a mode dynamically
function selectMode(atlasId: string, modeId: string) {
  const specific = getAtlasSpecificConfig(atlasId)
  const allTerritories = getAllTerritories(atlasId)

  const selectedTerritories = getTerritoriesForMode(
    allTerritories,
    modeId,
    specific.territoryModes
  )

  return selectedTerritories
}

const pacificTerritories = selectMode('france', 'pacific')
// Returns: [New Caledonia, Wallis and Futuna, French Polynesia]
```

### Projection Preference Integration

```typescript
import { getAtlasSpecificConfig } from '@/core/atlases/registry'
import { ProjectionRegistry } from '@/core/projections/registry'

// Get recommended projections considering atlas preferences
function getAtlasRecommendations(atlasId: string, viewMode: string) {
  const specific = getAtlasSpecificConfig(atlasId)
  const preferences = specific.projectionPreferences

  const projectionRegistry = ProjectionRegistry.getInstance()
  const recommendations = projectionRegistry.recommend({
    atlasId,
    viewMode,
    limit: 5
  })

  // Filter out prohibited projections
  const filtered = preferences?.prohibited
    ? recommendations.filter(rec =>
        !preferences.prohibited!.includes(rec.definition.id)
      )
    : recommendations

  return filtered
}

const franceRecommendations = getAtlasRecommendations('france', 'split')
// Returns projections, excluding gnomonic and orthographic
```

### Multi-Pattern Handling

```typescript
import { getLoadedConfig } from '@/core/atlases/registry'

// Handle both traditional and multi-mainland patterns
function renderAtlas(atlasId: string) {
  const { territories, atlasConfig } = getLoadedConfig(atlasId)

  if (territories.type === 'traditional') {
    // Traditional pattern: 1 mainland + N overseas
    console.log(`Mainland: ${territories.mainland.name}`)
    console.log(`Overseas: ${territories.overseas.length}`)

    // Render with single mainland focus
    renderMainland(territories.mainland)
    territories.overseas.forEach(renderTerritory)
  }
  else {
    // Multi-mainland pattern: N equal mainlands
    console.log(`Member states: ${territories.mainlands!.length}`)
    console.log(`Overseas: ${territories.overseas.length}`)

    // Render all mainlands equally
    territories.mainlands!.forEach(renderTerritory)
    territories.overseas.forEach(renderTerritory)
  }
}
```

### Composite Projection Configuration

```typescript
import { getAtlasConfig } from '@/core/atlases/registry'

// Access composite projection config
function getCompositeConfig(atlasId: string) {
  const config = getAtlasConfig(atlasId)
  const compositeConfig = config.compositeProjectionConfig

  if (compositeConfig.type === 'traditional') {
    console.log('Traditional composite projection')
    console.log('Mainland:', compositeConfig.mainland.name)
    console.log('Overseas count:', compositeConfig.overseasTerritories.length)
  }
  else {
    console.log('Multi-mainland composite projection')
    console.log('Mainlands count:', compositeConfig.mainlands.length)
    console.log('Overseas count:', compositeConfig.overseasTerritories.length)
  }

  return compositeConfig
}
```

## Best Practices

### 1. Use the Registry for All Atlas Access

**❌ Don't** import JSON configs directly:
```typescript
// BAD - bypasses registry, no validation
import franceConfig from '@configs/france.json'
```

**✅ Do** use registry functions:
```typescript
// GOOD - validated, transformed, type-safe
import { getAtlasConfig } from '@/core/atlases/registry'

const config = getAtlasConfig('france')
```

### 2. Handle Multi-Pattern Atlases

**❌ Don't** assume traditional pattern:
```typescript
// BAD - breaks for multi-mainland atlases
const mainland = territories.mainland
```

**✅ Do** check pattern type:
```typescript
// GOOD - handles both patterns
if (territories.type === 'traditional') {
  const mainland = territories.mainland
}
else {
  const mainlands = territories.mainlands
}
```

### 3. Use Territory Maps for Lookups

**❌ Don't** use find() repeatedly:
```typescript
// BAD - O(n) for each lookup
territories.find(t => t.code === 'FR-GP')
territories.find(t => t.code === 'FR-MQ')
```

**✅ Do** create a map once:
```typescript
// GOOD - O(1) lookups
const map = createTerritoryMap(territories)
map.get('FR-GP')
map.get('FR-MQ')
```

### 4. Validate Atlas IDs

**❌ Don't** assume atlas exists:
```typescript
// BAD - may throw if atlas doesn't exist
const config = getAtlasConfig(userInput)
```

**✅ Do** validate first:
```typescript
// GOOD - safe access
if (hasAtlas(userInput)) {
  const config = getAtlasConfig(userInput)
}
else {
  const config = getAtlasConfig(DEFAULT_ATLAS)
}
```

### 5. Use Type Guards for Composite Configs

**❌ Don't** use unsafe access:
```typescript
// BAD - TypeScript error if multi-mainland
const mainland = config.compositeProjectionConfig.mainland
```

**✅ Do** use discriminated unions:
```typescript
// GOOD - type-safe access
const compositeConfig = config.compositeProjectionConfig
if (compositeConfig.type === 'traditional') {
  const mainland = compositeConfig.mainland
}
else {
  const mainlands = compositeConfig.mainlands
}
```

### 6. Leverage Projection Preferences

**❌ Don't** hardcode projections:
```typescript
// BAD - ignores atlas-specific recommendations
const projection = 'mercator'
```

**✅ Do** use preferences:
```typescript
// GOOD - respects atlas recommendations
const specific = getAtlasSpecificConfig(atlasId)
const projection = specific.projectionPreferences?.default?.mainland
  || 'conic-conformal'
```

### 7. Use Territory Modes for UI

**❌ Don't** hardcode territory lists:
```typescript
// BAD - not configurable
const caribbeanCodes = ['FR-GP', 'FR-MQ', 'FR-BL', 'FR-MF']
```

**✅ Do** use configured modes:
```typescript
// GOOD - configurable, validated
const specific = getAtlasSpecificConfig('france')
const caribbeanMode = specific.territoryModes.caribbean
const codes = caribbeanMode.codes
```

### 8. Add Schema Validation

When creating new atlases, validate against schema:

```bash
# Validate before committing
pnpm geodata:validate netherlands
```

This catches:
- Missing required fields
- Invalid role values
- Bounds/extraction issues
- Data mismatches

### 9. Document Territory Extractions

In your JSON config, comment extraction decisions:

```json
{
  "territories": [
    {
      "id": "250-GP",
      "extraction": {
        "extractFrom": "250",
        "polygonBounds": [[-61.81, 15.83], [-61.0, 16.51]]
      },
      "// NOTE": "Bounds determined from pnpm geodata:analyze 250"
    }
  ]
}
```

### 10. Test Both View Modes

When adding atlases, test all supported view modes:
- Split view (individual territories)
- Composite-existing (pre-built projection)
- Composite-custom (adjustable positioning)
- Unified (single projection)

Ensure territories render correctly in each mode.

---

## Troubleshooting

### Atlas Not Appearing in Dropdown

**Cause**: Config file issues or auto-discovery failure

**Solutions**:
1. Check filename is `*.json` in `configs/`
2. Verify not in excluded list (`schema.json`, `README.md`)
3. Check console for loading errors
4. Validate required fields: `id`, `name`, `territories`

### Territory Not Rendering

**Cause**: Missing geometry or config mismatch

**Solutions**:
1. Run `pnpm geodata:validate <atlas>`
2. Check territory code matches between config and data
3. Verify polygon extraction bounds are correct
4. Check `public/data/` has generated files

### Projection Not Working

**Cause**: Invalid projection parameters or missing preferences

**Solutions**:
1. Check `projectionParams` in config
2. Verify projection ID exists in projection registry
3. Check center/parallels are valid coordinates
4. Review prohibited projections list

### Multi-Mainland Atlas Breaks

**Cause**: Code assumes traditional pattern

**Solutions**:
1. Use type guards: `if (territories.type === 'multi-mainland')`
2. Check `compositeProjectionConfig.type`
3. Don't assume `mainland` exists - check pattern
4. Set `viewModes` to exclude unsupported modes

---

**For more information:**
- [Projection System Documentation](./PROJECTIONS.md)
- [Main README](../README.md)
- [Configuration Schema](../configs/schema.json)
- [Natural Earth Data](https://www.naturalearthdata.com/)

*Built with ❤️ for better atlas management*
