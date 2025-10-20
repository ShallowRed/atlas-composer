# d3-composite-projections to Atlas Composer Parameter Mapping

## Document Purpose

Complete analysis of parameter correspondence between d3-composite-projections npm package and atlas-composer's custom composite projection system. This document serves as the foundation for building bidirectional conversion scripts.

## Executive Summary

**d3-composite-projections** provides pre-built composite projections with fixed, hardcoded parameters embedded in JavaScript source files.

**atlas-composer** provides a flexible, configuration-driven system where parameters are:
1. Stored in JSON atlas configs (baseline structure)
2. Managed through parameter registry (runtime validation)
3. Stored in presets (user-configurable values)
4. Applied via parameter store (runtime state)

## Current Implementation Analysis (Based on composite-projection.ts)

### Scale System

Atlas-composer uses a **two-level scale system**:

```typescript
// Level 1: Reference Scale (atlas-wide, from preset)
referenceScale = 2700  // For France (single-focus pattern)
referenceScale = 200   // For EU (equal-members pattern)

// Level 2: Scale Multiplier (per territory, from preset)
finalScale = referenceScale * params.scaleMultiplier
// Note: params.scaleMultiplier comes from preset/parameter store, defaults to 1.0
```

### Translation System

Atlas-composer uses **pixel-based offsets from presets**:

```typescript
// Territory offset from center (in pixels) - from preset parameters
translateOffset = params.translateOffset || [0, 0]  // [x, y] in pixels
// Applied during build() as: translate([centerX + offsetX, centerY + offsetY])
```

### Current State of Atlas Configs

Atlas JSON configs (france.json, portugal.json, etc.) are **projection-agnostic** and contain only:
- `center`: Geographic center coordinates (required)
- `bounds`: Geographic bounding box (required)
- Basic metadata: `code`, `name`, `role`, etc.

**All projection-specific parameters come from presets**:
- `projectionType` - Defined in preset (projection.id)
- `scaleMultiplier` - Defined in preset (projection.parameters.scaleMultiplier)
- `translateOffset` - Defined in preset (layout.translateOffset)
- `rotate` - Defined in preset (projection.parameters.rotate)
- `parallels` - Defined in preset (projection.parameters.parallels)

