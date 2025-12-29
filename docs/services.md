clipExtent# Service Layer Architecture

## Overview
The service layer contains business logic extracted from Vue components and Pinia stores.
Services are organized by concern into subdirectories: atlas/, data/, projection/, rendering/, export/.
Services follow two main patterns: instance-based (for stateful operations) and static (for pure functions).

## Service Patterns

### Instance-Based Pattern
Used when service maintains state, requires initialization, or represents domain objects.

**Characteristics**:
- Has private state (properties)
- Requires instantiation with `new`
- May have complex initialization
- Often caches data or configuration

**Use Cases**:
- Service holds configuration or loaded data
- Service coordinates multiple stateful dependencies
- Service represents a domain object with behavior
- Multiple instances with different configurations needed

**Examples**: GeoDataService (caching), CompositeProjection (domain object), Cartographer (orchestrator)

### Static Pattern
Used when service provides pure transformations, utility functions, or stateless orchestration.

**Characteristics**:
- No instance state
- All methods are static
- Pure functions or stateless coordinators
- Testable without instantiation

**Use Cases**:
- Pure data transformations
- Stateless business rule evaluation
- Orchestration of other services
- Utility calculations
- Factory with singleton caching

**Examples**: TerritoryFilterService (pure functions), AtlasCoordinator (orchestration), MapOverlayService (utilities)

### Pattern Decision Guide
- **Need state?** → Instance pattern
- **Pure function?** → Static pattern
- **Orchestration without state?** → Static pattern
- **Domain object with behavior?** → Instance pattern
- **Factory with caching?** → Static pattern with instance cache
- **Strategy pattern?** → Instance strategies with static coordinator

## Atlas Services (src/services/atlas/)

### AtlasPatternService
Pattern detection and behavioral decisions for different atlas types.
- `isSingleFocus()` - Check if atlas has single mainland
- `isEqualMembers()` - Check if atlas has equal member states
- `supportsSplitView()` - Check if split view is supported
- `getDefaultViewMode()` - Get recommended view mode
- `getPrimaryTerritoryRole()` - Determine mainland vs member role

### AtlasCoordinator
Orchestrates atlas changes and configuration updates.
Loads presets automatically when defaultPreset is configured.
Extracts territory-specific projection parameters from presets for rendering.
Ensures composite projection is always selected by using atlas metadata's defaultCompositeProjection or falling back to first available composite projection.
- `handleAtlasChange()` - Coordinate all updates when changing atlas (async - loads preset if available)
- Returns territoryParameters map in AtlasChangeResult for parameter store initialization
- Determines composite projection from metadata or AtlasMetadataService.getCompositeProjections()
- `getInitialConfiguration()` - Build initial config for atlas (async)
- `getTerritoryMode()` - Determine territory mode (all-territories for wildcard atlases, split otherwise)

### InitializationService
Centralizes application initialization logic for all scenarios.
Handles atlas initialization, preset loading, configuration import, and view mode changes.
Static service providing consistent initialization workflows.
Uses registry behavior for preset configuration instead of atlas config.
- `initializeAtlas()` - Initialize atlas on startup or atlas change
- `loadPreset()` - Load and apply preset configuration
- `importConfiguration()` - Import user-provided configuration
- `changeViewMode()` - Switch view mode within same atlas
- `applyStateToStores()` - Apply application state to Pinia stores

**Validation Order**:
Validates configuration BEFORE clearing any data to preserve UI state on failed initialization.
Steps:
1. Validate atlas configuration exists
2. Validate preset exists for view mode
3. Clear existing data
4. Initialize new atlas/preset

This fail-fast approach prevents UI corruption when switching atlases or view modes.

**Required Presets**:
All view modes require valid presets to function:
- `composite-custom` - Requires preset with type='composite-custom'
- `unified` - Requires preset with type='unified'
- `split` - Requires preset with type='split'
- `built-in-composite` - Requires preset with type='built-in-composite'

Initialization fails immediately if preset is not found, preventing silent fallbacks.

**Preset Loading**:
Gets defaultPreset and availablePresets from registry behavior via getAtlasBehavior().
Does not read preset fields from atlas config (deprecated locations).

**Preset Defaults Isolation**:
Stores preset defaults (via usePresetDefaults) for composite-custom and split modes.
Both modes have per-territory projections and parameters that users can modify and reset.
Built-in-composite and unified modes do not store preset defaults (no per-territory customization).
Built-in-composite mode relies exclusively on d3-composite-projections library positioning.

### TerritoryDefaultsService
Initializes default territory projections, translations, and scales for atlases.
Provides centralized logic for calculating territory defaults based on atlas configuration.
- `initializeAll()` - Initialize all territory defaults (projections, translations, scales)
- `initializeProjections()` - Calculate default projection IDs for territories
- `initializeTranslations()` - Calculate default pixel offsets for territories
- `initializeScales()` - Calculate default scale multipliers for territories

Returns TerritoryDefaults (imported from @/core/presets) containing projections (Record<string, string>), translations (Record<string, {x, y}>), and scales (Record<string, number>).
Used by config store initialization and AtlasCoordinator for setting up territory parameters on atlas changes.

### PresetLoader
Loads preset composite projection configurations from configs/presets/ directory.
Static service providing preset loading orchestration.
Uses core validation and conversion logic from @/core/presets.
- `loadPreset()` - Load and validate preset file using core validators (async)
- `convertToDefaults()` - Re-exports core converter for TerritoryDefaults format
- `extractTerritoryParameters()` - Re-exports core converter for projection parameters

Delegates validation to core validateCompositePreset() function.
Delegates conversion to core convertToDefaults() and extractTerritoryParameters() functions.
Loads presets by querying atlas registry for preset definitions, then loading config files from paths specified in registry.
Focuses on file I/O and orchestration, domain logic in core layer.

