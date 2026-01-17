# Preset Management System

## Overview

The preset system manages saved projection configurations for all view modes using a unified architecture. A single loader handles all preset types, a single registry tracks all presets, and discriminated union types provide type-safe handling across the application.

Presets are REQUIRED for all view modes to function. The application fails fast during initialization if a view mode has no corresponding preset defined in the registry. Available view modes are determined by the preset types defined in the registry for each atlas.

## Preset Types

Four preset types exist in a discriminated union (`Preset`):

1. **composite-custom** - Custom composite projections with full per-territory configuration (exportable, round-trip capable)
2. **unified** - Single projection covering the entire atlas
3. **split** - Individual projections per territory group
4. **built-in-composite** - Predefined projections from d3-composite-projections library

Each preset type corresponds to a view mode of the same name. The availability of a view mode depends on having at least one preset of that type defined in the registry for the atlas.

**Preset → View Mode Relationship**:
- Preset type `composite-custom` → View mode `composite-custom`
- Preset type `unified` → View mode `unified`
- Preset type `split` → View mode `split`
- Preset type `built-in-composite` → View mode `built-in-composite`

The application discovers available view modes by extracting unique preset types from the registry using `getAvailableViewModes(atlasId)`.

## Architecture

### Core Layer (src/core/presets/)

**Types** (`types.ts`)
- Unified domain types with discriminated unions
- `LoadResult<T>` - Generic result type for all loading operations
- `Preset` - Discriminated union of CompositePreset | UnifiedPreset | SplitPreset | CompositeExistingPreset
- `PresetType` - Type discriminator ('composite-custom' | 'unified' | 'split' | 'built-in-composite')
- `BasePresetMetadata` - Shared metadata fields (id, name, description, atlasId)
- Configuration types: CompositeCustomConfig, UnifiedViewConfig, SplitViewConfig, CompositeExistingViewConfig
- `PresetDefinition` type lives in `src/types/registry.ts` (part of atlas registry)

**Validators** (`validator.ts`)
- Unified validation with strategy pattern
- `validatePreset()` - Routes to appropriate validator based on preset type
- `validateCompositePreset()` - Validates composite preset structure and parameters
- `validateViewPreset()` - Validates view mode preset configuration
- Parameter validation using parameter registry
- Required parameter checks for preset integrity

**Converters** (`converter.ts`)
- Pure conversion functions between formats
- `convertToDefaults()` - Converts preset to TerritoryDefaults format
- `extractTerritoryParameters()` - Extracts projection parameters from preset
- Registry-driven parameter extraction

### Service Layer (src/services/presets/)

**PresetLoader** (`preset-loader.ts`)
- Unified loading service for all preset types
- Loads from single directory: `configs/presets/`
- Queries atlas registry for preset metadata via `getPresetById()`
- Type-discriminated validation routing
- Methods:
  - `loadPreset(presetId)` - Returns `LoadResult<Preset>` with type discrimination
- Re-exports core converters (`convertToDefaults`, `extractTerritoryParameters`)
- Directly uses atlas registry, no separate preset registry or transformation layer

**PresetApplicationService** (`preset-application-service.ts`)
- Centralizes preset application logic using strategy pattern
- Routes by preset.type to specialized handlers
- Methods:
  - `applyPreset(preset)` - Unified entry point for all types
  - `applyCompositeCustom(config)` - Handles composite-custom presets
  - `applyUnified(config)` - Handles unified view presets
  - `applySplit(config)` - Handles split view presets
  - `applyCompositeExisting(config)` - Handles built-in-composite presets
- Returns `ApplicationResult` (success, errors, warnings)
- Coordinates updates across projectionStore and parameterStore

**AtlasMetadataService** (`atlas-metadata-service.ts`)
- Provides clean API for accessing atlas projection metadata
- Loads metadata from preset files using PresetLoader
- Caches metadata for performance
- Fallback defaults for atlases without presets
- Static methods: getAtlasMetadata(), getCompositeProjections(), getProjectionPreferences()

### Integration Components

**InitializationService** (`src/services/initialization/initialization-service.ts`)
- Orchestrates preset loading during atlas initialization
- Integrates preset data into atlas configuration
- Coordinates parameter store and territory store initialization
- Returns extracted territory parameters for rendering

**Parameter Store** (`src/stores/parameters.ts`)
- Manages projection parameters (center, rotate, parallels, scaleMultiplier, etc.)
- Uses unified parameter system with familyConstraints as single source of truth
- Supports parameter inheritance (territory overrides global defaults)
- Provides effective parameter resolution for each territory
- Tracks parameter changes and triggers re-renders

