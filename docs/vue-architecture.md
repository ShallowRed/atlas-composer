# Vue Architecture

## Overview

Vue 3 Composition API application with TypeScript, Pinia stores, and composable-based logic extraction.

**Stack**: Vue 3, TypeScript, Pinia, Vue Router, Vue I18n, Tailwind CSS, DaisyUI
**Test Framework**: Vitest + @vue/test-utils
**Test Coverage**: 440 tests passing, 18 skipped

## Project Structure

```
src/
├── App.vue                    # Root component, layout
├── main.ts                    # App initialization
├── router/index.ts            # Route definitions
├── views/
│   ├── MapView.vue           # Main view (simplified with useViewState)
│   └── AboutView.vue         # About page
├── components/
│   ├── MapRenderer.vue       # D3 map rendering
│   ├── TerritoryControls.vue # [UNUSED] Territory controls (superseded by view-mode controls, can be deleted)
│   ├── configuration/        # View-mode-specific control components (4 components)
│   │   ├── CompositeCustomControls.vue   # Composite-custom mode controls
│   │   ├── UnifiedControls.vue           # Unified mode controls
│   │   ├── SplitControls.vue             # Split mode controls
│   │   └── BuiltInCompositeControls.vue # Composite-existing mode controls
│   └── ui/                   # 28 reusable UI components organized in subdirectories
│       ├── layout/           # Layout and page structure components
│       ├── primitives/       # Core reusable UI elements
│       ├── forms/            # Form controls and inputs
│       ├── settings/         # Settings and preferences
│       ├── projections/      # Projection-related components (3 components)
│       ├── parameters/       # Parameter control components (3 components)
│       ├── presets/          # Preset management components
│       ├── import/           # Import-related components
│       └── export/           # Export-related components
├── composables/              # 16 composition functions including useAtlasConfig, useParameterProvider, useViewState, useTerritoryCursor, useClipExtentEditor, useProjectionPanning, useMapWatchers, useTerritoryParameters
├── stores/                   # 4 Pinia stores
└── types/                    # TypeScript definitions
```

## Component Hierarchy

```
App.vue
├── AppHeader.vue (navigation, language, theme)
├── RouterView
│   └── MapView.vue (main coordinator)
│       ├── MapRenderer.vue (D3 rendering engine)
│       └── View-Mode Controls (rendered conditionally)
│           ├── CompositeCustomControls (composite-custom mode)
│           ├── UnifiedControls (unified mode)
│           ├── SplitControls (split mode)
│           └── BuiltInCompositeControls (built-in-composite mode)
└── AppFooter.vue (credits, links)
```

## Key Components

### MapView.vue
**Role**: Main coordinator component
**Responsibilities**:
- Orchestrates child components
- Manages layout and sections
- Renders view-mode-specific control components
- No business logic (delegates to composables)
- Uses: useAtlasData, useLoadingState, useViewState

### MapRenderer.vue
**Role**: D3 rendering engine with interactive features
**Responsibilities**:
- SVG canvas management
- D3 projection rendering via MapRenderCoordinator
- Territory positioning
- Interactive feature integration (panning via useProjectionPanning, dragging via useTerritoryCursor, clip extent editing via useClipExtentEditor)
- Reactive map updates via useMapWatchers
- Uses: MapRenderCoordinator, MapSizeCalculator, useProjectionPanning, useTerritoryCursor, useClipExtentEditor, useMapWatchers
**Tests**: 13 tests covering props, rendering, store integration
**Interactive Features**:
- **Projection Panning**: Via useProjectionPanning composable for azimuthal, cylindrical, and pseudocylindrical projections
- **Territory Dragging**: Via useTerritoryCursor composable for composite-custom mode
- **Clip Extent Editing**: Via useClipExtentEditor composable for corner handle editing
**Watchers**: All reactive dependencies handled by useMapWatchers composable
**Cursor Coordination**: Territory dragging > Clip extent editing > Projection panning priority

### View-Mode Render Components (src/components/views/)

View components handle visual rendering for different atlas modes.

#### SplitView.vue
**Role**: Renders territories in separate projections (split/unified modes)
**Responsibilities**:
- Pattern detection for layout (single-focus vs equal-members)
- Territory grouping via useCollectionSet composable (mutually-exclusive type)
- Filters grouping dropdown to show only mutually-exclusive collection sets
- Groups territories for visual organization without duplicate tracking (guaranteed by mutually-exclusive constraint)
- Renders mainland and overseas territories with MapRenderer
- Uses: useCollectionSet, useProjectionConfig, getAtlasSpecificConfig

### View-Mode Control Components (src/components/configuration/)

Dedicated control components for each view mode provide focused, maintainable interfaces.

#### CompositeCustomControls.vue
**Role**: Controls for composite-custom mode (full territory configuration with positioning)
**Responsibilities**:
- PresetSelector for loading saved configurations
- ImportControls for JSON import
- GlobalProjectionControls (canvas dimensions, reference scale)
- Territory accordion with per-territory controls:
  - ProjectionDropdown for projection selection (handles cartographer updates)
  - TerritoryParameterControls for parameter editing (projection-independent)
- Reset to defaults button for all territories
**Pattern**: Calls `handleProjectionChange()` to update both parameter store and cartographer
**Reactivity**: Uses `getTerritoryProjection()` helper for direct parameter store access
- Reset to defaults functionality
- Uses: useTerritoryTransforms, projectionRegistry, parameterStore

#### UnifiedControls.vue
**Role**: Controls for unified mode (single projection for entire atlas)
**Responsibilities**:
- ViewPresetSelector for preset selection
- ProjectionDropdown for global projection selection
- Projection parameter controls (rotate, center, parallels, scale)
- Fitting mode toggle (auto/manual)
- Reset functionality
**Parameter Access**:
- Reads: `parameterStore.globalEffectiveParameters` for current values
- Writes: `projectionStore.setCustomRotate()`, `setCustomCenter()`, etc.
- Parameter inheritance: Registry -> Atlas -> Global
- Uses: projectionStore, parameterStore, projectionRegistry, parameter helpers

#### SplitControls.vue
**Role**: Controls for split mode (separate projections per territory without positioning)
**Responsibilities**:
- ViewPresetSelector for preset selection
- Territory accordion with per-territory controls:
  - ProjectionDropdown for projection selection
  - TerritoryParameterControls for parameter editing (no transform controls)