### AtlasMetadataService
Provides clean API for accessing atlas-level projection metadata from preset files.
Static service with metadata caching for performance.
- `getAtlasMetadata()` - Get complete atlas metadata from presets (async)
- `getCompositeProjections()` - Get composite projection configurations (async)
- `getProjectionPreferences()` - Get projection preferences (async)
- `getProjectionParameters()` - Get projection parameters (async)
- `clearCache()` - Clear metadata cache

Uses PresetLoader internally, provides fallback defaults for atlases without presets.
Map display defaults (showGraticule, showSphere, showCompositionBorders, showMapLimits) are controlled by UI store only.

### AtlasService
Atlas-aware facade for accessing territory data and configuration.
Instance-based service providing unified API for components.
- `getTerritories()` - Get filtered/grouped territories
- `getTerritoryModes()` - Get available display modes
- `getProjectionParams()` - Get projection parameters (ProjectionParameters format)

## Territory Services (src/services/territory/)

Domain services for territory-specific business logic and operations.
Extracted from composables to provide testable, reusable business rules.

### TerritoryVisibilityService
Static service for territory visibility business rules.
Pure functions determining when to show/hide territory UI elements.

**Methods**:
- `shouldShowEmptyState()` - Determines if empty state alert should be shown
  - Business Rule: Show when no territories AND no mainland visible
  - Inputs: territory count, atlas pattern, mainland presence
  - Returns boolean
- `shouldShowMainland()` - Determines if mainland section should be shown
  - Business Rule: Only single-focus atlases show mainland
  - Input: atlas pattern
  - Returns boolean
- `hasMainlandInList()` - Checks if mainland code is in territory list
  - Utility helper for mainland presence detection
  - Inputs: territory codes array, mainland code
  - Returns boolean

**Example**:
```typescript
const shouldShow = TerritoryVisibilityService.shouldShowEmptyState({
  territoryCount: 0,
  atlasPattern: 'equal-members',
  hasMainlandInActiveTerritories: false,
}) // Returns true - no territories and no mainland
```

### TerritoryResetService
Static service for calculating territory reset operations.
Separates reset calculation (WHAT to do) from execution (HOW to do it).

**Methods**:
- `calculateBulkReset()` - Calculates reset operations for all territories
  - Determines strategy: preset (when available) or fallback (hardcoded defaults)
  - Returns BulkResetOperation with all territory operations
  - Includes active territory list for preset resets
- `calculateTerritoryReset()` - Calculates reset for single territory
  - Returns TerritoryResetOperation with projection, translation, scale, parameters
  - Uses preset values when available, falls back to defaults
- `getDefaultTranslation()` - Returns default translation {x: 0, y: 0}
- `getDefaultScale()` - Returns default scale 1.0

**Reset Strategies**:
- **Preset**: Uses preset defaults when available (projections, translations, scales, parameters)
- **Fallback**: Uses hardcoded defaults (scale: 1.0, translation: 0,0) when no preset

**Example**:
```typescript
const operation = TerritoryResetService.calculateBulkReset({
  territories: atlasService.getAllTerritories(),
  presetDefaults: { projections, translations, scales },
  presetParameters: { 'FR-GP': { rotate: [10, 20, 0] } },
})
// Returns: { operations: [...], activeTerritories: ['FR-GP', 'FR-MQ'] }
```

### TerritoryDataService
Instance-based service for aggregating territory data from stores.
Facade pattern simplifying data access and enabling easy mocking.

**Constructor**:
- Requires GeoDataStore for territory data
- Requires ParameterStore for territory parameters

**Methods**:
- `getTerritoryData()` - Aggregates all territory data
  - Returns: { territories, translations, scales, projections }
  - Single call for complete territory data snapshot

**Example**:
```typescript
const service = new TerritoryDataService(geoDataStore, parameterStore)
const data = service.getTerritoryData()
// Returns: { territories: [...], translations: {...}, scales: {...}, projections: {...} }
```

**Benefits**:
- Single source of truth for data aggregation logic
- Easy to mock in tests (inject mock stores)
- Decouples composables from store implementation details
- Can add caching/optimization without affecting consumers

## Data Services (src/services/data/)

### TerritoryDataLoader
Strategy pattern for loading territory data based on atlas pattern.
- `loadTerritories()` - Load territory data using appropriate strategy
- `loadUnifiedData()` - Load unified data with territory filtering
Strategies: SingleFocusLoadStrategy, EqualMembersLoadStrategy

### TerritoryFilterService
Filter and group territories based on display modes.
- `filterTerritories()` - Filter territories by mode
- `groupByRegion()` - Group territories by region

### GeoDataService
Geographic data loading and processing from TopoJSON sources.
Instance-based service managing territory data cache.
- `loadData()` - Load TopoJSON and metadata
- `getAllTerritoriesGeoData()` - Get all territory data
- `getTerritoriesGeoData()` - Get filtered territory data
- `getTerritoryInfo()` - Get territory metadata
- `calculateBounds()` - Calculate geographic bounds

## Projection Services (src/services/projection/)

### ProjectionUIService
Projection grouping and UI visibility logic.
- `getProjectionGroups()` - Group projections by category
- `shouldShowProjectionSelector()` - Visibility for projection selector
- `shouldShowCompositeProjectionSelector()` - Visibility for composite selector

### ProjectionService
Projection creation and management using factory/registry pattern.
Instance-based service with region-specific parameters.
- `setProjectionParams()` - Set region parameters
- `setFittingMode()` - Set auto or manual fitting mode
- `getProjection()` - Create projection using factory with dynamic parameter application
- `getAvailableProjections()` - Get filtered projections
- `groupProjectionsByCategory()` - Group projections
- `recommendProjection()` - Get projection recommendation