**Config Store** (`src/stores/config.ts`)
- Coordinates preset loading and application
- Delegates to PresetLoader for loading
- Delegates to PresetApplicationService for applying
- Methods:
  - `loadAvailableViewPresets()` - Queries atlas registry via `getAtlasPresets()` for current atlas/view mode (filters to match view mode)
  - `loadViewPreset(presetId)` - Loads and applies a preset
  - `applyViewPresetConfig(preset)` - Applies preset using PresetApplicationService
  - `clearViewPreset()` - Clears current preset

**usePresetDefaults** (`src/composables/usePresetDefaults.ts`)
- Manages original preset defaults for reset functionality
- Stores territory projections, translations, scales, and parameters
- Used in composite-custom and split modes (both have per-territory projections/parameters)
- Built-in-composite and unified modes do not store preset defaults (no per-territory customization)
- Methods:
  - `storePresetDefaults()` - Store preset defaults when loading composite-custom or split preset
  - `clearPresetDefaults()` - Clear stored defaults
  - `clearAll()` - Alias for clearPresetDefaults, used by InitializationService
  - `hasPresetDefaults()` - Check if defaults are available
  - `hasDivergingParameters()` - Check if current values differ from stored defaults
  - `getPresetDefaultsForTerritory()` - Get defaults for specific territory

## Loading Paths

The preset system uses two distinct loading paths based on preset type and use case:

### Composite-Custom Presets (Converter-Based Path)

Loaded using converter-based initialization (two entry points):

**1. Atlas Initialization (Primary Path):**
- **Trigger:** App startup, atlas change
- **Entry Point:** `InitializationService.initializeAtlas()`
- **Process:**
  1. `PresetLoader.loadPreset(defaultPreset)` - Load from registry
  2. `convertToDefaults()` - Extract projections, translations, scales
  3. `extractTerritoryParameters()` - Extract all projection parameters
  4. Apply to stores (parameterStore, projectionStore, viewStore)
  5. CompositeProjection.initialize() reads parameters

**2. Runtime Preset Switching (Secondary Path):**
- **Trigger:** User selects different composite-custom preset in PresetSelector dropdown
- **Entry Point:** `PresetSelector.vue` (composite-custom mode only)
- **Process:**
  1. `PresetLoader.loadPreset(presetId)` - Load from registry
  2. Type check: if `preset.type === 'composite-custom'`
  3. `convertToDefaults()` + `extractTerritoryParameters()` - Same as initialization
  4. Manual store updates (parameterStore, projectionStore)
  5. CompositeProjection uses updated parameters on next render

**Not available:** Through view preset API (`loadAvailableViewPresets()` filters out composite-custom)

**Why separate from view presets:** Requires converter-based extraction and full parameter initialization, not simple parameter setting

### View Presets (Runtime Switching Path)

Loaded through view preset API for runtime switching:
- **Trigger:** User preset selection in UI
- **Entry Point:** `InitializationService.loadPreset(presetId)`
- **Process:**
  1. `PresetLoader.loadPreset(presetId)` - Load from registry
  2. `PresetApplicationService.applyPreset()` - Route to type-specific handler
  3. Direct parameter application to stores
- **Supported Types:** unified, split, built-in-composite
- **Why separate:** Simple projection switching without full reinitialization

### Data Flow

#### Path A: Atlas Initialization (Composite-Custom)
```
Application Startup / Atlas Change
  |
useAtlasData.initialize()
  |
InitializationService.initializeAtlas()
  |
PresetLoader.loadPreset(defaultPreset)
  -> Registry lookup (type: 'composite-custom')
  -> validateCompositePreset() [Full validation]
  -> Returns LoadResult<CompositePreset>
  |
convertToDefaults(preset.config)
  -> Extract projections map
  -> Extract translations map
  -> Extract scales map
  |
extractTerritoryParameters(preset.config)
  -> Extract projection parameters
  -> Extract layout properties
  -> Return per-territory params
  |
Territory Mismatch Handling
  -> Compare preset territories vs atlas territories
  -> Log missing territories (will NOT be rendered)
  -> Use only preset territories (no fallback for missing)
  |
Apply to Stores
  -> parameterStore (projections, translations, scales, parameters)
  -> projectionStore (referenceScale, canvasDimensions)
  -> viewStore (view mode, territory mode)
  |
geoDataStore.initialize()
  |
CompositeProjection.initialize()
  -> Reads parameters via ProjectionParameterProvider
  -> Applies to D3 projections
  |
First Render (preset values applied)
```