- No global positioning or reference scale
**Pattern**: Each territory has independent projection selection with parameter editing
**Reactivity**: Uses `getTerritoryProjection()` helper for direct parameter store access
- Uses: useTerritoryTransforms, projectionRegistry, parameterStore

#### BuiltInCompositeControls.vue
**Role**: Controls for built-in-composite mode (d3-composite-projections)
**Responsibilities**:
- ViewPresetSelector for preset selection
- ProjectionDropdown for selecting pre-built composite projections
- Limited projection parameter controls (rotate, scale if applicable)
- Fitting mode toggle (auto/manual)
- Reset functionality
- Uses: projectionStore, viewStore, projectionRegistry, parameter helpers

### TerritoryControls.vue [UNUSED - Can be deleted]
**Role**: Original territory transform and parameter controls (pre-refactoring)
**Status**: Superseded by view-mode-specific control components
**Note**: This file is not imported anywhere and can be safely deleted.

### ProjectionSelector.vue
**Role**: Projection selection interface
**Responsibilities**:
- Projection search/filter
- Projection dropdown
- Recommendation badges
- Uses: useProjectionFiltering, useProjectionRecommendations

### UI Components (30 components organized in 8 subdirectories)

**Layout Components** (src/components/ui/layout/):
- **AppHeader**: Application header with navigation, language selector, and theme selector
- **AppFooter**: Application footer with credits and links
- **MainLayout**: Main application layout structure
- **ScrollableContent**: Scrollable content wrapper

**Primitive Components** (src/components/ui/primitives/):
- **AccordionItem**: Collapsible content item with title/subtitle
- **Alert**: Status/notification messages with type variants (info, success, warning, error)
- **ButtonGroup**: Toggle button group for exclusive selection with full-width layout
- **CardContainer**: Card wrapper with title, icon, and scrollable content. Supports optional actions slot for buttons in header (e.g., ShareButton in MapView main card)
- **LabelWithIcon**: Label wrapper with optional icon
- **Modal**: Standardized dialog wrapper with slots for title, content, and actions

**Form Controls** (src/components/ui/forms/):
- **CheckboxControl**: Checkboxes for boolean settings
- **RangeSlider**: Range input with label, icon, value display, and customizable styling
- **DropdownControl**: Accessible DaisyUI dropdown selections with icon/badge support (590 lines, 42 tests)
  - Two modes: standard (fieldset wrapper) and inline (for navbar use)
  - Manual JS-controlled dropdown (overrides DaisyUI CSS focus behavior)
  - Supports emoji/text icons and icon classes (detects 'ri-' prefix)
  - Supports badges for visual indicators (e.g., projection recommendations)
  - Supports option groups with category labels
  - Full keyboard navigation:
    - Up/Down arrows: when open only, immediately select previous/next option and stay open
    - Left/Right arrows: when closed only, cycle through options with looping (first↔last)
    - Enter/Space: select focused option and close dropdown (or open if closed)
    - Escape: close dropdown
    - Home/End: jump to first/last option (when open)
    - Tab: close dropdown and move focus
    - Click: select option and close dropdown
  - Automatic scroll behavior: focused option scrolls into view during keyboard navigation
  - ARIA attributes for screen readers (role, aria-expanded, aria-selected, aria-activedescendant)
  - Focus management with CSS highlighting (no DOM focus to avoid blur conflicts)
  - Thick visible focus state (2px outline + background color) for accessibility
  - Selected option highlighted with primary color when dropdown open
  - Translation support with Vue I18n ($t() integration)
  - isNavigating flag prevents blur events during arrow navigation
  - Exports DropdownOption and DropdownOptionGroup interfaces
  - Comprehensive test suite covers rendering, state management, selection, keyboard navigation, accessibility, and edge cases
- **ToggleControl**: Toggle switches for boolean settings

**Settings Components** (src/components/ui/settings/):
- **LanguageSelector**: Language selection dropdown using DropdownControl in inline mode
  - Uses inline prop for navbar integration (no fieldset wrapper)
  - Converts SUPPORTED_LOCALES to DropdownOption format
  - Uses setLocale() for language switching
  - Ghost button style with translate icon
- **ThemeSelector**: Theme selection interface using DropdownControl with option groups
  - Groups themes into light and dark categories
  - 35 theme options across 2 groups
- **ShareButton**: Shareable URL generator with clipboard copy functionality
  - Uses useUrlState composable to generate shareable URLs
  - One-click copy to clipboard with visual feedback
  - Three states: default (Share), success (Copied!), error (Failed to copy)
  - Auto-resets after 2 seconds (success) or 3 seconds (error)
  - Displays full URL in tooltip on hover
  - Ghost button style with share/check/error icons (Remix icons)
  - Positioned in MapView main content card header (top right corner)
  - Fully tested (9 tests covering rendering, copy, state transitions, timeout handling)

**Projection Components** (src/components/ui/projections/):
- **ProjectionDropdown**: Projection selection component with info modal
  - Uses DropdownControl with recommendation badges (Remix icons)
  - Displays badge icons to left of projection names
  - Badge system: ri-star-fill (excellent), ri-star-line (good), ri-star-half-line (usable)
  - Includes info button that opens ProjectionInfo modal
  - Supports loading skeleton state
  - Automatically transforms recommendation badges with CSS classes (text-success, text-info, text-base-content)
- **ProjectionInfo**: Projection information display
- **ProjectionParamsControls**: Projection parameter adjustment controls with latitude lock toggle

**Parameter Components** (src/components/ui/parameters/):
- **GlobalProjectionControls**: Global projection parameter controls for composite projections
  - Provides UI controls for canvas dimensions (width/height) with aspect ratio lock
  - Provides reference scale slider for adjusting base scale across all territories
  - Canvas dimensions control actual SVG display size via MapSizeCalculator
  - Reference scale serves as base multiplier for all territory scale calculations
  - Updates projectionStore.canvasDimensions and projectionStore.referenceScale reactively
  - Watchers in MapRenderer trigger automatic re-rendering on parameter changes
  - Used in TerritoryControls component for composite-custom mode