**Parameter Application Strategy**:
- Azimuthal projections: Uses rotation parameters for positioning
- Conic projections: Uses center (as rotation) in auto mode, direct center in manual mode
- Cylindrical/Pseudocylindrical: Uses rotation parameters
- Domain fitting (auto mode): D3's `fitExtent` calculates scale automatically
- Manual mode: User controls scale and center directly

### Positioning Module
**Location**: `src/core/positioning/`

Provides canonical positioning format for projection-agnostic geographic focus point storage.
Conversion to D3 methods happens at render time based on projection family.

**Files**:
- `converters.ts` - Pure conversion functions between canonical and D3 formats
- `applicator.ts` - Applies canonical positioning to D3 projections
- `index.ts` - Module exports

**Key Functions**:
- `centerToCanonical()` - Convert D3 center to canonical format
- `rotateToCanonical()` - Convert D3 rotate to canonical format  
- `canonicalToCenter()` - Convert canonical to D3 center
- `canonicalToRotate()` - Convert canonical to D3 rotate
- `applyCanonicalPositioning()` - Apply canonical positioning to projection based on family
- `extractCanonicalFromProjection()` - Extract canonical from current projection state
- `toPositioningFamily()` - Convert ProjectionFamily to PositioningFamily

**Canonical Format**:
```typescript
interface CanonicalPositioning {
  focusLongitude: number  // -180 to 180
  focusLatitude: number   // -90 to 90
  rotateGamma?: number    // -180 to 180
}
```

**D3 Conversion**:
- CYLINDRICAL: `center = [focusLon, focusLat]`
- CONIC/AZIMUTHAL: `rotate = [-focusLon, -focusLat, gamma]`

### CompositeProjection
Custom composite projection with manual territory positioning.
Instance-based service managing sub-projections in final screen coordinates.
Supports parameter provider pattern for dynamic projection parameter updates.
Handles territory-specific clipExtent for precise content clipping.
Uses canonical positioning for projection-agnostic parameter storage.

**Constructor**:
- Accepts optional `ProjectionParameterProvider` for dependency injection
- Accepts optional `referenceScale` parameter from preset configuration
- Accepts optional `canvasDimensions` parameter from preset configuration
- Enables dynamic parameter updates from parameter store without direct coupling

**Core Methods**:
- `initialize()` - Initialize sub-projections with base settings (uses parameter provider if available)
- `build()` - Build composite projection with translate() and clipExtent applied to all sub-projections
- `updateTerritoryProjection()` - Change territory projection type, syncs scaleMultiplier from store
- `updateTerritoryParameters()` - Update projection parameters using canonical positioning format
- `updateReferenceScale()` - Update reference scale and recalculate all territory scales dynamically
- `updateTranslationOffset()` - Set territory position offset
- `updateScale()` - Set territory scale multiplier
- `getCompositionBorders()` - Get projected border rectangles for visualization (uses clipExtent when available)
- `exportConfig()` - Export configuration as JSON
- `getCanonicalPositioning()` - Extract canonical positioning from parameters

**Positioning Integration**:
- Uses `applyCanonicalPositioning()` from positioning module
- Reads `focusLongitude`, `focusLatitude`, `rotateGamma` from parameters
- Normalizes legacy `center`/`rotate` format to canonical at entry point (`getParametersForTerritory`)
- Internal code assumes canonical format after normalization
- Converts to appropriate D3 method based on projection family at render time

**ClipExtent Support**:
- Reads pixelClipExtent parameter from parameter store for each territory
- Supports pixel-based clipping coordinates in [x1, y1, x2, y2] format relative to territory position
- Automatically detects legacy normalized coordinates vs new pixel coordinates
- Applies clipExtent during build() with epsilon padding for precise clipping boundaries
- Composition borders follow clipExtent regions instead of geographic bounds when pixelClipExtent is available

**Dynamic Scale Updates**:
The `updateReferenceScale()` method recalculates scales for all sub-projections without rebuilding:
- Iterates through all sub-projections
- Calculates new scale as: `referenceScale * scaleMultiplier`
- Applies scale directly to D3 projection
- Updates baseScale metadata for each sub-projection
- Forces composite projection rebuild by setting `compositeProjection = null`
- Enables smooth reference scale slider updates without flickering

**Scale Synchronization**:
- `updateTerritoryProjection()` reads scaleMultiplier from store before creating new projection
- Detects when scaleMultiplier changed by comparing store value with cached value
- Applies correct scale when either family changes or scaleMultiplier changes
- Ensures reset operations properly apply store values to visual projection

**Parameter Integration**:
- `getParametersForTerritory()` - Merges config parameters with dynamic parameters from provider
- Uses nullish coalescing (`??`) to properly handle arrays and zero values
- Dynamic parameters take precedence over static config values
- Includes pixelClipExtent parameter from parameter store for territory-specific clipping
- `updateTerritoryParameters()` applies all supported parameters including scale, which integrates with territory scale multipliers

**Core Utilities Integration**:
Uses `@atlas-composer/projection-core` for composite projection building:
- `buildCompositeProjection()` - Creates the composite projection function with stream multiplexing and inversion
- `calculateClipExtentFromPixelOffset()` - Converts pixelClipExtent arrays to D3 clipExtent format
- Eliminates code duplication between Vue app and standalone loader

**Scale Parameter Handling**:

## View Services (src/services/view/)

### ViewOrchestrationService
**Pattern**: Static service (pure functions)
**Location**: `src/services/view/view-orchestration-service.ts`
**Lines**: 382

**Purpose**: Centralized component visibility and control state logic for all view modes. Provides a single source of truth for determining what UI elements should be visible or enabled based on application state.

**Architecture**:
- All methods are static (no instance state)
- Takes `ViewState` snapshot as input parameter
- Returns boolean flags for visibility/enabled states
- Pure functions enable comprehensive testing
- Follows same pattern as ProjectionUIService