#### Path A2: Composite-Custom Runtime Switching
```
User Selects Different Composite Preset (PresetSelector dropdown)
  ↓
PresetSelector.vue (composite-custom mode)
  ↓
PresetLoader.loadPreset(presetId)
  → Registry lookup (type: 'composite-custom')
  → validateCompositePreset() [Full validation]
  → Returns LoadResult<CompositePreset>
  ↓
Type Check: preset.type === 'composite-custom'
  ↓
convertToDefaults(preset.config)
  → Extract projections, translations, scales
  ↓
extractTerritoryParameters(preset.config)
  → Extract parameters and layout properties
  ↓
Territory Mismatch Handling
  → Compare preset territories vs atlas territories
  → Generate fallback parameters for missing territories
  → Merge: fallback defaults + preset parameters (preset takes precedence)
  ↓
Manual Store Updates
  -> parameterStore.setTerritoryProjection()
  -> parameterStore.setTerritoryTranslation()
  -> parameterStore.setTerritoryParameter()
  -> parameterStore.initializeFromPreset()
  -> projectionStore.referenceScale
  -> projectionStore.canvasDimensions
  |
CRITICAL: Update CompositeProjection
  -> geoDataStore.cartographer.updateTerritoryParameters(territoryCode)
  -> Called for each territory in the preset
  -> Forces CompositeProjection to read new parameters
  -> Triggers re-render with new preset configuration
  |
Render Update (new preset applied and visible)
```

#### Path B: View Preset Switching (Unified/Split/Built-in-Composite)
```
User Selects View Preset (ViewPresetSelector dropdown)
  |
InitializationService.loadPreset(presetId)
  |
PresetLoader.loadPreset(presetId)
  -> Registry lookup (type: 'unified'|'split'|'built-in-composite')
  -> validateViewPreset() [Simple validation]
  -> Returns LoadResult<UnifiedPreset|SplitPreset|CompositeExistingPreset>
  |
PresetApplicationService.applyPreset(preset)
  -> Routes by preset.type
  -> applyUnified() / applySplit() / applyCompositeExisting()
  -> Direct parameter application
  |
Update Stores
  -> parameterStore (projection parameters)
  -> projectionStore (projection ID, composite projection ID)
  |
Render Update (new projection applied)
```

## Registry Format

Presets are defined inline within atlas entries in `configs/atlas-registry.json`:

```json
{
  "version": "2.0",
  "description": "Unified registry of all preset types (composite-custom, unified, split, built-in-composite)",
  "presets": [
    {
      "id": "france-default",
      "name": "France - Composite personnalisée par défaut",
      "atlasId": "france",
      "type": "composite-custom",
      "description": "Configuration alignée avec geoConicConformalFrance"
    },
    {
      "id": "france-unified",
      "atlasId": "france",
      "type": "unified",
      "name": "France - Vue unifiée",
      "description": "Projection Natural Earth centrée sur la France"
    },
    {
      "id": "france-split",
      "atlasId": "france",
      "type": "split",
      "name": "France - Vue séparée",
      "description": "Même projection conique pour tous les territoires"
    }
  ]
}
```

**Preset Definition Fields:**
- `id` - Preset identifier (e.g., 'france-default')
- `name` - Display name (string or i18n object with en/fr keys)
- `description` - Optional description (string or i18n object)
- `type` - Preset type discriminator ('composite-custom' | 'unified' | 'split' | 'built-in-composite')
- `configPath` - Required. Relative path to preset config file (e.g., "./presets/france/france-default.json" or "./presets/portugal-default.json")
- `isDefault` - (optional) Marks the default preset for the atlas

## Preset File Formats

### Composite-Custom Format

```json
{
  "version": "1.0",
  "metadata": {
    "atlasId": "france",
    "atlasName": "France",
    "exportDate": "2025-10-16T16:00:00.000Z",
    "createdWith": "d3-composite-projections alignment"
  },
  "referenceScale": 2700,
  "territories": [
    {
      "code": "FR-MET",
      "name": "France Métropolitaine",
      "projection": {
        "id": "conic-conformal",
        "family": "CONIC",
        "parameters": {
          "rotate": [-3, -46.2, 0],
          "parallels": [0, 60],
          "scaleMultiplier": 1
        }
      },
      "layout": {
        "translateOffset": [0, 0],
        "pixelClipExtent": [-268.92, -245.16, 260.99, 324]
      },
      "bounds": [[-6.5, 41], [10, 51.5]]
    }
  ]
}
```

### Field Definitions

**Metadata**
- `version`: Preset format version ("1.0")
- `metadata.atlasId`: Target atlas identifier
- `metadata.atlasName`: Human-readable atlas name
- `metadata.exportDate`: ISO 8601 timestamp
- `metadata.createdWith`: Application/source identifier

