# Preset Management System

## Overview

The preset system manages saved projection configurations using a unified architecture. Presets are REQUIRED for all view modes. Available view modes are determined by preset types in the registry.

## Preset Types

| Type | View Mode | Description |
|------|-----------|-------------|
| **composite-custom** | composite-custom | Full per-territory configuration, exportable |
| **unified** | unified | Single projection for entire atlas |
| **split** | split | Individual projections per territory group |
| **built-in-composite** | built-in-composite | Predefined d3-composite-projections |

## Architecture

### Core Layer (src/core/presets/)

| File | Purpose |
|------|---------|
| **types.ts** | Discriminated union types: `Preset`, `PresetType`, `LoadResult<T>` |
| **validator.ts** | Strategy pattern validation: `validatePreset()`, `validateCompositePreset()`, `validateViewPreset()` |
| **converter.ts** | Pure functions: `convertToDefaults()`, `extractTerritoryParameters()` |

### Service Layer (src/services/presets/)

| Service | Purpose |
|---------|---------|
| **PresetLoader** | Loads presets from `configs/presets/`, queries atlas registry, validates |
| **PresetApplicationService** | Routes by preset.type to specialized handlers, coordinates store updates |
| **AtlasMetadataService** | Clean API for atlas projection metadata, caches for performance |

## Loading Paths

### Composite-Custom (Converter-Based)
```
InitializationService.initializeAtlas() → PresetLoader.loadPreset() → convertToDefaults() + extractTerritoryParameters() → Apply to stores → CompositeProjection.initialize()
```

### View Presets (Runtime Switching)
```
PresetLoader.loadPreset() → PresetApplicationService.applyPreset() → Direct parameter application
```

**Supported Types**: unified, split, built-in-composite (composite-custom uses converter path)

## Registry Format

Presets defined in `configs/atlas-registry.json`:

```json
{
  "presets": [
    {
      "id": "france-default",
      "name": "France - Composite",
      "atlasId": "france",
      "type": "composite-custom",
      "configPath": "./presets/france/france-default.json",
      "isDefault": true
    }
  ]
}
```

## Preset File Format (Composite-Custom)

```json
{
  "version": "1.0",
  "metadata": { "atlasId": "france", "exportDate": "..." },
  "referenceScale": 2700,
  "territories": [{
    "code": "FR-MET",
    "projection": {
      "id": "conic-conformal",
      "family": "CONIC",
      "parameters": { "rotate": [-3, -46.2, 0], "parallels": [0, 60], "scaleMultiplier": 1 }
    },
    "layout": { "translateOffset": [0, 0], "pixelClipExtent": [...] },
    "bounds": [[-6.5, 41], [10, 51.5]]
  }]
}
```

## Parameter Extraction

**extractTerritoryParameters()** extracts:
- `projectionId` from `projection.id`
- Projection params: center, rotate, parallels, scaleMultiplier, clipAngle, precision
- Layout params: translateOffset, pixelClipExtent

**convertToDefaults()** returns:
- `projections`: Map<code, projectionId>
- `translations`: Map<code, {x, y}>
- `scales`: Map<code, scaleMultiplier>

## Scale System

| Value | Source | Purpose |
|-------|--------|---------|
| **baseScale** | Preset | Reference scale for territory |
| **scaleMultiplier** | Parameter store | Adjustment factor (0.5-2.0) |
| **scale** | Calculated | `baseScale x scaleMultiplier`, applied to D3 |

**Advanced slider**: Modifies scaleMultiplier, recalculates scale
**View slider**: Sets scale directly, blocks multiplier updates

## Parameter Provider Pattern

CompositeProjection receives parameters through `ProjectionParameterProvider`:
- `getEffectiveParameters(territoryCode)` - Parameter resolution with inheritance
- Abstracts parameter source (store, config, defaults)

## Initialization Sequence

1. `InitializationService.initializeAtlas()` - Orchestrates loading
2. `PresetLoader.loadPreset()` - Load from registry
3. `convertToDefaults()` + `extractTerritoryParameters()` - Extract data
4. Apply to stores (parameterStore, projectionStore, viewStore)
5. `geoDataStore.initialize()` - Load geo data
6. `CompositeProjection.initialize()` - Apply to D3 projections

**Race condition prevention**: Preset loads before CompositeProjection initializes via sequential async flow.

## Reset System

| Function | Scope | Action |
|----------|-------|--------|
| `resetTransforms()` | Global | Restore all territories to preset defaults |
| `resetTerritoryToDefaults()` | Single | Restore one territory to preset |

**Divergence detection**: `hasDivergingParameters()` compares current state against preset defaults.

## Key Files

| Category | Files |
|----------|-------|
| **Services** | preset-loader.ts, preset-application-service.ts, atlas-coordinator.ts |
| **Stores** | parameters.ts (scale, projections, translations), config.ts |
| **Components** | PresetSelector.vue, TerritoryControls.vue, TerritoryParameterControls.vue |
| **Composables** | usePresetDefaults.ts, useTerritoryTransforms.ts, useAtlasData.ts |
| **Preset Files** | configs/presets/{atlasId}-{presetName}.json |

## Troubleshooting

| Issue | Check |
|-------|-------|
| Incorrect scale on load | Preset has baseScale/scaleMultiplier, initialization order correct |
| Scale sliders not working | Check for scale override (blocks multiplier), verify rebuild triggers |
| Wrong projection type | Preset projection matches expected, parameter store applied correctly |
| Parameters not loading | No race condition, updateTerritoryParameters() called after store update |
| Territory mismatch | Territories not in preset are NOT rendered (no fallback) |