**ViewState Interface**:
```typescript
interface ViewState {
  viewMode: ViewMode                          // Current view mode
  atlasConfig: AtlasConfig                    // Current atlas configuration
  hasPresets: boolean                         // Presets available
  hasOverseasTerritories: boolean             // Filtered territories exist
  isPresetLoading: boolean                    // Loading state
  showProjectionSelector: boolean             // From ProjectionUIService
  showIndividualProjectionSelectors: boolean  // From ProjectionUIService
  isMainlandInTerritories: boolean            // Mainland in filtered list
  showMainland: boolean                       // Atlas has mainland config
}
```

**Visibility Methods** (20+ methods):

**Main Layout**:
- `shouldShowRightSidebar(state)` - Returns true for non-unified modes
- `shouldShowBottomBar(state)` - Always returns true (display options always visible)

**Sidebar Content Switching**:
- `shouldShowProjectionParams(state)` - Projection parameters visibility
  - True for: unified, built-in-composite modes
  - False for: composite-custom, split (show territory controls instead)
- `shouldShowTerritoryControls(state)` - Territory controls visibility
  - True for: composite-custom, split modes
  - Inverse of shouldShowProjectionParams

**Territory Controls Sub-components**:
- `shouldShowPresetSelector(state)` - Preset selector visibility
  - True only in composite-custom mode with available presets
- `shouldShowImportControls(state)` - Import/export controls visibility
  - True for composite-custom or split modes
- `shouldShowGlobalProjectionControls(state)` - Global projection controls
  - True only in composite-custom mode
- `shouldShowTerritoryParameterControls(state)` - Territory parameter editing
  - True only in composite-custom mode
- `shouldShowMainlandAccordion(state)` - Mainland territory accordion
  - True in individual projection mode with mainland configuration
- `shouldShowProjectionDropdown(state)` - Projection dropdown per territory
  - True when NOT in composite-custom mode (uses parameter controls instead)

**Empty State Logic**:
- `shouldShowEmptyState(state)` - Complex logic handling mainland/overseas combinations
  - Returns true when: no overseas territories AND (mainland not shown OR mainland not in list)
  - Ensures empty state only shows when truly no territories to display
- `getEmptyStateMessage(state)` - Returns appropriate i18n key
  - 'territory.noOverseas' - Standard message for empty state

**Control State Methods**:
- `shouldShowTerritorySelector(state)` - Territory selector visibility
  - Shown when: atlas has territory selector capability AND NOT in composite modes
  - Hidden for composite modes where TerritorySetManager handles territory selection
- `isViewModeDisabled(state)` - View mode selector disabled state
  - Disabled if: only one supported view mode in atlas config

**Layout Variant Methods**:
- `shouldShowCompositeRenderer(state)` - Composite map renderer visibility
  - True for: composite-custom, built-in-composite modes
- `shouldShowSplitView(state)` - Split view component visibility
  - True for: split mode
- `shouldShowUnifiedView(state)` - Unified view component visibility
  - True for: unified mode

**Display Options Visibility**:
- `shouldShowCompositionBordersToggle(state)` - Composition borders toggle
  - True for: composite-custom, built-in-composite modes
- `shouldShowScalePreservationToggle(state)` - Scale preservation toggle
  - True for: split mode

**Integration Pattern**:
Components don't call ViewOrchestrationService directly. Instead, they use the `useViewState` composable which:
1. Aggregates state from Pinia stores (config, geoData) into ViewState object
2. Wraps all service methods in Vue computed refs for reactivity
3. Exposes `viewOrchestration` object with reactive properties

**Usage Example** (in Vue components):
```vue
<script setup>
import { useViewState } from '@/composables/useViewState'

const { viewOrchestration } = useViewState()
// viewOrchestration.shouldShowRightSidebar is a ComputedRef<boolean>
</script>

<template>
  <!-- Access with .value in template -->
  <CardContainer v-show="viewOrchestration.shouldShowRightSidebar.value">
    <ProjectionParamsControls 
      v-if="viewOrchestration.shouldShowProjectionParams.value" 
    />
    <TerritoryControls 
      v-else-if="viewOrchestration.shouldShowTerritoryControls.value" 
    />
  </CardContainer>
</template>
```

**Benefits**:
1. **Single Source of Truth** - All visibility rules centralized in one service
2. **Testability** - Pure functions with explicit inputs/outputs (61 unit tests)
3. **Type Safety** - ViewState interface explicitly documents all dependencies
4. **Maintainability** - Scattered conditionals replaced with named methods
5. **Discoverability** - Developers know where to find/add visibility logic
6. **Consistency** - Same pattern as ProjectionUIService

**Migration Strategy**:
The refactoring replaced inline template conditionals like:
```vue
<!-- Before -->
<PresetSelector v-if="hasPresets && isCompositeCustomMode" />

<!-- After -->
<PresetSelector v-if="viewOrchestration.shouldShowPresetSelector.value" />
```

**Test Coverage**: 61 unit tests covering all methods and state combinations

**Used by**: MapView.vue, TerritoryControls.vue, AtlasConfigSection.vue, DisplayOptionsSection.vue (all via useViewState composable)

**Related Services**: ProjectionUIService (provides projection-specific UI flags)
- Reference scale parameter: Base scale from preset configuration (defaults: 2700 for single-focus, 200 for equal-members)
- Territory scale multiplier (regular Scale controls): Multiplies reference scale (0.5×-2.0× range)  
- Final scale = reference scale × territory multiplier
- Reference scale parameter sourced from preset configuration, not atlas configuration

**Coordinate Space**:
Sub-projections have translate() applied during build(), so projected coordinates are in final screen space. The getCompositionBorders() method projects geographic bounds directly without adding additional translation offsets.

