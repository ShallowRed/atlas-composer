# Atlas System Documentation

Complete reference for Atlas Composer's atlas management system. This documentation covers its architecture and core concepts.

> **📖 Want to add a new atlas?** See the [Adding New Atlas Guide](./ADDING_NEW_ATLAS.md) for step-by-step instructions.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)

## Overview

The Atlas System is the foundation of Atlas Composer, providing a robust, auto-discoverable framework for managing cartographic atlases with complex territory arrangements.

### Key Features

- **Auto-Discovery**: Automatically loads all atlas configs from `configs/` folder
- **JSON-Driven**: Define atlases declaratively with JSON Schema validation
- **Type Safety**: Full TypeScript support with compile-time checking
- **Multi-Pattern Support**: Single-focus, equal-members, and hierarchical patterns
- **Zero Code Changes**: Add new atlases without touching application code
- **Projection Intelligence**: Context-aware projection recommendations

### Design Patterns

| Pattern | Component | Purpose |
|---------|-----------|---------|
| **Registry** | `registry.ts` | Centralized auto-discovery and access |
| **Adapter** | `loader.ts` | JSON-to-TypeScript config transformation |
| **Strategy** | Territory patterns | Support for different atlas structures |
| **Factory** | Config creation | Consistent object instantiation |

## Architecture

### Directory Structure

```
src/core/atlases/
├── loader.ts           # Config adapter (JSON → TypeScript)
├── registry.ts         # Singleton registry with auto-discovery
├── utils.ts            # Territory helper functions
└── constants.ts        # Default values and constants

configs/
├── schema.json         # JSON Schema for validation
├── france.json         # France atlas configuration
├── portugal.json       # Portugal atlas configuration
├── spain.json          # Spain atlas configuration (WIP)
└── eu.json             # European Union atlas configuration

src/public/data/
├── world-countries-*.json        # Natural Earth world data
├── france-territories-*.json     # France territory geometries
├── france-metadata-*.json        # France territory metadata
└── [atlas]-*.json                # Other atlas data files
```

### Component Flow

```
┌─────────────────┐
│  JSON Configs   │  configs/*.json
│  (User-defined) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Schema Validator│  Validates against schema.json
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Loader/Adapter │  Transforms JSON → TypeScript
│  (loader.ts)    │  Creates AtlasConfig objects
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Registry       │  Singleton, auto-discovers all atlases
│  (registry.ts)  │  Provides query & access APIs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Application    │  Components, stores, services
│  (Vue/Pinia)    │  Use registry to access atlases
└─────────────────┘
```

### How Auto-Discovery Works

1. **Build Time**: Vite glob imports scan `configs/*.json`
2. **Load Time**: Registry loads and validates each config
3. **Transform**: Loader adapts JSON to TypeScript interfaces
4. **Register**: Each atlas is registered by ID
5. **Ready**: Application can query registry for atlases

## Core Concepts

### Atlas Patterns

Atlas Composer supports three fundamental territory organization patterns:

#### 1. Single-Focus Pattern (1 Primary + N Secondary)

**Structure:** Single primary territory with multiple secondary territories

**Pattern ID:** `single-focus`

**Examples:** France, Portugal, Netherlands, USA

**Configuration:**
```json
{
  "pattern": "single-focus",
  "territories": [
    {
      "role": "primary",
      "code": "FR-MET",
      "name": "France Métropolitaine"
    },
    {
      "role": "secondary",
      "code": "FR-GP",
      "name": "Guadeloupe"
    }
  ]
}
```

**Use Cases:**
- Countries with distant territories (DOM-TOM)
- Nations with overseas departments
- States with island territories

#### 2. Equal-Members Pattern (N Equal Territories)

**Structure:** Multiple equal territories with no hierarchy

**Pattern ID:** `equal-members`

**Examples:** European Union, World, ASEAN, Benelux

**Configuration:**
```json
{
  "pattern": "equal-members",
  "territories": [
    {
      "role": "member",
      "code": "BE",
      "name": "Belgium"
    },
    {
      "role": "member",
      "code": "NL",
      "name": "Netherlands"
    }
  ]
}
```