**Composite Configuration**
- `referenceScale`: Base scale for all territories (overrides atlas config)
- `canvasDimensions`: Optional {width, height} in pixels

**Territory Configuration**
- `code`: Territory ISO code
- `name`: Territory display name
- `projection.id`: Projection identifier from registry
- `projection.family`: Projection family (CONIC, CYLINDRICAL, AZIMUTHAL, etc.)
- `projection.parameters`: Parameter object

**Projection Parameters**
- `rotate`: [λ, φ, γ] - Three-element rotation array (required for most projections)
- `parallels`: [φ1, φ2] - Standard parallels for conic projections
- `center`: [longitude, latitude] - Center point for cylindrical/azimuthal
- `scaleMultiplier`: Scale factor applied to referenceScale (default: 1)

**Layout Properties**
- `translateOffset`: [x, y] - Pixel offset from computed position
- `pixelClipExtent`: [x1, y1, x2, y2] | null - Pixel-based clipping bounds

**Geographic Bounds**
- `bounds`: [[west, south], [east, north]] - Territory bounding box in degrees

## Parameter Extraction

### PresetLoader.extractTerritoryParameters()

Extracts projection parameters from preset territories into parameter store format.
Handles the standard preset structure where projection ID is at `projection.id` (not in parameters).

**Extracted Parameters:**
- `projectionId`: Extracted from `projection.id` (required parameter)
- `center`: Geographic center point
- `rotate`: Three-axis rotation
- `parallels`: Standard parallels for conic projections
- `baseScale`: Base scale value before multiplier
- `scaleMultiplier`: Scale adjustment multiplier
- `clipAngle`: Clipping angle for azimuthal projections
- `precision`: Adaptive sampling precision
- `translateOffset`: Extracted from `layout.translateOffset` - pixel offset [x, y]
- `pixelClipExtent`: Extracted from `layout.pixelClipExtent` - clipping rectangle [x1, y1, x2, y2]

**Extraction Process:**
1. Extract `projectionId` from `territory.projection.id` (standard location in preset format)
2. Filter projection parameters through registry exportable list
3. Extract layout properties (`translateOffset`, `pixelClipExtent`) from `layout` section
4. Return combined parameter object with all exportable parameters

**Parameter Validation:**
Only extracts parameters that are:
- Defined in the territory configuration
- Registered in the parameter registry as exportable
- Have non-undefined values

**Layout Property Extraction:**
- Reads `territory.layout.translateOffset` and converts to parameter format
- Reads `territory.layout.pixelClipExtent` (4-element array) and converts to parameter format
- Layout properties stored in parameter store for unified parameter management
- Enables slider controls and interactive editing (dragging, corner editing) to work from preset values

### PresetLoader.convertToDefaults()

Converts preset format to TerritoryDefaults format for store initialization.

**Returns:**
- `projections`: Map of territory code → projection ID
- `translations`: Map of territory code → {x, y} pixel offsets
- `scales`: Map of territory code → scale multiplier (for parameter store initialization)

**Translation Handling:**
Extracts `translateOffset` from preset layout and stores as x/y translation values.

**Scale Handling:**
Extracts `scaleMultiplier` for parameter store initialization. Scale multipliers are stored in parameter store, not territory store.

## Scale Management

The scale system has three interconnected values that work together:

### Scale Value Types

**1. baseScale** (from preset parameters)
- Base scale value before any multiplier applied
- Represents the "reference" scale for the territory
- Stored in CompositeProjection subprojection metadata
- Example: 3780 for Guadeloupe

**2. scaleMultiplier** (from preset parameters or parameter store)
- Adjustment factor applied to baseScale
- Range: typically 0.5 - 2.0 (50% to 200%)
- Modified by "advanced parameters" scale slider (Échelle: 1.20×)
- Stored in parameter store (single source of truth)
- Example: 1.4 for Guadeloupe

**3. scale** (calculated or from parameter store)
- Final scale value applied to D3 projection
- Calculated as: `scale = baseScale × scaleMultiplier`
- Can be overridden by "view parameters" scale slider (Scale: 100-10000)
- Example: 3780 × 1.4 = 5292 for Guadeloupe

### Scale Application Flow

**Initialization (from preset):**
```
Preset provides:
  baseScale: 3780
  scaleMultiplier: 1.4
  scale: 5292 (= 3780 × 1.4)

CompositeProjection.initialize():
  1. Extracts baseScale and scaleMultiplier from params
  2. Applies: projection.scale(baseScale × scaleMultiplier)
  3. Stores both values in subprojection metadata
```