**Invert Method**:
Uses pure D3 projection.invert() approach without manual coordinate adjustments. Each sub-projection's invert method handles the translate() transformation internally, ensuring accurate coordinate conversion for territory boundary detection.

## Parameter Management Services (src/services/parameters/)

### Unified Parameter Registry System
Central registry-based parameter management with complete metadata, validation, and type safety.
Replaces previous constraint systems with a unified, registry-driven approach.

### ParameterRegistry (src/core/parameters/parameter-registry.ts)
Core registry service providing parameter definitions, metadata, and validation.
Singleton pattern with complete parameter lifecycle management.

**Parameter Definition Management**:
- `register()` - Register parameter definition with metadata, constraints, and validation
- `get()` - Get parameter definition by key with full metadata
- `validate()` - Validate parameter value using registry constraints
- `getConstraints()` - Get validation constraints for parameter
- `getDefault()` - Get default value with territory context support

**Metadata System**:
- Complete parameter metadata (displayName, description, unit, type)
- Projection family relevance (CYLINDRICAL, CONIC, AZIMUTHAL, COMPOSITE, OTHER)
- Data flow specification (preset, computed) and mutability flags
- Export control (exportable, requiresPreset) for serialization
- Type-safe constraints with range validation and custom validation functions

**Registry Coverage**:
- All projection parameters: center, rotate, parallels, translate, clipAngle, precision
- Scale parameter: scaleMultiplier with appropriate constraints
- Type-safe parameter constraints with family-specific relevance
- Comprehensive validation with contextual error messages

### ProjectionParameterManager (src/services/parameters/projection-parameter-manager.ts)
Business logic service for parameter management operations with unified ProjectionParameters format.
Instance-based service integrating with parameter registry for validation and state management.

**Unified Parameter Format**:
Uses ProjectionParameters throughout for consistent parameter handling.
All parameters use array format: center[lon, lat], rotate[lon, lat], parallels[south, north].
Normalizes legacy format to canonical at entry points.

**Parameter Normalization**:
- `normalizeParameters()` - Converts legacy `center`/`rotate` to canonical `focusLongitude`/`focusLatitude`
- Called automatically in `setAtlasParameters()` and `setTerritoryParameters()`
- Presets can use legacy format; normalization happens immediately on parameter entry
- Internal code assumes canonical format after normalization

**Parameter Merging**:
The `mergeParameters()` utility function (src/types/projection-parameters.ts) handles parameter inheritance by merging multiple parameter sets with proper array handling:
- Array parameters are deep-copied to avoid reference issues: `center`, `rotate`, `parallels`, `translateOffset`, `pixelClipExtent`
- Scalar parameters are shallow-copied: `scaleMultiplier`, `precision`, `clipAngle`
- Later parameter sets override earlier ones (territory > global > atlas > defaults)
- Deep copying ensures each territory has independent parameter instances

**Parameter State Management**:
- `setAtlasParameters()` - Set atlas-level ProjectionParameters
- `getGlobalParameters()` - Get global parameter state
- `setGlobalParameter()` - Set global parameter with registry validation
- `getTerritoryParameters()` - Get territory-specific parameter overrides
- `setTerritoryParameter()` - Set territory parameter with registry validation
- `getEffectiveParameters()` - Resolve parameters with inheritance (territory > global > atlas > registry defaults)
- `clearTerritoryOverride()` - Remove territory-specific parameter override

**Registry Integration**:
- `validateParameter()` - Validate parameter using registry constraints
- `validateTerritoryParameters()` - Validate all territory parameters
- `getParameterConstraints()` - Get registry-based constraint definitions
- `isParameterRelevant()` - Check parameter relevance for projection family
- Parameter inheritance with registry defaults as final fallback

**Event System**:
- Parameter change events with territory context
- Validation error events with registry-based error messages  
- Territory parameter lifecycle events (set, clear, validate)

### Parameter System Integration
The parameter store integrates directly with the unified parameter registry system.
All constraint resolution, validation, and parameter management uses ParameterRegistry.

**Parameter Store Integration**:
- `getParameterConstraints()` - Family-specific constraint adapter using ParameterRegistry
- `isParameterRelevant()` - Direct registry relevance checking
- `validateParameter()` - Registry-based single parameter validation
- `validateParameterSet()` - Batch validation using registry constraints

**Territory Configuration Management**:
Territory-specific configuration is fully managed through the parameter system:
- Territory projections stored as `projectionId` parameter (string)
- Territory positions stored as `translateOffset` parameter (tuple [x, y])
- Territory scales stored as `scaleMultiplier` parameter (number)
- Territory clip extents stored as `pixelClipExtent` parameter (tuple [x1, y1, x2, y2])

Helper methods provide backward-compatible API for territory operations:
- `getTerritoryProjection(code)` - Returns effective projectionId for territory
- `setTerritoryProjection(code, id)` - Sets projectionId parameter
- `getTerritoryTranslation(code)` - Returns {x, y} object from translateOffset
- `setTerritoryTranslation(code, axis, value)` - Updates translateOffset tuple

All territory parameters benefit from registry validation, inheritance (territory > global > atlas > registry defaults), and reactivity tracking.

Unified parameter access across all view modes through parameter store.

Global Parameters (Unified/Split modes):
- Read: `parameterStore.globalEffectiveParameters` (reactive computed property)
- Write: `projectionStore.setCustomRotate()`, `setCustomCenter()`, etc. (delegates to parameterStore)
- Inheritance: Registry defaults -> Atlas params -> Global overrides
- Usage: UnifiedControls, ProjectionParamsControls, useMapWatchers, useProjectionPanning