- **TerritoryParameterControls**: Territory-specific parameter editing interface (projection-independent)
  - Uses unified `ProjectionParameters` interface across all parameter operations
  - Integrates with `parameterStore` for reactive parameter management
  - Template conditions use computed properties for parameter group visibility
  - Provides parameter controls for individual territories (no projection selection)
  - Uses dynamic projection family detection via projectionRegistry
  - Supports all projection families (CONIC, AZIMUTHAL, CYLINDRICAL, etc.)
  - Parameter groups: Position (center/rotate), Projection-specific (parallels), View & Scale (projection scale/clipAngle), Advanced (precision/translate)
  - Validation feedback with real-time error/warning display via `ParameterRegistry`
  - Parameter inheritance indicators and override functionality
  - Reset controls for clearing territory-specific overrides
  - **View-mode awareness**: Uses `isCompositeMode` computed to filter composite-specific parameters (translateOffset, pixelClipExtent) in split mode
  - **Single responsibility**: Focuses solely on parameter editing; projection selection handled by parent components
- **TerritorySetManager**: Territory customization UI for composite-custom mode
  - Manages which territories are included in custom composite projection
  - Uses useCollectionSet composable to get validated collection set key (mutually-exclusive type)
  - Filters dropdown options to only show mutually-exclusive collection sets
  - Reads territoryCollections from atlas config via atlasSpecificConfig.territoryCollections
  - Displays territories grouped by collections (e.g., "Mainland only", "Mainland + DROM", "All territories")
  - Displays active territories with remove buttons (btn-soft style with close icon)
  - Displays available territories with add buttons (btn-ghost style with add icon)
  - Filters out mainland from available territories (mainland always visible)
  - Limits available territories to those loaded from preset (territories with data)
  - Calls viewStore.addTerritoryToComposite() and removeTerritoryFromComposite()
  - Triggers re-render via geoDataStore.triggerRender() after add/remove operations
  - Used in CompositeCustomControls and TerritoriesControl components
- **ParameterControlGroup**: Reusable parameter control group wrapper
  - Provides consistent styling and layout for parameter sections
  - Supports title, description, and collapsible content areas
- **ParameterValidationFeedback**: Parameter validation feedback display
  - Shows validation errors and warnings with contextual messaging
  - Integrates with parameter validation system for real-time feedback

**Import Components** (src/components/ui/import/):
- **ImportControls**: Import and export control buttons
- **ImportModal**: Modal for importing configurations

**Export Components** (src/components/ui/export/):
- **CompositeExportDialog**: Dialog for exporting composite configurations
- **ToastNotification**: Toast notification display

**Preset Components** (src/components/ui/presets/):
- **PresetSelector**: Dropdown for manual preset selection and loading
  - Gets available presets from registry behavior via getAtlasBehavior()
  - Displays available presets for current atlas with metadata-based labels
  - Handles async preset loading, validation, and application to stores
  - Integrates with parameter store and CompositeProjection for complete preset application
  - Manages loading states and error display
  - Critical feature: Updates CompositeProjection via `updateTerritoryParameters()` after parameter store changes

**Composition Patterns**:
- RangeSlider used in ProjectionParamsControls (6 instances) and TerritoryControls (3 instances)
- ButtonGroup used in CompositeExportDialog (3 instances)
- Modal used in CompositeExportDialog for standardized dialogs
- Alert used in ProjectionParamsControls and TerritoryControls for status messages
- DropdownControl used in AtlasConfigSection (5 instances), ThemeSelector (1 instance), LanguageSelector (1 instance), ProjectionDropdown (1 instance)
  - Supports emoji/text icons (flag emojis: 🇫🇷, 🇵🇹, 🇪🇸, 🇪🇺, 🇺🇸, 🌍)
  - Supports icon classes (remix icons: ri-layout-grid-line, etc.)
  - Supports icon badges (projection recommendations: ri-star-fill, ri-star-line, ri-star-half-line)
  - Icon badges positioned to left of option label
  - Badge CSS classes automatically applied (text-success, text-info, text-base-content)
  - Group titles display category icons (via PROJECTION_CATEGORY_ICONS from projection-icons.ts)
  - Full a11y: ARIA attributes, keyboard navigation (Arrow keys, Enter, Space, Escape, Home, End, Tab)
  - Focus management with visible focus states (WCAG AA compliant)
  - Translation support with Vue I18n integration
- ToggleControl used in DisplayOptionsSection (4 instances) and TerritoryControls (1 instance)

## Composables (16 functions)

### Data Loading
**useAtlasLoader**
- Reactive async atlas configuration loading
- Uses VueUse's useAsyncState for loading state management
- Loads atlas config on-demand via registry.loadAtlasAsync()
- Returns: { atlasConfig (Ref<LoadedAtlasConfig | null>), isLoading, error }
- Used by: atlasStore for lazy atlas loading

**useAtlasData**
- Orchestrates atlas initialization and data reloading
- initialize(): Delegates to InitializationService for preset loading and data preloading
- reinitialize(): Handles atlas switching via geoDataStore.reinitialize()
- reloadUnifiedData(): Reloads unified data when territory mode changes in unified view
- Returns: { currentAtlasConfig, atlasService, isAtlasLoaded, atlasId, initialize, reinitialize, reloadUnifiedData }
- State management delegated to appStore (called from InitializationService)
- Tests: 13 tests

**useLoadingState**
- Legacy loading state management (kept for compatibility)
- withMinLoadingTime() - Ensures minimum loading duration
- Returns: { showSkeleton, withMinLoadingTime }
- Note: Largely superseded by appStore for main app flow

### Store Abstraction
**useAtlasConfig**
- Centralized atlas configuration access
- Provides: currentAtlasConfig, atlasService, isAtlasLoaded, atlasId
- Eliminates repeated atlasStore.currentAtlasConfig patterns
- Returns computed refs for reactive atlas state
- Used by: useTerritoryTransforms.ts, and other composables needing atlas config
- Tests: 6 tests covering basic functionality and reactivity
- Pattern: Single source of truth for atlas configuration access

**useParameterProvider**
- Standardized parameter provider adapter
- Provides: parameterProvider object with getEffectiveParameters() and getExportableParameters()
- Connects parameter store to services (Cartographer, export services)
- Single implementation eliminating duplicate adapter code
- Used by: CompositeExportDialog.vue, and services needing projection parameters
- Tests: 5 tests covering delegation and consistency
- Pattern: Adapter pattern for parameter store integration

