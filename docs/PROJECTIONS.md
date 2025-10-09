# Projection System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Available Projections](#available-projections)
6. [API Reference](#api-reference)
7. [Adding New Projections](#adding-new-projections)
8. [Advanced Usage](#advanced-usage)
9. [Best Practices](#best-practices)

## Overview

Atlas Composer's projection system provides a type-safe, metadata-rich framework for managing geographic projections. It includes intelligent recommendations, context-aware filtering, and support for 20+ projections from standard D3 projections to specialized composite projections.

### Key Features

- **Type Safety**: Full TypeScript support with compile-time validation
- **Metadata-Rich**: Each projection includes capabilities, suitability scores, and usage recommendations
- **Smart Recommendations**: Context-aware scoring algorithm based on atlas, view mode, and geographic fit
- **Extensible**: Simple definition files for adding new projections
- **Well-Tested**: 79 unit and integration tests with 100% pass rate

### Design Patterns

- **Registry Pattern**: Centralized projection definitions via singleton
- **Strategy Pattern**: Pluggable projection implementations (D3 builtin, extended, composite)
- **Factory Pattern**: Consistent projection instance creation

## Architecture

### Directory Structure

```
src/projections/
├── types.ts                    # TypeScript type definitions
├── registry.ts                 # Singleton projection registry
├── factory.ts                  # Projection factory
├── recommender.ts             # Smart recommendation engine
├── definitions/                # Projection definitions by category
│   ├── index.ts               # Re-exports all definitions
│   ├── composite.ts           # Composite projections (France, Portugal, EU)
│   ├── conic.ts               # Conic projections
│   ├── azimuthal.ts           # Azimuthal projections
│   ├── cylindrical.ts         # Cylindrical projections
│   ├── world.ts               # World projections
│   └── artistic.ts            # Artistic/historical projections
└── __tests__/                 # Test suite
    ├── registry.test.ts       # Registry tests (34 tests)
    ├── factory.test.ts        # Factory tests (26 tests)
    └── integration.test.ts    # Integration tests (19 tests)
```

### Components

#### 1. ProjectionRegistry (Singleton)

Central registry for all projection definitions. Provides:
- Registration and retrieval of projections
- Filtering by category, family, or capabilities
- Smart recommendations based on context
- Case-insensitive lookup with alias support

#### 2. ProjectionFactory (Factory)

Creates D3 projection instances from definitions. Supports:
- All D3 builtin projections (`d3-geo`)
- Extended projections (`d3-geo-projection`)
- Composite projections (`d3-composite-projections`)
- Parameter application (center, scale, parallels, etc.)

#### 3. ProjectionRecommender

Scoring algorithm that ranks projections based on:
- Atlas-specific recommendations (`+50` points)
- Geographic suitability scores (0-100)
- Capability matching (view mode requirements)
- Usage priority (composite > extended > builtin)

## Quick Start

### Basic Usage

```typescript
import { ProjectionFactory } from '@/projections/factory'
import { ProjectionRegistry } from '@/projections/registry'

// Get registry instance
const registry = ProjectionRegistry.getInstance()

// Get a projection by ID
const def = registry.get('mercator')

// Create projection instance
const factory = ProjectionFactory.getInstance()
const projection = factory.create({
  projection: def,
  center: [0, 0],
  scale: 150
})

// Use with D3
selection
  .selectAll('path')
  .data(features)
  .enter()
  .append('path')
  .attr('d', d3.geoPath().projection(projection))
```

### Getting Recommendations

```typescript
// Get recommendations for France in split view
const recommendations = registry.recommend({
  atlasId: 'france',
  viewMode: 'split',
  limit: 5
})

recommendations.forEach((rec) => {
  console.log(`${rec.definition.name} - Score: ${rec.score}`)
})

// Expected output:
// "France (Lambert conformal conic)" - Score: 150
// "Lambert conformal conic" - Score: 80
// "Albers" - Score: 75
```

### Filtering Projections

```typescript
// Get all conic projections
const conicProjections = registry.filter({
  family: 'conic'
})

// Get projections that support split view
const splitViewProjections = registry.filter({
  viewMode: 'split'
})

// Get projections suitable for mid-latitudes
const midLatProjections = registry.filter({
  suitability: {
    midLatitude: { min: 70 }
  }
})
```

## Core Concepts

### Projection Definition

Each projection is defined with comprehensive metadata:

```typescript
interface ProjectionDefinition {
  // Identification
  id: string // Unique identifier (e.g., 'mercator')
  name: string // Display name
  aliases?: string[] // Alternative names

  // Classification
  category: ProjectionCategory // RECOMMENDED | STANDARD | SPECIALIZED | ARTISTIC
  family: ProjectionFamily // conic | azimuthal | cylindrical | etc.
  strategy: ProjectionStrategy // D3_BUILTIN | D3_EXTENDED | D3_COMPOSITE

  // Technical details
  d3Name: string // D3 function name
  defaultParameters?: ProjectionParameters

  // Context awareness
  capabilities: ProjectionCapabilities // What it preserves/supports
  suitability: ProjectionSuitability // Geographic fit scores
  recommendedForAtlases?: string[] // Atlas IDs (e.g., ['france'])

  // Documentation
  description: string
  useCases?: string[]
}
```

### Capabilities

Describes what the projection preserves or supports:

```typescript
interface ProjectionCapabilities {
  preservesArea?: boolean // Equal area projection
  preservesAngles?: boolean // Conformal projection
  preservesDistance?: boolean // Equidistant from center
  preservesDirection?: boolean // Azimuthal

  supportsSplit?: boolean // Can be used in split view
  supportsGraticule?: boolean // Works with graticule overlay
  supportsClipping?: boolean // Supports custom clipping
}
```

### Suitability Scores

Geographic context scores (0-100):

```typescript
interface ProjectionSuitability {
  polar?: number // 0-100: Arctic/Antarctic regions
  midLatitude?: number // 0-100: Temperate zones (30-60°)
  equatorial?: number // 0-100: Tropical zones (±30°)
  global?: number // 0-100: World maps
  regional?: number // 0-100: Country/region maps

  france?: number // Atlas-specific scores
  portugal?: number
  eu?: number
}
```

### Recommendation Context

Context provided when requesting recommendations:

```typescript
interface ProjectionFilterContext {
  atlasId?: string // 'france' | 'portugal' | 'spain' | 'eu'
  viewMode?: ViewMode // 'composite' | 'split' | 'individual'
  category?: ProjectionCategory
  family?: ProjectionFamily
  capabilities?: Partial<ProjectionCapabilities>
  suitability?: Record<string, { min?: number, max?: number }>
  limit?: number // Max results
}
```

## Available Projections

### Composite Projections (Category: RECOMMENDED)

Specialized projections for countries with overseas territories.

#### `conic-conformal-france`
- **Name**: France (Lambert conformal conic)
- **Family**: composite
- **Strategy**: D3_COMPOSITE
- **Use Cases**: Displaying France with DOM-TOM territories
- **Capabilities**: Conformal, supports split view
- **Suitability**: france: 100, midLatitude: 90

#### `conic-conformal-portugal`
- **Name**: Portugal (Lambert conformal conic)
- **Family**: composite
- **Strategy**: D3_COMPOSITE
- **Use Cases**: Displaying Portugal with Azores and Madeira
- **Capabilities**: Conformal, supports split view
- **Suitability**: portugal: 100, midLatitude: 85

#### `conic-conformal-europe`
- **Name**: Europe (Lambert conformal conic)
- **Family**: composite
- **Strategy**: D3_COMPOSITE
- **Use Cases**: Displaying EU member states with overseas territories
- **Capabilities**: Conformal, supports split view
- **Suitability**: eu: 100, midLatitude: 90, regional: 95

### Conic Projections (Category: STANDARD)

Best for mid-latitude regions.

#### `conic-conformal`
- **Name**: Lambert conformal conic
- **Aliases**: `conicConformal`, `lambert`
- **Family**: conic
- **Strategy**: D3_BUILTIN
- **Use Cases**: Regional maps, accurate shapes
- **Capabilities**: Conformal, supports split view
- **Suitability**: midLatitude: 85, regional: 80
- **Parameters**: parallels (standard parallels)

#### `albers`
- **Name**: Albers
- **Aliases**: `albersUsa`, `conicEqualArea`
- **Family**: conic
- **Strategy**: D3_BUILTIN
- **Use Cases**: Choropleth maps, equal area
- **Capabilities**: Equal area, supports split view
- **Suitability**: midLatitude: 80, regional: 75
- **Parameters**: parallels

### Azimuthal Projections (Category: STANDARD)

Best for polar regions or centered on a specific point.

#### `azimuthal-equal-area`
- **Name**: Lambert azimuthal equal-area
- **Aliases**: `azimuthalEqualArea`, `lambertAzimuthal`
- **Family**: azimuthal
- **Strategy**: D3_BUILTIN
- **Use Cases**: Polar regions, equal area
- **Capabilities**: Equal area, preserves direction, supports split view
- **Suitability**: polar: 95, regional: 70

#### `azimuthal-equidistant`
- **Name**: Azimuthal equidistant
- **Aliases**: `azimuthalEquidistant`
- **Family**: azimuthal
- **Strategy**: D3_BUILTIN
- **Use Cases**: Distance from center, polar navigation
- **Capabilities**: Preserves distance from center, supports split view
- **Suitability**: polar: 90, regional: 65

#### `stereographic`
- **Name**: Stereographic
- **Family**: azimuthal
- **Strategy**: D3_BUILTIN
- **Use Cases**: Polar regions, conformal
- **Capabilities**: Conformal, preserves angles, supports split view
- **Suitability**: polar: 90, midLatitude: 60

#### `orthographic`
- **Name**: Orthographic
- **Family**: azimuthal
- **Strategy**: D3_BUILTIN
- **Use Cases**: Globe view, satellite perspective
- **Capabilities**: Supports clipping, supports split view
- **Suitability**: global: 50, regional: 40

### Cylindrical Projections (Category: STANDARD)

Best for world maps and navigation.

#### `mercator`
- **Name**: Mercator
- **Aliases**: `MERCATOR`
- **Family**: cylindrical
- **Strategy**: D3_BUILTIN
- **Use Cases**: Web maps (Web Mercator), navigation
- **Capabilities**: Conformal, supports split view
- **Suitability**: equatorial: 85, global: 60

#### `equirectangular`
- **Name**: Equirectangular (Plate Carrée)
- **Aliases**: `plateCarree`
- **Family**: cylindrical
- **Strategy**: D3_BUILTIN
- **Use Cases**: Simple rectangular projection
- **Capabilities**: Supports split view, supports graticule
- **Suitability**: global: 55, equatorial: 70

### World Projections (Category: STANDARD)

Compromise projections for world maps.

#### `natural-earth`
- **Name**: Natural Earth
- **Aliases**: `naturalEarth1`
- **Family**: pseudocylindrical
- **Strategy**: D3_EXTENDED
- **Use Cases**: Visually appealing world maps
- **Capabilities**: Compromise projection, supports split view
- **Suitability**: global: 90

#### `robinson`
- **Name**: Robinson
- **Family**: pseudocylindrical
- **Strategy**: D3_EXTENDED
- **Use Cases**: World maps (National Geographic standard)
- **Capabilities**: Compromise projection, supports split view
- **Suitability**: global: 85

#### `eckert4`
- **Name**: Eckert IV
- **Family**: pseudocylindrical
- **Strategy**: D3_EXTENDED
- **Use Cases**: Equal-area world maps
- **Capabilities**: Equal area, supports split view
- **Suitability**: global: 80

#### `winkel-tripel`
- **Name**: Winkel Tripel
- **Aliases**: `winkelTripel`, `winkel3`
- **Family**: modified
- **Strategy**: D3_EXTENDED
- **Use Cases**: General reference world maps
- **Capabilities**: Compromise projection, supports split view
- **Suitability**: global: 85

### Artistic Projections (Category: ARTISTIC)

Unique visual styles for special purposes.

#### `armadillo`
- **Name**: Armadillo
- **Family**: polyhedral
- **Strategy**: D3_EXTENDED
- **Use Cases**: Artistic world maps
- **Suitability**: global: 40

#### `polyhedral-butterfly`
- **Name**: Polyhedral Butterfly
- **Aliases**: `butterfly`
- **Family**: polyhedral
- **Strategy**: D3_EXTENDED
- **Use Cases**: Unfolded globe, educational
- **Suitability**: global: 45

#### `loximuthal`
- **Name**: Loximuthal
- **Family**: pseudocylindrical
- **Strategy**: D3_EXTENDED
- **Use Cases**: Maritime navigation, rhumb lines
- **Suitability**: global: 50, equatorial: 60

#### `polyhedral-waterman`
- **Name**: Waterman Butterfly
- **Aliases**: `waterman`
- **Family**: polyhedral
- **Strategy**: D3_EXTENDED
- **Use Cases**: Minimal area distortion
- **Capabilities**: Compromise projection
- **Suitability**: global: 55

## API Reference

### ProjectionRegistry

Singleton registry for managing projection definitions.

#### `getInstance(): ProjectionRegistry`

Get the singleton instance.

```typescript
const registry = ProjectionRegistry.getInstance()
```

#### `get(id: string): ProjectionDefinition | undefined`

Retrieve a projection by ID (case-insensitive) or alias.

```typescript
const mercator = registry.get('mercator')
const same = registry.get('MERCATOR') // Case-insensitive
const alias = registry.get('lambert') // Alias for 'conic-conformal'
```

#### `getAll(): ProjectionDefinition[]`

Get all registered projections.

```typescript
const allProjections = registry.getAll()
console.log(`Total projections: ${allProjections.length}`)
```

#### `filter(context: ProjectionFilterContext): ProjectionDefinition[]`

Filter projections by criteria.

```typescript
// By category
const recommended = registry.filter({ category: 'RECOMMENDED' })

// By family
const conics = registry.filter({ family: 'conic' })

// By capabilities
const equalArea = registry.filter({
  capabilities: { preservesArea: true }
})

// By suitability
const midLat = registry.filter({
  suitability: { midLatitude: { min: 80 } }
})

// Combined
const franceProjections = registry.filter({
  atlasId: 'france',
  viewMode: 'split',
  category: 'RECOMMENDED'
})
```

#### `recommend(context: ProjectionFilterContext): ProjectionRecommendation[]`

Get ranked recommendations based on context.

```typescript
const recommendations = registry.recommend({
  atlasId: 'france',
  viewMode: 'composite',
  limit: 3
})

recommendations.forEach((rec) => {
  console.log(`${rec.definition.name} - Score: ${rec.score}`)
  console.log(`Reason: ${rec.reason}`)
})
```

#### `isValid(id: string): boolean`

Check if a projection ID exists.

```typescript
if (registry.isValid('mercator')) {
  // Safe to use
}
```

#### `getByCategory(category: ProjectionCategory): ProjectionDefinition[]`

Get all projections in a category.

```typescript
const recommended = registry.getByCategory('RECOMMENDED')
const standard = registry.getByCategory('STANDARD')
```

#### `getByFamily(family: ProjectionFamily): ProjectionDefinition[]`

Get all projections in a family.

```typescript
const conics = registry.getByFamily('conic')
const azimuthals = registry.getByFamily('azimuthal')
```

### ProjectionFactory

Factory for creating D3 projection instances.

#### `getInstance(): ProjectionFactory`

Get the singleton instance.

```typescript
const factory = ProjectionFactory.getInstance()
```

#### `create(options: ProjectionOptions): GeoProjection`

Create a projection instance from a definition.

```typescript
interface ProjectionOptions {
  projection: ProjectionDefinition
  center?: [number, number]
  scale?: number
  parallels?: [number, number]
  translate?: [number, number]
  rotate?: [number, number, number?]
  clipAngle?: number
  precision?: number
}

const projection = factory.create({
  projection: registry.get('mercator')!,
  center: [2.5, 46.5],
  scale: 2500,
  translate: [width / 2, height / 2]
})
```

#### `createById(id: string, params?: Partial<ProjectionOptions>): GeoProjection`

Convenience method to create by ID.

```typescript
const projection = factory.createById('mercator', {
  center: [0, 0],
  scale: 150
})
```

### ProjectionRecommender

Smart recommendation engine (used internally by registry).

#### `score(definition: ProjectionDefinition, context: ProjectionFilterContext): number`

Calculate score for a projection in a given context.

```typescript
import { ProjectionRecommender } from '@/projections/recommender'

const recommender = new ProjectionRecommender()
const score = recommender.score(
  registry.get('conic-conformal-france')!,
  { atlasId: 'france', viewMode: 'composite' }
)
// Returns: 150 (recommended atlas: +50, france suitability: 100)
```

#### Scoring Algorithm

1. **Atlas Recommendation** (+50 points)
   - If projection is in `recommendedForAtlases` for the current atlas

2. **Suitability Score** (0-100 points)
   - Atlas-specific: `suitability.france`, `suitability.portugal`, etc.
   - Geographic: `suitability.midLatitude`, `suitability.global`, etc.

3. **Strategy Priority** (+10, +5, or 0 points)
   - Composite projections: +10
   - Extended projections: +5
   - Builtin projections: 0

## Adding New Projections

### Step 1: Define the Projection

Choose the appropriate definition file based on family:
- `composite.ts` - Composite projections
- `conic.ts` - Conic projections
- `azimuthal.ts` - Azimuthal projections
- `cylindrical.ts` - Cylindrical projections
- `world.ts` - World/compromise projections
- `artistic.ts` - Artistic/special projections

Example: Adding a new conic projection

```typescript
// src/projections/definitions/conic.ts

export const myConicProjection: ProjectionDefinition = {
  id: 'my-conic',
  name: 'My Conic Projection',
  aliases: ['myConic'],

  category: 'STANDARD',
  family: 'conic',
  strategy: 'D3_BUILTIN',

  d3Name: 'geoConicConformal',
  defaultParameters: {
    parallels: [20, 50]
  },

  capabilities: {
    preservesAngles: true,
    supportsSplit: true,
    supportsGraticule: true
  },

  suitability: {
    midLatitude: 85,
    regional: 80
  },

  recommendedForAtlases: ['spain'],

  description: 'Custom conic projection optimized for Spain',
  useCases: [
    'Regional maps of Spain',
    'Accurate shape representation'
  ]
}

// Add to definitions array
export const conicDefinitions: ProjectionDefinition[] = [
  conicConformal,
  albers,
  myConicProjection // Add here
]
```

### Step 2: Export the Definition

Update `definitions/index.ts`:

```typescript
export * from './conic'
// Definition is automatically included via array export
```

### Step 3: Add Tests

Create tests in `__tests__/`:

```typescript
// __tests__/my-projection.test.ts
import { describe, expect, it } from 'vitest'
import { ProjectionFactory } from '../factory'
import { ProjectionRegistry } from '../registry'

describe('My Conic Projection', () => {
  it('should be registered', () => {
    const registry = ProjectionRegistry.getInstance()
    const def = registry.get('my-conic')
    expect(def).toBeDefined()
    expect(def?.name).toBe('My Conic Projection')
  })

  it('should create projection instance', () => {
    const factory = ProjectionFactory.getInstance()
    const projection = factory.createById('my-conic')
    expect(projection).toBeDefined()
    expect(typeof projection).toBe('function')
  })

  it('should be recommended for Spain', () => {
    const registry = ProjectionRegistry.getInstance()
    const recommendations = registry.recommend({
      atlasId: 'spain',
      limit: 5
    })
    const ids = recommendations.map(r => r.definition.id)
    expect(ids).toContain('my-conic')
  })
})
```

### Step 4: Run Tests

```bash
pnpm test
```

### Adding Composite Projections

For composite projections from `d3-composite-projections`:

```typescript
// src/projections/definitions/composite.ts

export const myCompositeProjection: ProjectionDefinition = {
  id: 'my-composite',
  name: 'My Composite Projection',

  category: 'RECOMMENDED',
  family: 'composite',
  strategy: 'D3_COMPOSITE',

  d3Name: 'geoMyComposite', // Must match d3-composite-projections export

  capabilities: {
    preservesAngles: true,
    supportsSplit: true
  },

  suitability: {
    myCountry: 100,
    midLatitude: 90
  },

  recommendedForAtlases: ['my-atlas'],

  description: 'Composite projection for My Country with territories',
  useCases: ['Displaying My Country with overseas territories']
}
```

**Important**: Ensure the projection is available in `d3-composite-projections` and imported in `factory.ts`.

## Advanced Usage

### Custom Filtering Logic

```typescript
// Get projections suitable for polar regions with equal area
const polarEqualArea = registry.getAll().filter(def =>
  (def.suitability.polar ?? 0) > 80
  && def.capabilities.preservesArea === true
)

// Get conformal projections for mid-latitudes
const conformalMidLat = registry.getAll().filter(def =>
  def.capabilities.preservesAngles === true
  && (def.suitability.midLatitude ?? 0) > 75
)
```

### Dynamic Projection Selection

```typescript
// Select projection based on territory bounds
function selectProjectionForBounds(bounds: [[number, number], [number, number]]) {
  const [[west, south], [east, north]] = bounds
  const centerLat = (south + north) / 2

  if (Math.abs(centerLat) > 60) {
    // Polar region
    return registry.recommend({
      suitability: { polar: { min: 80 } },
      limit: 1
    })[0]
  }
  else if (Math.abs(centerLat) > 30) {
    // Mid-latitude
    return registry.recommend({
      family: 'conic',
      suitability: { midLatitude: { min: 75 } },
      limit: 1
    })[0]
  }
  else {
    // Equatorial
    return registry.recommend({
      suitability: { equatorial: { min: 75 } },
      limit: 1
    })[0]
  }
}
```

### Projection Comparison

```typescript
// Compare multiple projections
function compareProjections(ids: string[], atlas: string) {
  const results = ids.map((id) => {
    const def = registry.get(id)
    if (!def)
      return null

    const recommendations = registry.recommend({ atlasId: atlas, limit: 100 })
    const rec = recommendations.find(r => r.definition.id === id)

    return {
      id,
      name: def.name,
      score: rec?.score ?? 0,
      capabilities: def.capabilities,
      suitability: def.suitability
    }
  }).filter(Boolean)

  return results.sort((a, b) => b!.score - a!.score)
}

const comparison = compareProjections(
  ['mercator', 'conic-conformal', 'conic-conformal-france'],
  'france'
)
```

### Custom Scoring

```typescript
// Implement custom scoring logic
function customScore(def: ProjectionDefinition, requirements: any): number {
  let score = 0

  // Prioritize equal area for choropleth maps
  if (requirements.mapType === 'choropleth' && def.capabilities.preservesArea) {
    score += 50
  }

  // Prioritize conformal for navigation
  if (requirements.mapType === 'navigation' && def.capabilities.preservesAngles) {
    score += 50
  }

  // Add suitability score
  score += def.suitability[requirements.region] ?? 0

  return score
}
```

## Best Practices

### 1. Use Composite Projections for Multi-Territory Atlases

```typescript
// ✅ Good - Use dedicated composite projection
const projection = factory.createById('conic-conformal-france', {
  scale: 2500
})

// ❌ Bad - Using basic projection for composite atlas
const projection = factory.createById('mercator') // Won't position territories correctly
```

### 2. Let the Recommender Choose

```typescript
// ✅ Good - Use recommender for context-aware selection
const [best] = registry.recommend({
  atlasId: currentAtlas,
  viewMode: currentMode,
  limit: 1
})

// ❌ Bad - Hardcoding projection IDs
const projection = registry.get('mercator') // May not be optimal
```

### 3. Check Capabilities Before Using

```typescript
// ✅ Good - Verify capabilities
const def = registry.get(projectionId)
if (def?.capabilities.supportsSplit && viewMode === 'split') {
  // Safe to use in split view
}

// ❌ Bad - Assuming capabilities
const projection = factory.createById(projectionId) // May fail in split view
```

### 4. Use Type Guards

```typescript
// ✅ Good - Type-safe access
const def = registry.get(projectionId)
if (def) {
  const projection = factory.create({ projection: def })
}

// ❌ Bad - Assuming existence
const projection = factory.createById(projectionId) // Throws if ID doesn't exist
```

### 5. Cache Projection Instances

```typescript
// ✅ Good - Reuse projection instances
const projectionCache = new Map<string, GeoProjection>()

function getProjection(id: string, params: any) {
  const key = `${id}-${JSON.stringify(params)}`
  if (!projectionCache.has(key)) {
    projectionCache.set(key, factory.createById(id, params))
  }
  return projectionCache.get(key)!
}

// ❌ Bad - Creating new instance every time
function render() {
  const projection = factory.createById('mercator') // Expensive
  // ...
}
```

### 6. Handle Errors Gracefully

```typescript
// ✅ Good - Error handling
try {
  const projection = factory.createById(userSelectedId)
  renderMap(projection)
}
catch (error) {
  console.error('Invalid projection:', error)
  // Fall back to default
  const fallback = factory.createById('natural-earth')
  renderMap(fallback)
}
```

### 7. Document Custom Projections

```typescript
// ✅ Good - Comprehensive definition
export const myProjection: ProjectionDefinition = {
  // ... all required fields
  description: 'Detailed description of when and why to use this projection',
  useCases: [
    'Specific use case 1',
    'Specific use case 2'
  ]
}
```

### 8. Test New Projections Thoroughly

```typescript
// ✅ Good - Comprehensive test coverage
describe('My Projection', () => {
  it('should be registered')
  it('should create valid instance')
  it('should have correct capabilities')
  it('should be recommended for correct atlas')
  it('should handle parameters correctly')
  it('should work in split view if supported')
})
```

---

**For questions or contributions, please see the main [README](../README.md).**