Territory Parameters (Composite modes):
- Read: `parameterStore.getEffectiveParameters(territoryCode)` (reactive via version tracking)
- Write: `parameterStore.setTerritoryParameter(territoryCode, key, value)`
- Inheritance: Registry defaults -> Atlas params -> Global params -> Territory overrides
- Usage: TerritoryParameterControls, CompositeCustomControls, territory-specific operations

Single Source of Truth:
All parameter inheritance logic resides in ProjectionParameterManager.getEffectiveParameters().
No duplicate parameter merging logic exists in application code.
Both global and territory parameters use the same underlying manager for consistency.

**Unified System Benefits**:
- Single source of truth through ParameterRegistry
- Family-specific constraints with comprehensive validation
- Clean parameter system with only current parameters
- Consistent validation across stores, UI, presets, and export systems
- Type-safe parameter definitions with metadata

## Export/Import Services (src/services/export/)

### CompositeExportService
Orchestrates export of composite projection configurations.
Static methods for configuration serialization and code generation.

**Export Methods**:
- `exportToJSON()` - Serialize projection to ExportedCompositeConfig
- `generateCode()` - Generate code using CodeGenerator
- `validateExportedConfig()` - Validate exported configuration

**Export Process**:
1. Get all exportable parameters from parameter provider via `getExportableParameters()`
2. Separate projection parameters from layout parameters using destructuring
   - Layout parameters: `translateOffset`, `pixelClipExtent`
   - Projection parameters: all other exportable parameters
3. Build territory configuration with standard structure

**Configuration Format**:
- `version` - Schema version (currently '1.0')
- `metadata` - Atlas info, export date, creator
- `pattern` - Atlas pattern (single-focus/equal-members)
- `territories[]` - Array of territory configurations
  - `code, name, role` - Territory identification
  - `projection` - Projection configuration
    - `id` - Projection identifier (e.g., 'conic-conformal')
    - `family` - Projection family (e.g., 'CONIC')
    - `parameters` - All projection parameters (center, rotate, parallels, scaleMultiplier, clipAngle, precision, projectionId)
  - `layout` - Territory positioning
    - `translateOffset` - Position offset [x, y] in pixels
    - `pixelClipExtent` - Clipping extent [x1, y1, x2, y2] (optional)
  - `bounds` - Geographic bounds [[minLon, minLat], [maxLon, maxLat]]

**Parameter Structure**:
Maintains clean separation between projection parameters (in `projection.parameters`) and layout parameters (in `layout`).
The `projectionId` parameter is stored in both `projection.id` (standard location) and included in exportable parameters for consistency.

### CompositeImportService
Re-imports exported configurations with validation, automatic version migration, and type safety.
Static methods for JSON parsing and store application.

**Import Methods**:
- `importFromJSON()` - Parse and validate JSON string
- `importFromFile()` - Import from File object (browser File API)
- `checkAtlasCompatibility()` - Check atlas ID compatibility
- `applyToStores()` - Apply configuration to stores (type-safe)

**Import Flow**:
1. Parse JSON string
2. Check version and migrate automatically if needed (via ConfigMigrator)
3. Validate structure (required fields, data types)
4. Check atlas compatibility
5. Return `{ success, config?, errors[], warnings[], migrated?, fromVersion? }`

**Application Flow**:
1. **FIRST**: Apply global preset parameters to projectionStore
   - Apply referenceScale if present
   - Apply canvasDimensions if present
2. **SECOND**: Set baseScale values in CompositeProjection
3. **THIRD**: Apply territory configurations to stores
   - Set projection ID via territoryStore
   - Set translation offsets via territoryStore
   - Set scale multiplier via parameterStore
   - Combine all parameters for parameterStore:
     - Extract `projectionId` from `territory.projection.id`
     - Spread all `projection.parameters`
     - Add layout parameters (`translateOffset`, `pixelClipExtent`)
     - Apply combined parameters via `setTerritoryParameters()`
4. **FOURTH**: Update projection and sync final values

**Parameter Extraction**:
Combines projection and layout parameters into unified parameter set for the parameter store.
Explicitly adds `projectionId` from `projection.id` to ensure it's available in the parameter store.

**Type Safety**:
Uses proper store types throughout, no `any` types.

**Global Parameter Handling**:
Global parameters (referenceScale, canvasDimensions) are applied first before territory-specific settings to ensure correct base values for subsequent calculations.

### ConfigMigrator
Handles automatic migration of exported configurations between schema versions.
Static methods for version detection, migration chain execution, and validation.

**Current Version**: `1.0`

**Migration Methods**:
- `needsMigration()` - Check if config needs migration to current version
- `canMigrate()` - Check if migration is possible (version supported)
- `migrateToCurrentVersion()` - Execute migration chain
- `isCurrentVersion()` - Check if config is already current version
- `compareVersions()` - Compare two version strings

**Migration Architecture**:
- Plugin-based chain (v1.0 → v1.1 → v1.2)
- Pure functions with no side effects
- Automatic integration in import flow
- Detailed logging with messages, errors, warnings

**Adding New Versions**:
Add migration function and update chain in `performMigrationChain()`
- Uses store type patterns for atlas, projection, and view stores
- Proper CompositeProjection API: `updateTerritoryProjection()`
- Store methods: `setTerritoryProjection`, `setTerritoryTranslation`
- Parameter store methods: `setTerritoryParameter(code, 'scaleMultiplier', value)`

### CodeGenerator
Generates ready-to-use code in multiple formats.
Static methods for D3.js (JS/TS) and Observable Plot code generation.

**Code Formats**:
- D3 JavaScript - Standalone projection function
- D3 TypeScript - With full type annotations
- Observable Plot - Plot-compatible projection