**useCollectionSet**
- Territory collection set validation and retrieval
- Validates collection sets against selection type requirements (incremental vs mutually-exclusive)
- Returns validated collection set key from registry behavior
- Helper functions:
  - useCollectionSet(uiLocation, requiredSelectionType): Returns reactive collection set key
  - getValidatedCollectionSetKey(): Validates and retrieves collection set key
  - filterCollectionSetsByType(): Filters collection sets by selection type for UI dropdowns
- Selection type enforcement:
  - `incremental`: Progressive territory additions (territoryScope)
  - `mutually-exclusive`: Single collection selection (territoryManager, territoryGroups)
- Used by: TerritorySetManager.vue, SplitView.vue, loader.ts
- Ensures UI components only show appropriate collection sets based on usage context

**useProjectionConfig**
- Projection configuration helpers
- compositeProjectionOptions, getProjectionForTerritory()
- Returns: { compositeProjectionOptions, getProjectionForTerritory }
- Tests: 8 tests

**useViewMode**
- View mode options
- Returns: { viewModeOptions }

**useTerritoryConfig**
- Territory configuration state
- Returns: { hasTerritoriesForProjectionConfig }

### Component Logic
**useTerritoryTransforms** (Facade)
- Aggregate composable combining focused sub-composables for territory management
- Maintains backward compatibility while delegating to smaller, testable pieces
- Composed from:
  - useTerritoryData: Territory data access (territories, translations, scales, projections)
  - useTerritoryCommands: Territory mutations (setters)
  - useTerritoryReset: Reset operations (complex orchestration)
  - useTerritoryVisibility: Visibility business rules
- Architecture benefits:
  - Each sub-composable has single responsibility
  - Business logic in testable services (TerritoryVisibilityService, TerritoryResetService, TerritoryDataService)
  - Easy to import only what you need
  - Clear separation of concerns
- Used by: TerritoryControls.vue, CompositeCustomControls.vue, SplitControls.vue

**useTerritoryData**
- Single responsibility: Read-only territory data access
- Delegates to TerritoryDataService for data aggregation
- Returns computed refs: territories, translations, scales, projections
- Pattern: Service handles business logic, composable handles Vue reactivity
- Tests: Via TerritoryDataService (5 unit tests)

**useTerritoryCommands**
- Single responsibility: Write operations for territory parameters
- Thin wrapper around parameterStore setters
- Methods: setTerritoryTranslation(), setTerritoryScale(), setTerritoryProjection()
- Pattern: Encapsulates parameter store mutations

**useTerritoryReset**
- Single responsibility: Orchestrate territory reset operations
- Uses TerritoryResetService for calculation logic
- Executes reset operations via parameter store
- Methods: resetTransforms(), resetTerritoryToDefaults()
- Pattern: Service calculates WHAT to reset (pure), composable executes HOW (orchestration)
- Tests: Via TerritoryResetService (13 unit tests)

**useTerritoryVisibility**
- Single responsibility: Territory visibility business rules
- Delegates to TerritoryVisibilityService for logic
- Returns computed refs for territory visibility state
- Pattern: Service handles business rules (pure), composable handles Vue reactivity
- Tests: Via TerritoryVisibilityService (13 unit tests)

**useTerritoryParameters**
- Territory-specific parameter management for custom composite mode
- Encapsulates parameter state, validation, and inheritance logic
- Integrates with parameter store for reactive parameter updates
- Provides parameter constraints and validation results by projection family
- Used by: TerritoryParameterControls.vue

**useViewState**
- View mode boolean flags for template readability
- Card UI helpers (title, icon)
- Compound visibility conditions
- Exports: isCompositeMode, isCompositeCustomMode, isCompositeExistingMode, isSplitMode, isUnifiedMode
- Exports: cardTitle, cardIcon, shouldShowRightSidebar, shouldShowProjectionParams, shouldShowTerritoryControls
- Tests: 13 tests (100% passing)
- Used by: MapView.vue, DisplayOptionsSection.vue
- Pattern: Wraps viewStore.viewMode checks with semantic computed properties

**useProjectionRecommendations**
- Projection recommendation badge system
- getBadge(): Returns Remix icon class (ri-star-fill, ri-star-line, ri-star-half-line)
- getCssClass(): Returns color class (text-success, text-info, text-base-content)
- getTooltip(): Returns localized recommendation reason
- getRecommendation(): Returns full recommendation object
- Used by: ProjectionDropdown.vue

**useTerritoryCursor**
- Territory drag-to-move functionality for composite-custom mode with D3.js integration
- SVG coordinate mapping: getSVGScale() calculates screen-to-canvas pixel ratio from CTM (Current Transformation Matrix)
- Accurate drag movement: Converts screen pixel deltas to SVG canvas pixels by dividing by scale factor
- D3 DOM manipulation: Uses D3 selections for all SVG element interaction and styling
- Visual feedback system: updateTerritoryVisualFeedback() with hover/drag states using D3 styling
- Temporary border creation: createTemporaryBorder() generates borders when composition borders disabled
- Smart border detection: Detects existing borders vs. creating temporary ones for consistent UX
- D3-based overlay system: createBorderZoneOverlays() uses D3 data binding for interactive zones
  - Accepts optional onTerritoryClick callback for territory selection coordination
  - Click events fire callback with territoryCode before mousedown (enables selection workflow)
- Mouse event handling: startDrag(), handleMouseMove(), stopDrag() with scale-adjusted coordinate application
- Territory validation: isTerritoryDraggable() prevents mainland territory dragging
- Cursor management: getCursorStyle() provides grab/grabbing feedback
- Tooltip interference prevention: disableTooltipPointerEvents() using D3 selections and MutationObserver
- Clean resource management: Automatic cleanup of temporary borders and observers
- Used by: MapRenderer.vue for territory dragging interaction and clip extent editor integration

**useClipExtentEditor**
- Interactive clip extent corner editing for composite-custom mode with D3.js integration
- Territory selection system: selectedTerritoryCode tracks which territory shows corner handles
- Selection methods: selectTerritory(), deselectTerritory(), toggleTerritorySelection()
- Prevents visual clutter: Only selected territory displays corner handles (4 corners per territory)
- SVG coordinate mapping: getSVGScale() for accurate screen-to-canvas pixel conversion (same as useTerritoryCursor)
- Corner handle rendering: renderClipExtentHandles() creates draggable circular handles using D3 data binding
  - Filters geoDataStore.filteredTerritories to only selected territory
  - Calculates corner positions from pixelClipExtent `[x1, y1, x2, y2]` relative to territory center
  - Creates 4 handles: top-left (0), top-right (1), bottom-right (2), bottom-left (3)
  - Blue circular handles with hover effects (r=6→8, opacity=0.7→1.0)
  - Handles positioned at absolute canvas coordinates: `territoryCenter + translateOffset + clipExtentCorner`