**Use Cases:**
- Regional unions (EU, ASEAN)
- World maps (all countries equal)
- Country groups (Benelux, Nordic Council)
- Federal systems with equal states

#### 3. Hierarchical Pattern (Future)

**Structure:** Complex multi-level territory relationships

**Pattern ID:** `hierarchical`

**Status:** Reserved for future use

### Territory Roles

| Role | Description | Example | Pattern |
|------|-------------|---------|---------|
| `primary` | Primary territory | France Métropolitaine | Single-focus |
| `secondary` | Distant/remote territory | French Guiana | Single-focus |
| `member` | Equal member | EU countries, World countries | Equal-members |
| `embedded` | Enclave/exclave | Monaco (in France) | Any |

### View Modes

Atlas Composer supports four view modes for displaying territories:

| Mode | Description | Projection | Best For |
|------|-------------|------------|----------|
| **split** | Separate maps for mainland and overseas | Per-territory | Traditional atlases with distant territories |
| **composite-existing** | Pre-built D3 composite projection | D3 composite | France, Portugal, Spain (if available) |
| **composite-custom** | Custom user-defined layout | Per-territory | Any atlas, full customization |
| **unified** | Single world map | Single | Regional groups, geographic context |

**View Mode Configuration:**
```json
{
  "viewModes": ["split", "composite-existing", "composite-custom", "unified"],
  "defaultViewMode": "composite-custom"
}
```

### Minimal Configuration

```json
{
  "$schema": "./schema.json",
  "id": "atlas-id",
  "name": "Atlas Name",
  "pattern": "single-focus",
  "territories": [
    {
      "id": "250",
      "role": "primary",
      "code": "FR-MET",
      "name": "Territory Name",
      "center": [2.5, 46.5],
      "bounds": [[-5, 41], [10, 51]],
      "extraction": { "mainlandPolygon": 0 }
    }
  ]
}
```

### Complete Configuration

```json
{
  "$schema": "./schema.json",
  "id": "atlas-id",
  "name": "Atlas Name",
  "description": "Brief description",
  "pattern": "single-focus",

  "viewModes": ["split", "composite-existing", "composite-custom", "unified"],
  "defaultViewMode": "composite-custom",

  "projectionPreferences": {
    "recommended": ["conic-conformal", "albers"],
    "default": {
      "mainland": "conic-conformal",
      "overseas": "mercator"
    },
    "prohibited": ["gnomonic", "orthographic"]
  },

  "territories": [/* territory objects */],

  "projection": {
    "center": { "longitude": 2.5, "latitude": 46.5 },
    "rotate": {
      "mainland": [-3, 0],
      "azimuthal": [-3, -46]
    },
    "parallels": { "conic": [45.9, 47.7] }
  },

  "modes": [
    {
      "id": "all-territories",
      "label": "All territories",
      "territories": ["FR-MET", "FR-GP", "FR-MQ"]
    }
  ],

  "groups": [
    {
      "id": "caribbean",
      "label": "Caribbean",
      "territories": ["FR-GP", "FR-MQ"]
    }
  ]
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | ✅ | Reference to schema.json |
| `id` | string | ✅ | Unique atlas identifier (kebab-case) |
| `name` | string | ✅ | Display name |
| `description` | string | ⏩ | Brief description |
| `viewModes` | string[] | ⏩ | Supported view modes (default: all) |
| `defaultViewMode` | string | ⏩ | Initial view mode (default: composite-custom) |
| `projectionPreferences` | object | ⚠️ | Projection recommendations (highly recommended) |
| `territories` | array | ✅ | Territory definitions |
| `projection` | object | ⚠️ | Projection parameters (highly recommended) |
| `modes` | array | ⏩ | Territory selection presets |
| `groups` | array | ⏩ | Territory groupings |

## Related Documentation

- 📖 [Adding New Atlas Guide](./ADDING_NEW_ATLAS.md) - Step-by-step tutorial for creating new atlases
- 📖 [Projections Documentation](./PROJECTIONS.md) - Projection system, recommendations, and catalog
- 📖 [Scripts Documentation](./SCRIPTS.md) - CLI tools for geodata preparation and validation
- 📖 [Main README](../README.md) - Project overview and quick start
