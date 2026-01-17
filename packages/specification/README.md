# @atlas-composer/specification

> JSON Schema specification and TypeScript types for Atlas Composer composite map projections

This package defines the **composite projection configuration format** - the core data structure used by Atlas Composer to describe how multiple map projections combine into a single coherent visualization.

## Features

- **TypeScript Types** - Full type definitions for composite projection configurations
- **JSON Schemas** - Validate configurations with JSON Schema Draft-07
- **Validation Utilities** - Programmatic validation with detailed error messages
- **Zero Dependencies** - Pure TypeScript with no runtime dependencies

## Installation

```bash
npm install @atlas-composer/specification
# or
pnpm add @atlas-composer/specification
# or
yarn add @atlas-composer/specification
```

## Usage

### TypeScript Types

```typescript
import type {
  CompositeProjectionConfig,
  TerritoryConfig,
  ProjectionParameters,
} from '@atlas-composer/specification'

// Type-safe configuration handling
function processConfig(config: CompositeProjectionConfig) {
  console.log(`Atlas: ${config.metadata.atlasId}`)
  console.log(`Territories: ${config.territories.length}`)

  for (const territory of config.territories) {
    console.log(`  - ${territory.code}: ${territory.projection.id}`)
  }
}
```

### Type Guards

```typescript
import { isCompositeProjectionConfig } from '@atlas-composer/specification'

// Validate unknown data
const data = JSON.parse(fileContent)
if (isCompositeProjectionConfig(data)) {
  // data is now typed as CompositeProjectionConfig
  console.log(data.territories.length)
}
```

### Validation

```typescript
import { validateConfig } from '@atlas-composer/specification'

const result = validateConfig(config)
if (!result.valid) {
  console.error('Validation errors:')
  for (const error of result.errors) {
    console.error(`  ${error.path}: ${error.message}`)
  }
}
if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings)
}
```

### JSON Schema Validation

For environments that support JSON Schema validation (Ajv, json-schema, etc.):

```typescript
import Ajv from 'ajv'
import compositeSchema from '@atlas-composer/specification/schemas/composite-projection'
import definitionsSchema from '@atlas-composer/specification/schemas/definitions'

const ajv = new Ajv()
ajv.addSchema(definitionsSchema)
const validate = ajv.compile(compositeSchema)

if (!validate(config)) {
  console.error(validate.errors)
}
```

## Specification Overview

### Configuration Structure

A composite projection configuration consists of:

```typescript
{
  version: "1.0",                    // Specification version
  metadata: { atlasId, ... },        // Provenance information
  referenceScale: 2700,              // Base scale for all territories
  canvasDimensions: { width, height }, // Output canvas size
  territories: [                     // Array of territory configurations
    {
      code: "FR-MET",               // Territory identifier
      name: "France Metropolitaine", // Display name
      projection: {                 // Projection configuration
        id: "conic-conformal",      // D3 projection name
        family: "CONIC",            // Projection family
        parameters: { ... }         // Projection parameters
      },
      layout: {                     // Canvas positioning
        translateOffset: [x, y],    // Position offset from center
        pixelClipExtent: [x1, y1, x2, y2] // Clip boundaries
      },
      bounds: [[minLon, minLat], [maxLon, maxLat]] // Geographic bounds
    }
  ]
}
```

### Projection Families

| Family | Parameters | Use Case |
|--------|------------|----------|
| `CYLINDRICAL` | `center` | Equatorial regions, web maps |
| `CONIC` | `rotate`, `parallels` | Mid-latitude countries |
| `AZIMUTHAL` | `rotate`, `clipAngle` | Polar regions, hemisphere views |
| `PSEUDOCYLINDRICAL` | `center` | World maps |
| `POLYCONIC` | `center` | Regional maps |
| `MISCELLANEOUS` | varies | Specialized projections |

### Projection Parameters

```typescript
interface ProjectionParameters {
  // Rotation for conic/azimuthal projections
  rotate?: [lambda, phi, gamma?]

  // Center for cylindrical projections
  center?: [longitude, latitude]

  // Standard parallels for conic projections
  parallels?: [south, north]

  // Scale multiplier relative to referenceScale
  scaleMultiplier?: number

  // Clip angle for azimuthal projections (0-180)
  clipAngle?: number
}
```

### Layout Configuration

```typescript
interface LayoutConfig {
  // Offset from canvas center in pixels
  translateOffset: [x, y]

  // Clip extent relative to territory center
  // [left, top, right, bottom] in pixels
  pixelClipExtent: [x1, y1, x2, y2]
}
```

## Versioning Policy

This package follows [Semantic Versioning](https://semver.org/):

- **Major versions** (2.0.0): Breaking changes to the configuration format
- **Minor versions** (1.1.0): New optional fields, backward-compatible additions
- **Patch versions** (1.0.1): Bug fixes, documentation updates

### Version Compatibility

| Spec Version | Loader Version | Status |
|--------------|----------------|--------|
| 1.0 | 1.x | Current |

The `version` field in configurations allows loaders to detect and handle format differences.

## Related Packages

| Package | Description |
|---------|-------------|
| [@atlas-composer/projection-loader](../projection-loader) | Runtime loader for configurations |
| [@atlas-composer/preset-library](../preset-library) | Curated preset configurations |
| [@atlas-composer/projection-core](../projection-core) | Core projection utilities |

## Example Configuration

```json
{
  "$schema": "https://atlas-composer.github.io/specification/v1/composite-projection.schema.json",
  "version": "1.0",
  "metadata": {
    "atlasId": "france",
    "atlasName": "France",
    "exportDate": "2025-10-17T21:04:33.403Z",
    "createdWith": "Atlas Composer v2.0"
  },
  "referenceScale": 2700,
  "canvasDimensions": {
    "width": 760,
    "height": 500
  },
  "territories": [
    {
      "code": "FR-MET",
      "name": "France Metropolitaine",
      "projection": {
        "id": "conic-conformal",
        "family": "CONIC",
        "parameters": {
          "rotate": [-3, -46.5, 0],
          "parallels": [44, 49],
          "scaleMultiplier": 1
        }
      },
      "layout": {
        "translateOffset": [110, 0],
        "pixelClipExtent": [-280, -250, 270, 250]
      },
      "bounds": [[-6.5, 41], [10, 51]]
    },
    {
      "code": "FR-GP",
      "name": "Guadeloupe",
      "projection": {
        "id": "mercator",
        "family": "CYLINDRICAL",
        "parameters": {
          "center": [-61.46, 16.14],
          "scaleMultiplier": 1.2
        }
      },
      "layout": {
        "translateOffset": [-290, -60],
        "pixelClipExtent": [-50, -50, 50, 50]
      },
      "bounds": [[-61.81, 15.83], [-61.0, 16.52]]
    }
  ]
}
```

## License

MIT