- Corner drag interaction: startCornerDrag(), handleCornerMouseMove(), stopCornerDrag()
  - Tracks dragCornerIndex to determine which two values update (x1/x2 and y1/y2)
  - Converts screen pixel deltas to canvas pixels using scale factor
  - Updates pixelClipExtent parameter via parameterStore.setTerritoryParameter()
  - Re-renders handles during drag for real-time visual feedback
  - Rounds values to integers for clean parameter values
- Coordinate system: Works in canvas pixel space matching translateOffset coordinate system
- Integration with useTerritoryCursor: MapRenderer passes toggleTerritorySelection as onTerritoryClick callback
- Click workflow: User clicks territory border zone → toggles selection → handles appear/disappear for that territory
- Used by: MapRenderer.vue for interactive clip extent editing

**useProjectionPanning**
- Interactive projection panning for azimuthal, cylindrical, and pseudocylindrical projections
- Pan state management: isPanning, drag coordinates, rotation start values
- Projection capability detection: supportsPanning, supportsLatitudePanning
- Mouse event handlers: handleMouseDown(), handleMouseMove(), handleMouseUp()
- Rotation calculations: Converts pixel deltas to degrees (~0.5° per pixel)
  - Longitude wrapping: -180° to 180° range
  - Latitude clamping: -90° to 90° range (prevents pole flipping)
  - Natural drag direction: drag right moves map right (positive dx increases longitude)
- Integration with projectionStore.setCustomRotate() for rotation updates
- Respects projectionStore.rotateLatitudeLocked for latitude lock behavior
- Cursor feedback: 'grab' when available, 'grabbing' while panning, 'default' when disabled
- Global event listener management with cleanup
- Uses getRelevantParameters() to determine projection family support
- Works with projectionRegistry for projection metadata
- Tests: 19 tests covering capability detection, cursor styles, drag behavior, rotation calculations
- Used by: MapRenderer.vue for interactive map rotation

**useMapWatchers**
- Consolidates all MapRenderer watch statements into single composable
- Watches globalEffectiveParameters: Updates cartographer.updateProjectionParams() and triggers re-render
- Watches projectionFittingMode: Updates cartographer.updateFittingMode() and triggers re-render
- Watches canvasDimensions: Updates cartographer.updateCanvasDimensions() and triggers re-render
- Watches referenceScale: Updates cartographer.updateReferenceScale() and triggers re-render
- **Simple mode watcher**: Tracks configuration dependencies and `parameterStore.territoryParametersVersion` for territory projection/parameter changes
- **Composite mode watcher**: Tracks composite-specific dependencies without deprecated properties
- Deep watching with 'post' flush for optimal reactivity
- Accepts props object (mode, geoData, projection, preserveScale) and callbacks object
- Centralizes watcher lifecycle management with cleanup function
- Used by: MapRenderer.vue for reactive map updates

**useUrlState**
- URL state serialization/deserialization for shareable links
- serializeState(): Encodes current configuration to URL query parameters
- deserializeState(): Restores configuration from URL parameters
- updateUrl(): Updates browser URL with current state
- restoreFromUrl(): Restores state from URL on page load
- shareableUrl: Computed property with full shareable URL
- copyShareableUrl(): Copies URL to clipboard
- enableAutoSync(): Optional automatic URL syncing on state changes
- Territory settings optimization: Only includes values different from atlas-specific defaults
- Comprehensive test suite: 11 tests covering serialization round-trips, edge cases, malformed input
- Used by: MapView.vue (restoration), ShareButton.vue (URL generation)

### Validation
**useProjectionValidation**
- Projection selection validation
- Warning generation
- Validation state management

## View Orchestration

### ViewOrchestrationService
**Location**: `src/services/view/view-orchestration-service.ts`

**Purpose**: Centralized component visibility logic for all view states. Determines what UI elements should be visible or enabled based on current application state.

**Architecture**:
- Pure static service (no instance state)
- Takes `ViewState` snapshot as input
- Returns boolean visibility/enabled flags
- All methods are deterministic and testable

**ViewState Interface**:
```typescript
interface ViewState {
  viewMode: ViewMode                          // composite-custom, built-in-composite, split, unified
  atlasConfig: AtlasConfig                    // Current atlas configuration
  hasPresets: boolean                         // Presets available for current atlas
  hasOverseasTerritories: boolean             // Filtered territories exist
  isPresetLoading: boolean                    // Preset data loading state
  showProjectionSelector: boolean             // From ProjectionUIService
  showIndividualProjectionSelectors: boolean  // From ProjectionUIService
  isMainlandInTerritories: boolean            // Mainland in filtered list
  showMainland: boolean                       // Atlas has mainland config
}
```

**Visibility Methods** (20+ methods):

**Main Layout**:
- `shouldShowRightSidebar()` - Show sidebar in non-unified modes
- `shouldShowBottomBar()` - Always visible (display options)

**Sidebar Content**:
- `shouldShowProjectionParams()` - Show in unified, built-in-composite modes
- `shouldShowTerritoryControls()` - Show in split, composite-custom modes

**Territory Controls Sub-components**:
- `shouldShowPresetSelector()` - Show in composite-custom when registry behavior has available presets
- `shouldShowImportControls()` - Show in composite-custom or split modes
- `shouldShowGlobalProjectionControls()` - Show in composite-custom mode
- `shouldShowTerritoryParameterControls()` - Show in composite-custom mode
- `shouldShowMainlandAccordion()` - Show when mainland available (showMainland or isMainlandInTerritories)
- `shouldShowProjectionDropdown()` - Show in non-composite-custom modes

**Empty States**:
- `shouldShowEmptyState()` - No territories and no mainland available
- `getEmptyStateMessage()` - Returns appropriate i18n key for empty state

**Control States**:
- `shouldShowTerritorySelector()` - Show if atlas has territory selector and not in composite modes
- `isViewModeDisabled()` - Disable if only one supported view mode

**Layout Variants**:
- `shouldShowCompositeRenderer()` - Show for both composite modes
- `shouldShowSplitView()` - Show in split mode
- `shouldShowUnifiedView()` - Show in unified mode