**User Changes Advanced Scale Slider (scaleMultiplier):**
```
User moves slider to 1.6×

updateScale(territoryCode, 1.6):
  1. Checks if scale parameter differs from baseScale × scaleMultiplier
  2. If not overridden: updates scaleMultiplier to 1.6
  3. Applies: projection.scale(baseScale × 1.6) = 6048
  4. Updates scale parameter to match: paramStore.setTerritoryParameter('scale', 6048)
  5. Keeps baseScale and scaleMultiplier in sync
```

**User Changes View Parameters Scale Slider (absolute scale):**
```
User moves slider to 8000

updateTerritoryParameters(territoryCode):
  1. Reads params.scale = 8000 from parameter store
  2. Applies: projection.scale(8000)
  3. Does NOT modify baseScale or scaleMultiplier
  4. Future scaleMultiplier updates blocked (8000 ≠ 3780 × 1.4)
```

### Scale Override Detection

**updateScale() logic:**
```typescript
const expectedScale = subProj.baseScale * subProj.scaleMultiplier
if (params.scale !== undefined && Math.abs(params.scale - expectedScale) > 0.1) {
  // User has overridden scale parameter - don't overwrite with multiplier

}
// Otherwise: allow multiplier to update scale
```

**updateTerritoryParameters() logic:**
```typescript
if (params.scale !== undefined) {
  // User set scale parameter directly - use it
  correctScale = params.scale
}
else {
  // Use calculated scale from baseScale × scaleMultiplier
  correctScale = subProj.baseScale * subProj.scaleMultiplier
}
projection.scale(correctScale)
```

### Scale Slider Behaviors

**Advanced Parameters Scale Slider** (Échelle: 0.5× - 2.0×)
- Modifies `scaleMultiplier` in parameter store
- Updates CompositeProjection via parameter provider
- Recalculates and syncs `scale` parameter to match
- Blocked if user has overridden scale parameter directly
- Used for relative adjustments to preset baseline

**View Parameters Scale Slider** (Scale: 100-10000)
- Sets `scale` parameter directly in parameter store
- Overrides calculated scale (baseScale × scaleMultiplier)
- Blocks future scaleMultiplier updates for that territory
- Used for absolute scale values independent of preset

## Projection Parameter Handling

### Parameter Types

**Center vs Rotate:**
- **Cylindrical/Azimuthal projections** (mercator, stereographic): Use `center` for positioning
- **Conic projections** (conic-conformal, albers): Use `rotate` for positioning

**CompositeProjection.initialize() applies parameters by projection type:**
```typescript
const isConicProjection = projectionType.includes('conic') || projectionType.includes('albers')

if (isConicProjection && projection.rotate && params.rotate) {
  projection.rotate(params.rotate) // For conic: use rotate
}
else if (params.center) {
  projection.center(params.center) // For cylindrical: use center
}
else if (projection.rotate && params.rotate) {
  projection.rotate(params.rotate) // Fallback to rotate
}
```

### Parameter Provider Pattern

CompositeProjection receives parameters through ProjectionParameterProvider interface:
- Abstracts parameter source (parameter store, config, or defaults)
- Provides `getEffectiveParameters(territoryCode)` for parameter resolution
- Supports parameter inheritance (territory → global → default)

**getParametersForTerritory()** merges config and dynamic parameters:
```typescript
private getParametersForTerritory(territoryCode: string, configParams: TerritoryConfig) {
  if (this.parameterProvider) {
    const dynamicParams = this.parameterProvider.getEffectiveParameters(territoryCode)
    return {
      center: dynamicParams.center ?? configParams.center,
      rotate: dynamicParams.rotate ?? configParams.rotate,
      parallels: dynamicParams.parallels ?? configParams.parallels,
      scale: dynamicParams.scale,
      baseScale: dynamicParams.baseScale,
      scaleMultiplier: dynamicParams.scaleMultiplier,
      // ... other parameters
    }
  }
  // Fallback to config params
}
```

### Parameter Updates

**updateTerritoryParameters()** applies parameter changes:
1. Reads updated parameters from parameter provider
2. Applies center/rotate based on projection type
3. Applies parallels if supported
4. Re-applies scale (respects parameter overrides)
5. Applies precision if supported
6. Forces composite projection rebuild

**Parameter change flow:**
```
User changes parameter slider
  ↓
handleParameterChange() in TerritoryParameterControls
  ↓
parameterStore.setTerritoryParameter(code, key, value)
  ↓
emit('parameterChanged', code, key, value)
  ↓
handleParameterChange() in TerritoryControls
  ↓
cartographer.updateTerritoryParameters(code)
  ↓
compositeProjection.updateTerritoryParameters(code)
  → Reads latest parameters
  → Applies to D3 projection
  → Sets compositeProjection = null (force rebuild)
  ↓
Next render: build() uses updated projection
```