**Data Flow** (Parameter Priority):
1. **Presets** (configs/presets/*.json) - Primary and required source for ALL projection parameters
2. **Parameter registry** - Final fallback defaults for standard values

**Code Behavior**:
```typescript
// In composite-projection.ts:
const projectionType = params.projectionId || 'mercator'  // From preset or default
const finalScale = referenceScale * (params.scaleMultiplier ?? 1.0)
const translateOffset = [0, 0]  // No config-level defaults, must come from parameters
```

**Design Principle**: Atlas configs provide geographic structure only. Presets define complete projection configuration for rendering.

## Parameter Correspondence Table

### d3-composite-projections Parameters

| Parameter | Type | Scope | Example | Description |
|-----------|------|-------|---------|-------------|
| Projection type | Function call | Per territory | `mercator()`, `conicConformal()` | D3 projection constructor |
| Center | `.center([lon, lat])` | Per territory | `[-61.46, 16.14]` | Geographic center |
| Rotate | `.rotate([λ, φ, γ])` | Per territory | `[-3, -46.2]` | Three-axis rotation |
| Parallels | `.parallels([p1, p2])` | Per territory | `[0, 60]` | Standard parallels for conics |
| Scale multiplier | `* multiplier` | Per territory | `0.6`, `1.6`, `5.0` | Relative to main scale |
| Translate offset | `[x + k*dx, y + k*dy]` | Per territory | `[-0.12, 0.0575]` | Normalized coordinates |
| ClipExtent | `.clipExtent([[x1,y1], [x2,y2]])` | Per territory | Complex formula | Bounding box in screen space |

### Atlas-composer Parameters

| Parameter | Storage Location | Type | Example | Description |
|-----------|-----------------|------|---------|-------------|
| `projectionId` | Preset (projection.id) | string | `'mercator'`, `'conic-conformal'` | Projection type identifier |
| `center` | TerritoryConfig (required) OR Preset (projection.parameters.center) | [number, number] | `[-61.46, 16.14]` | Geographic center |
| `rotate` | Preset (projection.parameters.rotate) | [number, number, number?] | `[-3, -46.2]` | Three-axis rotation |
| `parallels` | Preset (projection.parameters.parallels) | [number, number] | `[0, 60]` | Standard parallels |
| `scaleMultiplier` | Preset (projection.parameters.scaleMultiplier) | number | `0.6`, `1.6`, `5.0` | Scale factor relative to referenceScale |
| `translateOffset` | Preset (layout.translateOffset) | [number, number] | `[-324, 155]` | Pixel offset from center |
| `pixelClipExtent` | Preset (layout.pixelClipExtent) | [number, number, number, number] | `[x1, y1, x2, y2]` | Pixel-based clip box |
| `bounds` | TerritoryConfig (required) | [[number, number], [number, number]] | `[[-61.81, 15.83], [-61, 16.52]]` | Geographic bounding box |
| `referenceScale` | Preset (root level) | number | `2700`, `200` | Atlas-wide base scale |

## Conversion Formulas

### Scale: d3 → atlas-composer

```typescript
// d3-composite-projections
projection.scale(_ * multiplier)  // e.g., scale(_ * 0.6)

// atlas-composer preset
{
  "projection": {
    "parameters": {
      "scaleMultiplier": 0.6  // Stored in preset
    }
  }
}
```

### Translation: d3 → atlas-composer

```typescript
// d3-composite-projections
projection.translate([x + offsetX * k, y + offsetY * k])
// where k = referenceScale (e.g., 2700)
// offsetX, offsetY are normalized coordinates

// atlas-composer preset
{
  "layout": {
    "translateOffset": [
      offsetX * referenceScale,  // Convert to pixels
      offsetY * referenceScale
    ]
  }
}
// Example: [-0.12 * 2700, 0.0575 * 2700] = [-324, 155]
```

### Projection Type: d3 → atlas-composer

```typescript
// d3-composite-projections
import { geoConicConformal as conicConformal } from "d3-geo"
var projection = conicConformal()

// atlas-composer preset
{
  "projection": {
    "id": "conic-conformal"  // Stored in preset
  }
}
```

**Mapping Table**:
| d3 Constructor | atlas-composer ID |
|----------------|-------------------|
| `conicConformal()` | `'conic-conformal'` |
| `mercator()` | `'mercator'` |
| `conicEqualArea()` | `'conic-equal-area'` or `'albers'` |
| `azimuthalEqualArea()` | `'azimuthal-equal-area'` |
| `azimuthalEquidistant()` | `'azimuthal-equidistant'` |
| `equirectangular()` | `'equirectangular'` |

### Center/Rotate: d3 → atlas-composer

```typescript
// d3-composite-projections (conic projections use rotate)
projection.rotate([-3, -46.2])

// atlas-composer preset
{
  "projection": {
    "parameters": {
      "rotate": [-3, -46.2]
    }
  }
}

// d3-composite-projections (cylindrical/azimuthal use center)
projection.center([-61.46, 16.14])

// atlas-composer (center in atlas config, can be overridden in preset)
// Atlas config:
{
  "center": [-61.46, 16.14]
}
// OR Preset:
{
  "projection": {
    "parameters": {
      "center": [-61.46, 16.14]
    }
  }
}
```

### Parallels: d3 → atlas-composer

```typescript
// d3-composite-projections
projection.parallels([0, 60])

// atlas-composer preset
{
  "projection": {
    "parameters": {
      "parallels": [0, 60]
    }
  }
}
```

## France Example (Detailed Mapping)

### d3-composite-projections Source

```javascript
// conicConformalFrance.js
var europe = conicConformal().rotate([-3, -46.2]).parallels([0, 60])
var guyane = mercator().center([-53.2, 3.9])
var martinique = mercator().center([-61.03, 14.67])

conicConformalFrance.scale = function (_) {
  europe.scale(_)
  guyane.scale(_ * 0.6)
  martinique.scale(_ * 1.6)
  // ... etc
}

conicConformalFrance.translate = function (_) {
  var k = europe.scale()
  var x = +_[0], y = +_[1]
  
  guyanePoint = guyane
    .translate([x - 0.12 * k, y + 0.0575 * k])
    .clipExtent([...])
  
  martiniquePoint = martinique
    .translate([x - 0.12 * k, y + 0.013 * k])
    .clipExtent([...])
  // ... etc
}

return conicConformalFrance.scale(2700)  // Default scale
```

### Atlas-composer Equivalent (Preset Structure)

**Atlas Config** (`configs/atlases/france.json`) - Geographic structure only:
```json
{
  "territories": [
    {
      "code": "FR-MET",
      "center": [2.5, 46.5],
      "bounds": [[-5, 41], [10, 51]]
    },
    {
      "code": "FR-GF",
      "center": [-53.2, 3.9],
      "bounds": [[-55, 2], [-51, 6]]
    },
    {
      "code": "FR-MQ",
      "center": [-61.03, 14.67],
      "bounds": [[-62, 14], [-60, 15]]
    }
  ]
}
```

**Preset Config** (`configs/presets/france-default.json`) - Projection parameters:
```json
{
  "referenceScale": 2700,
  "territories": {
    "FR-MET": {
      "projection": {
        "id": "conic-conformal",
        "parameters": {
          "rotate": [-3, -46.2],
          "parallels": [0, 60],
          "scaleMultiplier": 1.0
        }
      },
      "layout": {
        "translateOffset": [0, 0]
      }
    },
    "FR-GF": {
      "projection": {
        "id": "mercator",
        "parameters": {
          "scaleMultiplier": 0.6
        }
      },
      "layout": {
        "translateOffset": [-324, 155.25]
      }
    },
    "FR-MQ": {
      "projection": {
        "id": "mercator",
        "parameters": {
          "scaleMultiplier": 1.6
        }
      },
      "layout": {
        "translateOffset": [-324, 35.1]
      }
    }
  }
}
```

**Offset Calculations**:
```
FR-GF:  d3: [-0.12, 0.0575]  → preset: [-0.12 * 2700, 0.0575 * 2700] = [-324, 155.25]
FR-MQ:  d3: [-0.12, 0.013]   → preset: [-0.12 * 2700, 0.013 * 2700]  = [-324, 35.1]
FR-GP:  d3: [-0.12, -0.014]  → preset: [-0.12 * 2700, -0.014 * 2700] = [-324, -37.8]
```

## Current System Architecture

### Separation of Concerns

**Atlas JSON Configs** (`configs/atlases/*.json`):
- Geographic structure only
- Territory codes, names, roles
- Center coordinates and bounds
- Minimal, reusable across different projections
- Example: `france.json`, `portugal.json`

**Preset JSON Files** (`configs/presets/*.json`):
- Complete projection configuration
- Projection types per territory
- Scale multipliers
- Translation offsets (pixel-based)
- ClipExtent definitions
- Multiple presets can exist for same atlas
- Example: `france-default.json`, `france-nsp.json`

**Schema Validation:**
- Atlas configs: `configs/atlas-registry.schema.json`, `configs/atlas.schema.json`
- Preset configs: `configs/presets/preset.schema.json`

### Implementation Status

✅ **CompositeProjection class** fully supports all parameters  
✅ **Parameter registry** has all definitions  
✅ **TerritoryConfig type** supports optional projection fields as fallbacks  
✅ **Preset system** fully functional with schema validation  
✅ **Data flow** correctly implements preset → config → defaults priority  
✅ **d3-composite-projections alignment** achieved in `france-default.json`  

## Data Flow Architecture

```
Load Atlas:
Atlas JSON (configs/atlases/france.json)
    → AtlasLoader.loadAtlasConfig()
    → Creates CompositeProjectionConfig with TerritoryConfig[]
    → Stores in AtlasRegistry

Load Preset:
Preset JSON (configs/presets/france-default.json)
    → PresetLoader.loadPreset()
    → Validates against schema
    → Converts to TerritoryDefaults (projections, translations, scales)
    → Loads into ParameterStore

Render:
AtlasService.getCompositeConfig() → TerritoryConfig[] (with optional fields)
                                ↓
ParameterStore → ProjectionParameterProvider (runtime parameters)
                                ↓
CompositeProjection.initialize() - merges config + parameters
                                ↓
                CompositeProjection.build() - creates D3 projections
                                ↓
                        D3 GeoProjection instances
```

### Parameter Priority (Highest to Lowest)

1. **User runtime changes** (ParameterStore via UI - ephemeral)
2. **Preset values** (loaded from `configs/presets/*.json` - required for projection parameters)
3. **Parameter registry defaults** (hardcoded in code - final fallback for standard values only)

### Key Design Principle

**Atlas configs are projection-agnostic**: The same `france.json` works with any projection configuration. Different presets (`france-default.json`, `france-nsp.json`) can provide completely different layouts for the same geographic structure.

**Presets are required**: All projection-specific parameters (projection types, scales, offsets, rotations, parallels) MUST come from preset files. Atlas configs contain only geographic structure (center, bounds).

## Reverse Conversion: atlas-composer → d3

To generate d3-composite-projections JavaScript:

```javascript
// Template
export default function() {
  var ${mainlandName} = ${projectionConstructor}()
    .${centerOrRotate}(${coordinates})
    ${parallelsIfNeeded}
  
  var ${territoryName} = ${projectionConstructor}()
    .center(${center})
  
  function composite(coordinates) {
    // ... standard d3-composite-projections boilerplate
  }
  
  composite.scale = function(_) {
    ${mainlandName}.scale(_)
    ${territoryName}.scale(_ * ${scaleMultiplier})
    return composite.translate(${mainlandName}.translate())
  }
  
  composite.translate = function(_) {
    var k = ${mainlandName}.scale()
    var x = +_[0], y = +_[1]
    
    ${territoryName}
      .translate([x + ${offsetX/referenceScale} * k, y + ${offsetY/referenceScale} * k])
      .clipExtent([...])
    
    return reset()
  }
  
  return composite.scale(${referenceScale})
}
```

## ClipExtent Handling

### d3-composite-projections

Uses **scale-dependent normalized coordinates**:
```javascript
.clipExtent([
  [x - 0.14 * k + epsilon, y + 0.029 * k + epsilon],
  [x - 0.0996 * k - epsilon, y + 0.0864 * k - epsilon]
])
```

### atlas-composer

Uses **pixel-based coordinates** (parameter store):
```typescript
pixelClipExtent: [x1, y1, x2, y2]  // Relative to territory translate position
// Converted to D3 format during build(): [[x1, y1], [x2, y2]]
```

**Conversion d3 → atlas**:
```typescript
// Extract normalized coordinates from d3 source
// e.g., [x - 0.14 * k, y + 0.029 * k] to [x + 0.0996 * k, y + 0.0864 * k]
// becomes:
// minX = -0.14 * referenceScale = -378
// minY = 0.029 * referenceScale = 78.3
// maxX = 0.0996 * referenceScale = 268.92  
// maxY = 0.0864 * referenceScale = 233.28
pixelClipExtent = [-378, 78.3, 268.92, 233.28]
```

## Summary of Conversions

| Aspect | d3-composite-projections | atlas-composer (Preset) | Conversion |
|--------|-------------------------|------------------------|------------|
| **Scale** | `_ * multiplier` | `scaleMultiplier` | Direct copy |
| **Translate** | `k * normalized` | `translateOffset` (pixels) | multiply by referenceScale |
| **Projection** | Function call | `projection.id` | Name mapping |
| **Center** | `.center([lon, lat])` | `center` (atlas or preset) | Direct copy |
| **Rotate** | `.rotate([λ, φ, γ])` | `projection.parameters.rotate` | Direct copy |
| **Parallels** | `.parallels([p1, p2])` | `projection.parameters.parallels` | Direct copy |
| **ClipExtent** | Normalized coords | `pixelClipExtent` (pixels) | multiply by referenceScale |

## Conversion Targets

### d3 → atlas-composer (Preset Generation)

**Input**: d3-composite-projections source file (JavaScript)
**Output**: Preset JSON file (`configs/presets/*.json`)

**What to generate**:
- Complete preset structure following `configs/presets/preset.schema.json`
- `projection.id` and `projection.parameters` for each territory
- `layout.translateOffset` (pixel offsets)
- `layout.pixelClipExtent` (optional, pixel-based)
- `metadata` section with source attribution

**Atlas config**: Already exists, no modification needed

### atlas-composer → d3 (Code Generation)

**Input**: Preset JSON file (`configs/presets/*.json`)
**Output**: d3-composite-projections-compatible JavaScript

**What to generate**:
- JavaScript module with composite projection function
- Sub-projection initialization with D3 constructors
- Scale function with multipliers
- Translate function with normalized coordinates
- ClipExtent definitions
- Composition borders and invert functions

## Next Steps for Implementation

1. ✅ **Understand current architecture** - Complete
2. ✅ **Document parameter correspondence** - Complete  
3. **Create d3 → preset converter script** - Parse d3 source and generate preset JSON
4. **Create preset → d3 converter script** - Generate JavaScript from preset JSON
5. **Validate conversions** by comparing rendered output
6. **Document conversion process** for adding new atlases from d3-composite-projections