**Generated Code Pattern**:
```javascript
import { geoConicConformal } from 'd3-geo'
import { loadCompositeProjection, registerProjection } from '@atlas-composer/projection-loader'

export function create[Atlas]Projection() {
  registerProjection('projection-id', () => geoProjectionFunction())
  const config = { /* embedded JSON */ }
  return loadCompositeProjection(config, { width: 800, height: 600 })
}
```

**Features**:
- Uses `@atlas-composer/projection-loader` NPM package
- Embeds full configuration as JSON
- Includes usage examples (optional)
- Includes header comments with metadata
- Number precision: 6 decimals for all coordinates

### StandaloneProjectionLoader
Core loader implementation (copied to NPM package).
Zero-dependency module for loading exported configurations.

**Features**:
- Plugin architecture - users register projection factories
- Stream multiplexing for routing geometry to sub-projections
- D3 stream protocol compliance
- Geographic bounds-based routing

**Public API**:
- `loadCompositeProjection(config, options)` - Main loader function
- `registerProjection(id, factory)` - Register projection factory
- `clearProjections()` - Clear all registered projections

## Rendering Services (src/services/rendering/)

### MapSizeCalculator
Calculate map dimensions with configurable defaults.
- `calculateSize()` - Calculate map size
- `calculateProportionalSize()` - Calculate proportional size

**Purpose**: Ensures consistent padding between D3 map rendering (graticules, sphere, geography) and overlay rendering (borders, limits).

### D3MapRenderer
Pure D3 rendering service for map visualization.
Static methods using D3-geo for projection-based SVG rendering.

**Purpose**: Provides direct D3 rendering with explicit projection control, enabling shared projection instances between map content and overlays (graticules, borders).

**Methods**:
- `createSvgElement()` - Create SVG element with proper dimensions and viewBox
- `renderSphere()` - Render sphere outline (globe background)
- `renderTerritories()` - Render territory paths with fill and stroke
- `addTerritoryAttributes()` - Add data-territory attributes to paths for styling

**Architecture**:
- All methods are static (stateless rendering)
- Projection passed as parameter for single-instance sharing
- Returns SVGSVGElement for direct DOM insertion
- Uses D3-selection for efficient DOM manipulation
- Uses D3-geo for path generation from GeoJSON

**Projection Sharing**:
The renderer receives projection as a parameter rather than creating one internally.
This enables Cartographer to store the projection (`lastProjection`) for use by:
- Map content rendering (territories, sphere)
- Graticule overlay rendering (same projection instance)
- Composition borders overlay (same projection instance)

### MapOverlayService
Render map overlays (composition borders and map limits) using D3 selection API.
Static methods for SVG overlay rendering:
- `applyOverlays()` - Apply overlays to rendered SVG map
- `computeSceneBBox()` - Compute viewport-based bounding box with insets
- `boundsToRect()` - Convert projection bounds to SVG rectangle
- `createCompositeBorderPath()` - Create border path for composite projections
- `appendRectOverlay()` - Append dashed rectangle overlay to SVG

Overlay Features:
- **Composition Borders**: Dashed borders around territory regions (dash: 8 4, width: 1.25)
  - Rendered for all territories (including mainland) in composite maps
  - Shows individual territory projection boundaries
  - **Territory filtering**: Filters borders to show only active territories in custom composite mode
    - Always shows mainland border regardless of active set
    - Filters overseas territories by filteredTerritoryCodes Set (from geoDataStore)
    - MainlandCode parameter identifies mainland for special treatment
- **Map Limits**: Dashed border around entire rendered content (dash: 4 3, width: 1.5)
  - Always uses viewport-based scene bounds
  - Independent of composition borders (shows full map extent)
- Viewport-based bounds calculation using SVG dimensions and insets
- Automatic overlay group management (removes empty groups)

Border Rendering Logic:
- Composition borders and map limits are independent features
- Map limits always use `computeSceneBBox()` for full viewport coverage
- Composition borders show individual territories, map limits show entire map
- Both can be enabled simultaneously without interference
- Border filtering respects user territory selection in custom composite mode

### GraticuleService
Core graticule geometry calculation with scale-adaptive granularity.
Static methods for graticule generation:
- `generateGraticuleByLevel()` - Generate graticule for specific level
- `getGraticuleLevels()` - Get all levels based on scale

**Graticule Levels** (scale-adaptive density):
| Scale Range | Steps (degrees) | Dash Pattern |
|-------------|-----------------|--------------|
| > 1000 | [90, 30, 10] | Solid, dashed, dotted |
| 200-1000 | [60, 30, 10, 5] | Solid, dashed, dotted, fine |
| 100-200 | [45, 30, 10, 5, 2] | Solid, dashed, dotted, fine, micro |
| < 100 | [30, 10, 5, 2, 1] | Solid, dashed, dotted, fine, micro |

**Visual Hierarchy**:
- Uses dash patterns (not stroke width) to differentiate graticule levels
- Major gridlines render solid, minor gridlines render progressively dashed
- Consistent stroke width (0.75px) across all levels

### GraticuleOverlayService
SVG rendering service for graticule lines.
Static methods for overlay rendering:
- `applyGraticuleOverlay()` - Apply graticule overlay to SVG
- `appendGraticuleGroup()` - Create and append graticule SVG group

**Rendering Features**:
- Scale-adaptive graticule density based on projection scale
- Dash-pattern-based visual hierarchy
- Composite projection support with territory-specific scales
- Uses D3.geoPath with explicit projection for accurate line rendering

### CompositeSettingsBuilder
Build custom composite settings from configuration.
- `extractTerritoryCodes()` - Extract territory codes from config
- `buildTerritoryProjections()` - Build projections map
- `buildSettings()` - Build complete settings

### MapRenderCoordinator
Coordinate map rendering by building options and orchestrating services.
- `renderSimpleMap()` - Render simple territory map
- `renderCompositeMap()` - Render composite map
- `applyOverlays()` - Apply overlays to rendered map