**Display Options**:
- `shouldShowCompositionBordersToggle()` - Show in composite modes
- `shouldShowScalePreservationToggle()` - Show in split mode

**Integration Pattern**:
The service is used via `useViewState` composable, which:
1. Aggregates state from stores into `ViewState` object
2. Wraps all service methods in computed refs for reactivity
3. Exposes `viewOrchestration` object to components

**Example Usage** (in components):
```vue
<script setup>
const { viewOrchestration } = useViewState()
</script>

<template>
  <CardContainer v-show="viewOrchestration.shouldShowRightSidebar.value">
    <ProjectionParamsControls v-if="viewOrchestration.shouldShowProjectionParams.value" />
    <TerritoryControls v-else-if="viewOrchestration.shouldShowTerritoryControls.value" />
  </CardContainer>
</template>
```

**Benefits**:
1. Single source of truth for all visibility logic
2. Pure functions enable comprehensive unit testing (61 tests)
3. Type-safe visibility decisions with explicit ViewState interface
4. Eliminates scattered conditional logic across components
5. Easier to reason about view state transitions
6. Consistent behavior across all UI elements

**Test Coverage**: 61 unit tests covering all visibility methods and state combinations

**Used by**: MapView.vue, TerritoryControls.vue, AtlasConfigSection.vue, DisplayOptionsSection.vue (via useViewState composable)

## State Management

### Store Architecture (DDD Bounded Contexts)

The application uses 7 Pinia stores, each representing a distinct bounded context:

| Store | Lines | Domain |
|-------|-------|--------|
| app.ts | 220 | Application lifecycle and transitions |
| atlas.ts | 257 | Atlas selection and configuration |
| projection.ts | 310 | Projection settings, rotation, scale |
| view.ts | 388 | View mode, territory selection, UI visibility |
| parameters.ts | 446 | Territory-level parameters |
| geoData.ts | 394 | Geographic data and rendering |
| ui.ts | 113 | UI preferences (theme, display toggles) |

### appStore
**Domain**: Application lifecycle state machine
**State**:
- `state`: AppState ('idle' | 'loading-atlas' | 'loading-geodata' | 'loading-preset' | 'ready' | 'switching-view' | 'transitioning' | 'error')
- `error`: Error message when in error state
- `isFirstLoad`: Whether this is the first initialization
- `isTransitioningWithSplit`: Whether current transition involves split mode (no skeleton)
- `loadingStartTime`: Timestamp for minimum skeleton display enforcement
**Computed**:
- `isLoading`: True during any loading state
- `isReady`: True when app is ready for interaction
- `isTransitioning`: True during brief UI transitions
- `showContent`: True when content should be visible
- `showSkeleton`: True when loading placeholder should be visible (initial load, atlas switch)
- `showSkeletonForViewSwitch`: True when skeleton should show during view mode switch (excludes split mode)
**Actions**:
- `startLoadingAtlas()`: Begin atlas loading, records timestamp
- `startLoadingGeoData()`: Begin geodata loading
- `startLoadingPreset()`: Begin preset loading
- `setReady()`: Mark app as ready, enforces minimum skeleton display time
- `startSwitchingView(involvesSplitMode)`: Begin view mode transition with skeleton (unless split mode)
- `startTransitioning()`: Begin brief UI transition (auto-returns to ready)
- `setError()`: Set error state with message
**Used by**: InitializationService, viewStore, MapView.vue

### atlasStore
**Domain**: Atlas selection and configuration
**Responsibilities**:
- Atlas selection (selectedAtlasId, atlasService)
- Lazy atlas loading via useAtlasLoader composable
- Current atlas config reactively updated when atlas finishes loading
- Territory metadata access
**Used by**: Atlas selection components, initialization service

### projectionStore
**Domain**: Projection configuration and parameters
**Responsibilities**:
- Projection selection (selectedProjection, compositeProjection)
- Rotation parameters (customRotateLongitude, customRotateLatitude, rotateLatitudeLocked)
- Center parameters (customCenterLongitude, customCenterLatitude)
- Parallels configuration (customParallel1, customParallel2)
- Scale and canvas (referenceScale, canvasDimensions, projectionFittingMode)
- Preset defaults management
**Used by**: Projection controls, MapRenderer, export services

### viewStore
**Domain**: View mode and territory selection
**Responsibilities**:
- View mode (viewMode: composite-custom, built-in-composite, split, unified)
- Territory mode (territoryMode, activeTerritoryCodes)
- View preset management (currentViewPreset, availableViewPresets)
- UI visibility logic (showProjectionSelector, showTerritoryControls, etc.)
- Territory set management (addTerritoryToComposite, removeTerritoryFromComposite)
**Used by**: View mode controls, TerritorySetManager, MapView

### parameterStore
**Domain**: Unified parameter registry integration
**Responsibilities**:
- Parameter registry integration with ProjectionParameterManager
- Global parameter state management with registry validation
- Territory-specific parameter overrides with registry constraints
- Territory projections via projectionId parameter
- Territory positions via translateOffset parameter tuple [x, y]
- Territory scales via scaleMultiplier parameter
- Territory clip extents via pixelClipExtent parameter
- Parameter inheritance: territory > global > atlas > registry defaults
- Registry-based parameter validation with family-specific constraint checking
- Reactive version tracking via territoryParametersVersion for UI updates
- Helper methods: getTerritoryProjection(), setTerritoryProjection(), getTerritoryTranslation(), setTerritoryTranslation()
**Used by**: All territory controls, MapRenderer, export/import services

## Data Flow

```
User Action (Template)
    ↓
v-model / Event Handler
    ↓
Composable Logic (if needed)
    ↓
Store Action/Mutation
    ↓
Store State Change
    ↓
Watcher in Composable (useAtlasData)
    ↓
Service Call
    ↓
Store Update → Component Re-render
```

**Key Pattern**: Centralized data loading in useAtlasData composable with setupWatchers()

## Parameter Registry Integration Architecture

### Registry-Based Parameter Flow