## Initialization Sequence

### Race Condition Prevention

The initialization sequence prevents race conditions where CompositeProjection initializes before preset parameters load:

**Problem:** Without proper sequencing, territories render with default parameters before preset loads, causing incorrect initial scales and positions.

**Solution:** `useAtlasData.initialize()` calls InitializationService which handles preset loading:
```typescript
async function initialize() {
  // InitializationService handles all initialization:
  // 1. Load atlas config
  // 2. Load default preset for view mode
  // 3. Apply parameters to stores
  // 4. Initialize geo data
  const result = await InitializationService.initializeAtlas({
    atlasId: atlasStore.selectedAtlasId,
  })

  if (!result.success) {
    throw new Error(result.errors?.join(', ') || 'Atlas initialization failed')
  }
}
```

### Reentrant Initialization Guard

`InitializationService` methods handle concurrent calls gracefully:
```typescript
let initializationPromise: Promise<void> | null = null

async function initializeWithPresetMetadata() {
  // If already initializing, return the existing promise
  if (initializationPromise) {
    return initializationPromise
  }

  // Create and store the initialization promise
  initializationPromise = (async () => {
    // Load preset and apply to stores
  })()

  return initializationPromise
}
```

### Store Application Order

Preset data applies to stores in this order:
1. **Territory projections** - Sets projection type per territory
2. **Territory translations** - Sets x/y pixel offsets
3. **Parameter store scales** - Sets scaleMultiplier via `setTerritoryParameter(code, 'scaleMultiplier', value)`
4. **Parameter store parameters** - Sets projection parameters (center, rotate, parallels, scale, baseScale, scaleMultiplier)

## Rendering Integration

### CompositeProjection Initialization

During `CompositeProjection.initialize()`:
1. Iterates through all atlas territories
2. Calls `getParametersForTerritory()` to merge preset parameters
3. Applies projection type (creates D3 projection)
4. Applies positioning parameters (center or rotate)
5. Applies scale: `projection.scale(baseScale × scaleMultiplier)`
6. Stores projection with metadata in `subProjections` array

### Build-time Processing

During `CompositeProjection.build(width, height)`:
1. Calculates map center from viewport dimensions
2. Applies translation offsets to each territory projection
3. Reads translate parameter from parameter store if set
4. Combines territory offset + parameter translate + viewport center
5. Applies final translate to D3 projection: `projection.translate([x, y])`
6. Applies clip extents if defined in preset
7. Returns composite projection function for D3 rendering

### Cartographer Coordination

`CartographerService.renderCustomComposite()`:
1. Receives custom composite settings from territory store
2. Calls `applyCustomCompositeSettings()` to apply territory-specific overrides
3. Creates D3 projection via `projectService.getD3Projection()`
4. Uses D3MapRenderer for SVG generation with shared projection
5. Stores projection as `lastProjection` for overlay rendering
6. CompositeProjection builds and returns multi-territory projection

## Parameter Validation

### Constraint System

Parameter constraints define valid ranges and relevance per projection family:
- Defined in parameter registry (`src/core/parameters/parameter-registry.ts`)
- Includes all exportable parameters: center, rotate, parallels, scaleMultiplier, translateOffset, clipAngle, precision, pixelClipExtent, projectionId
- Provides constraints for all 4 projection families (CONIC, AZIMUTHAL, CYLINDRICAL, PSEUDOCYLINDRICAL)

### Validation Flow

Parameter validation occurs at multiple points:
1. **User input** - Before setting parameter in parameter store
2. **Parameter store** - When calling `setTerritoryParameter()`
3. **Territory controls** - Real-time validation feedback in UI
4. **Preset loading** - Validates preset structure and required parameters

### Preset Validation

When loading presets, validation checks:
1. **Structural validation** - Via CompositeImportService for JSON structure
2. **Required parameters** - Via parameter registry for each territory
   - `projectionId` - Checked at `projection.id` (not in parameters)
   - `translateOffset` - Checked in `layout` section
   - Other required parameters - Checked in `projection.parameters`
3. **Parameter relevance** - Only validates parameters relevant to projection family
4. **Value validation** - Validates parameter values against constraints

## Export System Integration

### Preset Generation

When exporting composite projection configuration:
1. Gets all exportable parameters from parameter provider
2. Separates projection parameters from layout parameters
3. Serializes complete projection configuration with metadata
4. Generates JSON preset file in standard format
5. Stores in `configs/presets/{atlasId}-{presetName}.json`

### Export Format

