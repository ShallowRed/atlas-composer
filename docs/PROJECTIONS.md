# Projection System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)

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

### Component Flow

1. **Definitions**: Projections are defined in modular files by category
2. **Registry**: Singleton registry auto-loads all definitions
3. **Factory**: Factory creates projection instances based on definitions
4. **Recommender**: Recommendation engine scores and filters projections based on context

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

## Related Documentation

- 📖 [Adding New Atlas Guide](./ADDING_NEW_ATLAS.md) - Step-by-step tutorial for creating new atlases
- 📖 [Projections Documentation](./PROJECTIONS.md) - Projection system, recommendations, and catalog
- 📖 [Scripts Documentation](./SCRIPTS.md) - CLI tools for geodata preparation and validation
- 📖 [Main README](../README.md) - Project overview and quick start