```
Parameter Edit (TerritoryParameterControls)
    • Uses registry constraints for min/max/step values
    • Registry-based validation in real-time
    ↓
parameterStore.setTerritoryParameter()
    • Registry validation before storing
    • Parameter registry default fallbacks
    • Increments territoryParametersVersion
    • Emits @parameter-changed event
    ↓                                    ↓
Event Handler                      MapRenderer Watch
(handleParameterChange)            (territoryParametersVersion)
    ↓                                    ↓
cartographer.updateTerritoryParameters() triggers renderMap()
    ↓
CompositeProjection.updateTerritoryParameters()
    • Calls parameterProvider.getEffectiveParameters()
    • Registry-based parameter resolution with inheritance
    • Applies parameters to D3 projection using registry metadata
    • Sets compositeProjection = null (forces rebuild)
    ↓
renderMap() with registry-validated parameters
```

### Enhanced Parameter Provider Pattern

**Purpose**: Registry-integrated parameter resolution for rendering

**Implementation**:
- `ProjectionParameterProvider` interface with `getEffectiveParameters()` and `getExportableParameters()` methods
- geoDataStore creates adapter connecting parameterStore to Cartographer
- Adapter uses registry-based parameter resolution for complete coverage
- Cartographer passes provider to CompositeProjection for rendering and export

**Registry Benefits**:
- Parameter inheritance with registry defaults as final fallback
- Type-safe parameter operations with registry constraint validation
- Complete parameter coverage for export (registry defines all exportable parameters)
- UI constraint resolution (min/max/step) directly from registry metadata

**Benefits**:
- No circular dependencies
- Clean separation of concerns
- Testable via dependency injection
- Parameter inheritance handled by parameter store

## Type Safety

### vue-props.ts
Centralized prop type definitions:
- MapRendererProps
- ViewComponentProps
- TerritoryControlsProps
- ProjectionSelectorProps
- DisplayOptionsSectionProps
- All props include default values exported as constants

### composables.ts
Composable return type interfaces:
- LoadingState
- ProjectionConfig
- TerritoryConfig
- ViewModeConfig
- TerritoryTransforms
- AtlasData
- ProjectionFiltering

### Central Export
All types exported from `src/types/index.ts` for consistent imports.

## Testing

**Framework**: Vitest + @vue/test-utils
**Coverage**: 440 tests passing, 18 skipped

### Test Organization
Tests are organized by domain:
- **Territory Services**: 31 tests covering TerritoryVisibilityService, TerritoryResetService, TerritoryDataService
- **Export Services**: 9 tests for composite export functionality
- **Projection Services**: 19 tests for projection logic
- **View Orchestration**: 61 tests for UI visibility logic
- **UI Components**: 42 tests for DropdownControl component
- **Share Functionality**: 9 tests for ShareButton

### Skipped Tests
Some tests are skipped due to complex atlas registry initialization dependencies. These tests require HTTP requests to load atlas configurations and need refactoring to use dependency injection or proper test doubles:
- Component tests requiring full atlas loading
- Composable tests accessing atlas store configuration
- Service tests requiring CompositeProjection initialization

### Test Infrastructure
- i18n mocking with createI18n
- Store mocking with createPinia/setActivePinia
- withSetup() helper for composable testing with Vue context
- Promise rejection handling with .catch(() => {})
- Test utilities in `src/__tests__/test-utils.ts`

## Patterns

### Composable Composition Pattern

**Pattern**: Build complex composables from focused, single-responsibility sub-composables.

**Benefits**:
- Each composable has single responsibility
- Business logic in testable services (pure functions)
- Easy to import only what you need
- Clear separation of concerns
- Facade maintains backward compatibility

**Example**: useTerritoryTransforms (Facade Composable)

**Before** (monolithic):
```typescript
export function useTerritoryTransforms() {
  // 326 lines of mixed concerns
  // Data access + mutations + reset + visibility all in one
  // Untestable without full store setup
  // 5+ store dependencies
}
```

**After** (composed):
```typescript
export function useTerritoryTransforms() {
  // Delegate to focused composables
  const territoryData = useTerritoryData()           // Read-only data
  const territoryCommands = useTerritoryCommands()   // Write operations
  const territoryReset = useTerritoryReset()         // Reset orchestration
  const territoryVisibility = useTerritoryVisibility() // Visibility rules

  // Aggregate all functionality (84 lines total)
  return {
    // Data
    territories: territoryData.territories,
    translations: territoryData.translations,
    // Commands
    setTerritoryTranslation: territoryCommands.setTerritoryTranslation,
    // Reset
    resetTransforms: territoryReset.resetTransforms,
    // Visibility
    shouldShowEmptyState: territoryVisibility.shouldShowEmptyState,
  }
}
```

**Service Layer Integration**:
```typescript
// Composable: Handles Vue reactivity and orchestration
export function useTerritoryVisibility() {
  const viewStore = useViewStore()
  const atlasStore = useAtlasStore()

  // Delegate business logic to service
  const shouldShowEmptyState = computed(() =>
    TerritoryVisibilityService.shouldShowEmptyState({
      territoryCount: viewStore.activeTerritoryCount,
      atlasPattern: atlasStore.currentAtlasConfig?.pattern,
      hasMainlandInActiveTerritories: /* ... */
    })
  )

  return { shouldShowEmptyState }
}

// Service: Pure business logic (fully testable)
export class TerritoryVisibilityService {
  static shouldShowEmptyState(params: {
    territoryCount: number
    atlasPattern: AtlasPattern
    hasMainlandInActiveTerritories: boolean
  }): boolean {
    if (params.territoryCount > 0) return false
    const showsMainland = this.shouldShowMainland(params.atlasPattern)
    return !showsMainland && !params.hasMainlandInActiveTerritories
  }
}
```

**Metrics** (useTerritoryTransforms refactoring):
- Lines of code: 326 → 84 (74% reduction in facade)
- Test coverage: 0 → 31 unit tests (via services)
- Store dependencies: 5 → distributed across focused composables
- Responsibilities: 5 → 1 per composable

**When to Use**:
- Composable exceeds 150 lines
- Multiple distinct responsibilities
- Business logic hard to unit test
- 3+ store dependencies

**When NOT to Use**:
- Simple composables (<100 lines)
- Single clear responsibility
- Already testable without mocking

### Composition API
- All components use `<script setup lang="ts">`
- Logic extracted to composables
- Props defined with defineProps<Type>()
- Events defined with defineEmits<Type>()

### State Management
- Global state: Pinia stores
- Local state: component refs
- Derived state: computed properties
- Store abstraction: composables wrap store access

### Component Design
- Single Responsibility Principle
- Props down, events up
- Composition over inheritance
- Templates under 100 lines