Exported presets follow standard structure:
- `projection.id` - Projection identifier (e.g., 'conic-conformal')
- `projection.family` - Projection family (e.g., 'CONIC')
- `projection.parameters` - All projection-specific parameters
- `layout.translateOffset` - Territory position offset [x, y]
- `layout.pixelClipExtent` - Optional clipping extent [x1, y1, x2, y2]
- `bounds` - Geographic bounds for each territory
- `metadata` - Export date, creator, version, notes

## Troubleshooting

### Common Issues

**Territories render at incorrect scale on load:**
- Verify preset has `baseScale` and `scaleMultiplier` defined
- Check `PresetLoader.extractTerritoryParameters()` extracts both values
- Ensure `CompositeProjection.getParametersForTerritory()` includes baseScale and scaleMultiplier
- Verify `initializeWithPresetMetadata()` completes before `geoDataStore.initialize()`

**Scale sliders not working:**
- Advanced slider: Check if scale parameter override exists (blocks multiplier updates)
- View parameters slider: Verify `updateTerritoryParameters()` respects params.scale
- Both: Ensure `compositeProjection = null` triggers rebuild after changes

**Primary territory uses wrong projection type:**
- Verify preset projection type matches expected value
- Check `InitializationService.initializeAtlas()` applies projections to parameter store
- Ensure `cartographer.applyCustomCompositeSettings()` doesn't override projection unnecessarily

**Territories positioned incorrectly:**
- Verify projection uses correct positioning method (center vs rotate)
- Check `isConicProjection` logic in initialization
- Ensure cylindrical projections use `.center()` not `.rotate()`
- Verify `translateOffset` values are appropriate for scale

**Parameters not loading from preset:**
- Check `parameterStore.setTerritoryParameters()` receives extracted parameters
- Verify parameter provider returns correct effective parameters
- Ensure no race condition (preset loads after first render)
- Verify `cartographer.updateTerritoryParameters()` called for each territory after parameter store update

**Territory mismatch (preset defines fewer territories than atlas allows):**
- Occurs when preset defines fewer territories than atlas allows (via "Territoires à inclure" selector)
- Example: Preset with 5 overseas territories, but atlas configuration allows 12 territories
- Behavior: Territories not in preset are NOT rendered (no fallback parameters)
- Implementation: Three-tier filtering approach
  1. **AtlasCoordinator**: Extracts only preset territories to parameter store
  2. **CompositeProjection.initialize()**: Skips territories without `projectionId` parameter
  3. **PresetSelector**: Applies only preset territories when switching presets
- Detection: `CompositeProjection` checks for `projectionId` parameter presence
- Missing territories logged: "Skipping territory X - not defined in preset"
- Composition borders are only drawn for territories present in preset
- Works consistently on initial load and preset switching

## Manual Preset Loading

### PresetSelector Component

The `PresetSelector` component (`src/components/ui/presets/PresetSelector.vue`) provides UI for manually loading different presets in composite-custom mode.

**Functionality:**
- Displays dropdown with available presets for current atlas
- Loads preset metadata asynchronously for dropdown labels
- Applies selected preset to stores and CompositeProjection
- Applies global parameters (referenceScale, canvasDimensions) to projectionStore
- Handles loading states and error display

**Preset Application Flow:**
```typescript
async function loadPreset(presetId: string) {
  // 1. Load and validate preset file
  const result = await PresetLoader.loadPreset(presetId)

  // 2. Convert to internal formats
  const defaults = PresetLoader.convertToDefaults(result.preset)
  const territoryParameters = PresetLoader.extractTerritoryParameters(result.preset)

  // 3. Apply global parameters to projectionStore
  if (result.preset.referenceScale !== undefined) {
    projectionStore.referenceScale = result.preset.referenceScale
  }
  if (result.preset.canvasDimensions) {
    projectionStore.canvasDimensions = {
      width: result.preset.canvasDimensions.width,
      height: result.preset.canvasDimensions.height
    }
  }

  // 4. Clear existing parameter overrides
  allCurrentTerritoryCodes.forEach((code) => {
    parameterStore.clearAllTerritoryOverrides(code)
  })

  // 5. Apply preset to stores
  parameterStore.initializeFromPreset({}, parametersWithoutScale)
  parameterStore.setTerritoryProjection(code, projection)
  parameterStore.setTerritoryTranslation(code, axis, value)
  parameterStore.setTerritoryParameter(code, 'scaleMultiplier', scale)

  // 6. CRITICAL: Update CompositeProjection with new parameters
  Object.keys(parametersWithoutScale).forEach((territoryCode) => {
    cartographer.updateTerritoryParameters(territoryCode)
  })
}
```

