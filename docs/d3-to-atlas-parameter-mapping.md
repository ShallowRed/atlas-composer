# d3-composite-projections to Atlas Composer Mapping

## Overview

**d3-composite-projections**: Pre-built composites with hardcoded parameters in JavaScript
**atlas-composer**: Configuration-driven system with JSON presets

## Parameter Correspondence

| d3-composite-projections | atlas-composer Location | Conversion |
|-------------------------|------------------------|------------|
| Projection constructor | Preset: `projection.id` | Name mapping |
| `.center([lon, lat])` | Atlas or Preset: `center` | Direct |
| `.rotate([λ, φ, γ])` | Preset: `projection.parameters.rotate` | Direct |
| `.parallels([p1, p2])` | Preset: `projection.parameters.parallels` | Direct |
| `_ * multiplier` | Preset: `scaleMultiplier` | Direct |
| `k * normalized` translate | Preset: `layout.translateOffset` | Multiply by referenceScale |
| Normalized clipExtent | Preset: `layout.pixelClipExtent` | Multiply by referenceScale |

## Projection Type Mapping

| d3 Constructor | atlas-composer ID |
|----------------|-------------------|
| `conicConformal()` | `'conic-conformal'` |
| `mercator()` | `'mercator'` |
| `conicEqualArea()` | `'albers'` |
| `azimuthalEqualArea()` | `'azimuthal-equal-area'` |
| `equirectangular()` | `'equirectangular'` |

## Scale System

```typescript
// Atlas-composer
finalScale = referenceScale * scaleMultiplier

// Example: referenceScale=2700, scaleMultiplier=0.6
// finalScale = 2700 * 0.6 = 1620
```

## Translation Conversion

```typescript
// d3: projection.translate([x + offsetX * k, y + offsetY * k])
// atlas-composer preset:
translateOffset: [offsetX * referenceScale, offsetY * referenceScale]

// Example: d3 offset [-0.12, 0.0575] with referenceScale 2700
// translateOffset: [-324, 155.25]
```

## ClipExtent Conversion

```typescript
// d3 (normalized): [x - 0.14 * k, y + 0.029 * k] to [x - 0.0996 * k, y + 0.0864 * k]
// atlas-composer (pixels):
pixelClipExtent: [-378, 78.3, -268.92, 233.28]  // multiply by referenceScale
```

## Data Flow

```
Atlas JSON (geographic structure only: center, bounds)
     ↓
Preset JSON (projection parameters: id, rotate, parallels, scaleMultiplier, translateOffset)
     ↓
ParameterStore → ProjectionParameterProvider
     ↓
CompositeProjection.initialize() → D3 projections
```

**Priority**: User changes > Preset values > Registry defaults

## Example: France

**d3-composite-projections**:
```javascript
var europe = conicConformal().rotate([-3, -46.2]).parallels([0, 60])
var guyane = mercator().center([-53.2, 3.9])
guyane.scale(_ * 0.6)
guyane.translate([x - 0.12 * k, y + 0.0575 * k])
```

**atlas-composer preset**:
```json
{
  "referenceScale": 2700,
  "territories": [{
    "code": "FR-MET",
    "projection": { "id": "conic-conformal", "parameters": { "rotate": [-3, -46.2], "parallels": [0, 60] } }
  }, {
    "code": "FR-GF",
    "projection": { "id": "mercator", "parameters": { "scaleMultiplier": 0.6 } },
    "layout": { "translateOffset": [-324, 155.25] }
  }]
}
```

## Key Design Principle

**Atlas configs are projection-agnostic**: Same `france.json` works with any preset.
**Presets are required**: ALL projection parameters come from preset files.