### Code Organization
- Feature-based grouping (composables/, stores/, components/ui/)
- Co-located tests (__tests__ folders)
- Centralized types (src/types/)
- Average component size: 70 lines

## Performance

### Current Optimizations
- Watchers centralized in useAtlasData.setupWatchers()
- Loading state with withMinLoadingTime()
- Shallow component hierarchy
- Composables enable code splitting

### Future Opportunities
- Virtual scrolling for large territory lists
- v-memo for static map content
- Lazy loading for ProjectionSelector
- shallowRef for large GeoJSON objects
- Computed property memoization

## Integration Points

### Services
Components never call services directly. Flow:
1. Component action
2. Store mutation
3. Watcher in useAtlasData
4. Service call
5. Store update
6. Component re-render

### D3/Observable Plot
- MapRenderer.vue owns D3 integration
- CartographerService coordinates rendering
- Services handle D3 projection creation

### I18n
- Vue I18n plugin for translations
- useI18n() composable in components
- Locale files: src/i18n/locales/en.json, fr.json

## Conditional Rendering Patterns

### Template Readability Guidelines

**Pattern**: Extract complex conditionals into computed properties
**Rationale**: Improves template readability and maintainability

**Before** (inline conditionals):
```vue
<CardContainer
  v-show="(
    viewStore.viewMode === 'unified'
    || viewStore.viewMode === 'built-in-composite'
    || viewStore.showProjectionSelector
    || viewStore.showIndividualProjectionSelectors
  )"
>
```

**After** (composable with semantic flags):
```vue
<CardContainer v-show="shouldShowRightSidebar">
```

### Visibility Logic Architecture

**viewStore**: Provides computed properties via ProjectionUIService
- `showProjectionSelector`, `showIndividualProjectionSelectors`
- These delegate to ProjectionUIService.shouldShow*() methods
- Single source of truth for component visibility rules

**useViewState**: Provides view mode flags and UI helpers
- Boolean flags: `isCompositeMode`, `isSplitMode`, `isUnifiedMode`, etc.
- Compound conditions: `shouldShowRightSidebar`, `shouldShowProjectionParams`
- Card helpers: `cardTitle`, `cardIcon`
- Does NOT duplicate viewStore logic

**Best Practice**: Use viewStore.show* for component visibility, useViewState for view mode checks

## Territory Customization Workflow (Custom Composite Mode)

### Overview
Custom composite mode allows users to select which territories to include in the composite projection. Territory set customization is managed through viewStore.activeTerritoryCodes and visualized via TerritorySetManager component.

### Territory Set State Flow

**Initialization**:
1. Preset loaded via PresetLoader.loadPreset()
2. Territory codes extracted from preset.territories
3. viewStore.setActiveTerritories(territoryCodes) initializes activeTerritoryCodes Set
4. InitializationService stores territory codes for validation

**Display Filtering**:
1. geoDataStore.filteredTerritories computed filters by activeTerritoryCodes
2. Only territories in activeTerritoryCodes Set are visible in UI and rendered on map
3. Mainland always visible (handled separately from overseas territories)

**User Interaction**:
1. User clicks "Add" button in TerritorySetManager
2. TerritorySetManager calls viewStore.addTerritoryToComposite(code)
3. viewStore adds code to activeTerritoryCodes Set (creates new Set for reactivity)
4. TerritorySetManager calls geoDataStore.triggerRender()
5. Map re-renders with new territory included

**Composition Border Filtering**:
1. MapRenderer passes filteredTerritoryCodes Set to MapOverlayService
2. MapOverlayService.renderCustomCompositeBorders() filters borders
3. Only active territory borders are rendered (those in filteredTerritoryCodes Set)
4. Result: Visual borders match active territory set

**Reset to Defaults**:
1. User clicks reset button in TerritoriesControl
2. TerritoriesControl.resetToDefaults() calls useTerritoryTransforms.resetTransforms()
3. resetTransforms() extracts preset territory codes from presetDefaults
4. Calls viewStore.setActiveTerritories(presetTerritoryCodes)
5. Calls geoDataStore.triggerRender()
6. Territory set and parameters restored to preset state

**Divergence Detection**:
1. TerritoriesControl.hasDivergingFromPreset computed checks territory set
2. Compares activeTerritoryCodes with preset territory codes (Set equality check)
3. If sets differ in size or membership, reset button enabled
4. Also checks parameter divergence for comprehensive reset detection

### Component Integration

**TerritorySetManager** (src/components/ui/parameters/TerritorySetManager.vue):
- Displays active territories with remove buttons
- Displays available territories with add buttons
- Filters out mainland from available list
- Limits available territories to those loaded from preset

**TerritoriesControl** (src/components/ui/parameters/TerritoriesControl.vue):
- Renders TerritorySetManager for territory selection
- Provides reset button enabled when territory set or parameters diverge
- Manages territory parameter controls via accordion

**CompositeCustomControls** (src/components/configuration/CompositeCustomControls.vue):
- Top-level component for custom composite mode
- Integrates PresetSelector, TerritorySetManager, and parameter controls
- Coordinates territory projection and parameter management

### State Management

**viewStore** (src/stores/view.ts):
- activeTerritoryCodes: Set<string> - Active territory codes
- addTerritoryToComposite(code): Add territory to active set
- removeTerritoryFromComposite(code): Remove territory from active set
- setActiveTerritories(codes[]): Replace entire active set

**geoDataStore** (src/stores/geoData.ts):
- filteredTerritories: Computed property filtering by activeTerritoryCodes
- overseasTerritoriesData: All loaded territory data (source for filtering)
- triggerRender(): Force map re-render after territory set changes

### Design Decisions

**Why Set<string>**: O(1) membership checking for efficient filtering in computed properties and render loops.

**Why filter at display level**: Keeps data loading simple and avoids reloading data when changing territory set.

**Why limit to preset territories**: Adding arbitrary territories would require rebuilding CompositeProjection with new subProjections, which is architecturally complex. Limiting to preset territories ensures all territories have projection configurations and parameters.

**Why always show mainland**: Mainland is the primary territory in single-focus atlases and should always be visible for context.

**Why new Set for reactivity**: Vue 3 reactivity requires creating new object references when mutating Sets (ref unwrapping doesn't track Set mutations).

## Related Documentation

- docs/architecture.llm.rxt - Overall architecture
- docs/services.md - Service layer
- docs/atlases.md - Atlas configuration
- docs/projections.md - Projection system