**Key Integration Points:**
- **Parameter Store Update**: Uses `initializeFromPreset()` to apply extracted parameters
- **CompositeProjection Sync**: Calls `updateTerritoryParameters()` for each territory to re-read parameters from parameter store
- **Scale Parameter Filtering**: Excludes computed `scale` parameter to prevent conflicts with `baseScale × scaleMultiplier` calculation
- **Store Coordination**: Updates territory store (projections, translations) and parameter store (scaleMultiplier, other parameters) simultaneously

**Critical Fix**: Manual preset loading requires explicit CompositeProjection update after parameter store changes. Without calling `updateTerritoryParameters()`, the CompositeProjection continues using previous parameter values despite the parameter store being updated correctly.

## Reset System

### Reset to Preset Defaults

The reset system restores territories to their preset configuration, managed through `useTerritoryTransforms()` composable.

**Global Reset** (`resetTransforms()`)
- Restores all territories to preset defaults (projections, translations, scales, parameters)
- Checks all territories via `atlasStore.atlasService.getAllTerritories()`
- Clears parameter overrides for all territories
- Applies preset projections, translations, scales, and parameters to stores
- Triggers cartographer updates for all territories via `updateTerritoryParameters()`
- Falls back to hardcoded defaults if no preset available

**Territory-Specific Reset** (`resetTerritoryToDefaults()`)
- Restores single territory to its preset configuration
- Clears all parameter overrides for that territory
- Applies preset values (projection, translation, scale, parameters)
- Triggers cartographer update for the specific territory
- Falls back to default values (projection unchanged, translation [0,0], scale 1.0)

**Reset Divergence Detection**
- Global reset button enables when any territory diverges from preset
- Uses `usePresetDefaults().hasDivergingParameters()` to detect changes
- Checks all territories via `getAllTerritories()`
- Compares current state (projections, translations, scales, parameters) against preset defaults
- Territory-specific reset buttons enable when individual territory has overrides

**Cartographer Integration**
- Reset operations call `cartographer.updateTerritoryParameters(code)` for each modified territory
- Updates trigger projection rebuild via `compositeProjection = null`
- Ensures visual changes reflect immediately after reset

## File References

**Core Services:**
- `src/services/presets/preset-loader.ts` - Preset loading and extraction
- `src/services/atlas/atlas-coordinator.ts` - Preset orchestration
- `src/services/projection/composite-projection.ts` - Projection initialization and updates

**State Management:**
- `src/stores/config.ts` - Preset metadata initialization
- `src/stores/parameters.ts` - Projection parameter management (including scale multipliers, territory projections, translations)

**UI Components:**
- `src/components/TerritoryControls.vue` - Main territory control container with global reset
- `src/components/ui/parameters/TerritoryParameterControls.vue` - Territory-specific parameter controls and reset
- `src/components/ui/presets/PresetSelector.vue` - Preset selection UI

**Composables:**
- `src/composables/useTerritoryTransforms.ts` - Reset functionality and territory transform management
- `src/composables/usePresetDefaults.ts` - Preset defaults tracking and divergence detection
- `src/composables/useAtlasData.ts` - Atlas data initialization with preset sequencing

**Validation:**
- `src/core/parameters/parameter-registry.ts` - Unified parameter validation and constraints (replaces parameter-constraints.ts)

**Preset Files:**
- `configs/presets/{atlasId}-{presetName}.json` - Saved preset configurations for all types (unified location)

## Architecture

### Single Source of Truth

Presets are stored inline within atlas entries in `configs/atlas-registry.json`:
- Each atlas contains a `presets` array with full `PresetDefinition` entries
- `PresetDefinition` includes metadata (id, name, type) and config file path
- No separate preset registry file
- Preset config files remain in `configs/presets/` directory

### Type Safety

- `PresetType` discriminator ('composite-custom' | 'unified' | 'split' | 'built-in-composite')
- `LoadResult<T>` generic pattern for consistent error handling
- TypeScript narrows types based on preset.type discriminator
- Compile-time guarantees prevent type mismatches

### Registry Queries

Components and services query atlas registry directly:
- `getAtlasPresets(atlasId)` - Returns all presets for an atlas
- `getDefaultPreset(atlasId)` - Returns preset marked with `isDefault: true`
- `getPresetById(presetId)` - Returns specific preset by ID
- No transformation layer between registry and application code

### Preset Loading

`PresetLoader` loads configuration files:
1. Query atlas registry for `PresetDefinition` (includes `configPath`)
2. Load JSON from `configPath` using fetch
3. Validate against preset type schema
4. Return typed preset configuration

Focus on file I/O, validation delegates to core layer.