### CartographerService
Main rendering coordinator with unified API and D3.js integration.
Instance-based service orchestrating projection, geo-data, and rendering.
Integrates with parameter provider for dynamic projection parameter updates.
Uses D3MapRenderer for pure D3 rendering with projection sharing.

**Constructor**:
- Accepts optional `ProjectionParameterProvider` parameter
- Passes provider to CompositeProjection for parameter integration

**Rendering Methods**:
- `render()` - Unified rendering API (simple/composite modes)
- `renderSimple()` - Simple projection rendering using D3MapRenderer
- `renderCustomComposite()` - Custom composite rendering using D3MapRenderer
- `renderProjectionComposite()` - Projection-based composite

**Projection Sharing**:
- `lastProjection` getter - Returns the projection used in the most recent render
- Enables overlays (graticules, borders) to use the same projection instance as map content
- Ensures visual consistency between map and overlay elements

**Parameter Update Methods**:
- `updateProjectionParams()` - Update global projection parameters
- `updateFittingMode()` - Update projection fitting mode
- `updateTerritoryParameters()` - Update territory-specific projection parameters including scale (triggers projection rebuild)
- `updateCanvasDimensions()` - Update canvas dimensions in projection service
- `updateReferenceScale()` - Update reference scale in CompositeProjection and recalculate all territory scales

**Global Parameter Management**:
Global parameters (referenceScale, canvasDimensions) are updated dynamically through dedicated methods:
- `updateCanvasDimensions()` passes dimensions to ProjectionService for coordinate calculations
- `updateReferenceScale()` triggers recalculation of all territory scales in CompositeProjection
- Both methods enable reactive updates without full reinitialization
- Called by MapRenderer watchers when projectionStore values change
  - Fallback indexing for edge cases where bound data unavailable
  - Debug logging for development troubleshooting

### CartographerFactory
Factory for creating region-specific Cartographer instances.
Static factory pattern with instance caching.
- `create()` - Create or retrieve cached Cartographer
- `getInstance()` - Get cached instance

## Export Services (src/services/export/)

### CompositeExportService
Export composite projection configurations to JSON format.
Static methods for configuration serialization:
- `exportToJSON()` - Serialize CompositeProjection to ExportedCompositeConfig
- `validateExportedConfig()` - Validate exported configuration structure
- `exportToFile()` - Create downloadable JSON file
- Applies rounding to all numeric values (6 decimal places)
- Includes metadata (atlasId, exportDate, version)
- Exports territories with projection parameters, layout, and bounds

### CompositeImportService  
Import and restore composite projection configurations from JSON.
Static methods for configuration import:
- `importFromJSON()` - Parse and validate JSON string
- `importFromFile()` - Handle File API objects
- `checkAtlasCompatibility()` - Validate atlas ID matching
- `applyToStores()` - Apply imported config to stores and CompositeProjection
- Validates required fields and data integrity
- Warns if atlas mismatch but allows import

### CodeGenerator
Generate standalone executable code from exported configurations.
Supports multiple formats and languages:
- `generate()` - Main entry point with format/language options
- `generateD3JavaScript()` - D3.js JavaScript code with registration
- `generateD3TypeScript()` - D3.js TypeScript code with type annotations
- `generatePlotCode()` - Observable Plot code with registration
- Implements D3 stream protocol with state machine for geometry routing
- Geographic bounds-based stream multiplexing
- Applies number rounding for floating-point precision (6 decimals)
- Generated code includes projection registration examples (80-92% shorter)

See docs/export.md for detailed D3 stream protocol implementation.

**Note**: Standalone projection loader implementation moved to `packages/projection-loader/`.
Code generator references the published package `@atlas-composer/projection-loader` in generated code.
See docs/export.md for loader API and architecture details.

Loading API:
- `loadCompositeProjection(config, options)` - Create projection from config
- `validateConfig(config)` - Validate configuration structure

Features:
- Uses `@atlas-composer/projection-core` for composite projection building
- Zero runtime dependencies beyond core utilities
- Plugin architecture with runtime registry
- Self-contained TypeScript types (extends projection-core types)
- D3 stream multiplexing for geometry routing (via core)
- Geographic bounds-based territory selection (via core)
- Debug mode for logging territory selection
- Supports any projection (D3, Proj4, custom)
- Tree-shakeable imports
- Bundle size: ~6KB (vs 100KB with bundled dependencies)

Optional D3 Helpers (d3-projection-helpers.ts):
- Pre-configured D3 projection factories
- Tree-shakeable individual exports
- Bulk registration helper
- Keeps D3 dependencies separate from main loader
Usage: Standalone D3 projects, Observable notebooks, Node.js rendering

## Design Patterns

### Static Methods
Export/import services use static methods for:
- Testability without Vue context
- Functional programming style
- No state management in services

### Instance-Based Services
Existing services use instance pattern for:
- Stateful operations (caching, configuration)
- Complex initialization requirements
- Legacy compatibility

### Strategy Pattern
TerritoryDataLoader uses strategies for pattern-specific loading logic.

### Coordinator Pattern
InitializationService and MapRenderCoordinator orchestrate complex multi-step operations.

### Facade Pattern
AtlasService provides simplified API hiding complexity from components.

### Factory Pattern
CartographerFactory and ProjectionFactory create configured instances.

## Usage Guidelines

1. Import services from organized subdirectories
2. Use static methods for stateless operations
3. Use instance methods for stateful operations
4. Services handle business logic, not presentation
5. Components coordinate service calls
6. Stores use services for complex operations
7. Keep services focused on single responsibility

## Benefits

- Clear separation of concerns by domain
- Testable without Vue dependencies
- Reusable across components
- Consistent patterns and conventions
- Easy to navigate and discover
- Reduced component complexity
