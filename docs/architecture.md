# Atlas composer - Architecture Overview

## Purpose
Interactive web application for creating custom cartographic visualizations of countries with geographically-scattered territories using composite projections.

## Technology Stack
- Frontend: Vue.js 3 + TypeScript + Vite
- Mapping: D3.js (rendering), Observable Plot (code generation)
- State: Pinia stores
- Styling: Tailwind CSS + DaisyUI 5
- Data: Natural Earth GeoJSON

## Type Safety

### Branded Types
Domain identifiers use branded types for compile-time safety:
- `AtlasId` - Atlas identifier (e.g., 'france', 'usa')
- `ProjectionId` - Projection identifier (e.g., 'albers-usa')
- `PresetId` - Preset identifier (e.g., 'france-default')
- `TerritoryCode` - Territory code (e.g., 'FR-GUA', 'US-HI')

Type definitions use branded types directly:
- `TerritoryConfig.code: TerritoryCode` (src/types/territory.ts, src/services/territory/types.ts)
- `Territory.code: TerritoryCode` (geoData store)
- Store public APIs accept branded types: `getTerritoryByCode(code: TerritoryCode)`
- Parameter store methods: `getEffectiveParameters(territoryCode: TerritoryCode)`

Boundary conversions (using `as TerritoryCode`):
- JSON loading: `territory.code as TerritoryCode` from configs
- Object.keys(): Returns `string[]` from `Record<TerritoryCode, T>`
- URL parameters and DOM events: External string data
- Helper functions: `createAtlasId()`, `createProjectionId()`, `createTerritoryCode()`, `createPresetId()`

## Core Concepts

### 1. Atlas System
Domain: Configuration-driven atlas definitions
File: docs/atlases.md
- JSON-based atlas configurations (configs/*.json)
- Atlas registry and loader
- Territory composition rules
- View modes (composite, split, unified)

### 2. Projection System
Domain: Map projection management
File: docs/projections.md
- Projection definitions and families (20+ projections)
- Parameter configuration and application
- Projection registry with recommendation engine
- Projection factory and D3 integration

### 3. Parameter Registry System
Domain: Unified parameter management and validation
File: docs/services.md (Parameter Management section)
- Central parameter registry with metadata and constraints
- Type-safe parameter definitions for all projection families
- Validation integration across stores, UI, presets, and export
- Parameter inheritance with territory → global → atlas → registry defaults
- Registry-driven UI constraints and real-time validation feedback
- Comprehensive test coverage (32 passing tests)

### 4. Preset System
Domain: Saved projection configurations
File: docs/presets.md
- Core preset types and validation logic (src/core/presets/)
- Preset file loading services (src/services/presets/)
- Territory defaults and parameter extraction
- View mode preset management (unified, split, built-in-composite)
- Atlas metadata extraction from preset files
- Conversion between preset format and internal application formats

### 5. Service Layer
Domain: Business logic and rendering
File: docs/services.md
- AtlasService: Configuration management
- ProjectionService: Projection creation
- Cartographer: Map rendering (instance-based)
- GeoDataService: GeoJSON data loading
- TerritoryDataLoader: Territory-specific data loading

### 6. Vue Layer
Domain: User interface and interaction
File: docs/vue-architecture.md
- Vue 3 components with Composition API (16 components)
- Pinia stores for state management (6 stores: atlas, projection, view, parameters, geoData, ui)
- Composables for reusable logic (19 composables including useAtlasData, useParameterProvider)
- Component hierarchy and data flow
- Comprehensive type safety (370 lines of types)
- Test coverage (175 tests, 100% passing)

### 7. Export System
Domain: Code generation for composite projections
File: docs/export.md
- Registry-based parameter export with complete coverage
- Configuration serialization using parameter registry
- D3.js code generation (JavaScript/TypeScript)
- Observable Plot code generation
- D3 stream protocol implementation
- Geographic bounds routing and stream multiplexing

### 8. Build System
Domain: Data preparation and validation
File: docs/scripts.md
- prepare-geodata.ts: Natural Earth processing
- validate-configs.ts: Schema validation
- Development utilities

## Project Structure

```
src/
├── App.vue             # Root component
├── main.ts             # Application entry
├── router/             # Vue Router configuration
├── views/              # Page components
│   └── MapView.vue         # Main application view
├── components/         # Vue components
│   ├── MapRenderer.vue      # Main rendering component
│   ├── TerritoryControls.vue
│   └── ui/                  # Reusable UI components
├── composables/        # Vue composables (reusable logic)
├── stores/             # Pinia state stores
│   ├── app.ts              # Application lifecycle state machine
│   ├── atlas.ts            # Atlas selection and configuration
│   ├── projection.ts       # Projection settings and parameters
│   ├── view.ts             # View mode and territory selection
│   ├── parameters.ts       # Territory parameter management
│   ├── geoData.ts          # Geographic data state
│   └── ui.ts               # UI preferences (theme, display)
├── config/             # Application configuration
│   └── transitions.ts      # Centralized transition timing constants
├── core/               # Core domain logic
│   ├── atlases/            # Atlas system
│   ├── projections/        # Projection system
│   ├── parameters/         # Parameter registry
│   ├── presets/            # Preset types and logic
│   └── types/              # Shared types
├── services/           # Business logic layer
│   ├── atlas/              # Atlas management
│   ├── projection/         # Projection creation
│   ├── rendering/          # Rendering coordination
│   └── data/               # Data loading
├── types/              # TypeScript definitions
└── i18n/               # Internationalization

configs/                # Atlas configurations
├── atlas.schema.json      # JSON schema for atlas configurations
├── france.json
├── portugal.json
└── ...

scripts/                # Build and dev scripts
├── prepare-geodata.ts     # Data preparation
└── validate-configs.ts    # Validation
```

## Key Patterns

### Configuration-Driven Design
- Atlas behavior defined in JSON configs
- Validated against JSON schema
- Loaded dynamically at runtime
- Single source of truth for atlas rules

### Service Layer Pattern
- Clear separation: UI → Service → D3/Plot
- Services are stateless coordinators
- State managed in Pinia stores
- Services use dependency injection

### Unified Parameter Registry System
- Central parameter registry with complete metadata and validation
- Type-safe parameter definitions with constraints and defaults
- Family-based parameter relevance and validation rules
- Integrated validation across stores, UI, presets, and export
- Parameter inheritance: territory → global → atlas → registry defaults
- Registry-driven UI constraints and real-time validation feedback

### Reactive Rendering
- Watchers trigger re-renders on state changes
- CartographerService coordinates rendering
- MapRenderer.vue handles DOM updates
- Efficient re-renders with computed properties

### Error Handling
- **Result Type**: Explicit error handling via `Result<T, E>` discriminated union
- **Domain Errors**: Type-safe error types (`GeoDataError`, `PresetError`, `ProjectionError`, `AtlasError`, `NetworkError`)
- **Error Factories**: `Errors.geoDataNotFound(path)`, `Errors.networkFailed(message)`, etc.
- **I18n Integration**: Error messages translated via `useErrorFormatter()` composable
- **Dual Pattern**: Result type for data loading, LoadResult for preset operations (preserves warnings)

## Data Flow

```
User Action
    ↓
Vue Component
    ↓
Pinia Store (state update)
    ↓
Service Layer (business logic)
    ↓
D3/Observable Plot (rendering)
    ↓
DOM Update
```

## Distributable Packages

Atlas Composer exports several NPM packages for external consumption:

### Package Hierarchy

```
┌─────────────────────────────────┐
│  @atlas-composer/specification  │ ← Types + JSON Schemas (source of truth)
└────────────────┬────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐ ┌──────────┐ ┌──────────────┐
│ loader │ │ preset-  │ │ web app      │
│        │ │ library  │ │ (src/)       │
└────┬───┘ └──────────┘ └──────────────┘
     │
     ▼
┌────────────────┐
│ projection-    │ ← Pure D3 utilities
│ core           │
└────────────────┘
```

### @atlas-composer/specification
- **Location**: `packages/specification/`
- **Purpose**: Single source of truth for the composite projection format
- **Exports**: TypeScript types, JSON schemas, validation utilities
- **Dependencies**: None (zero dependencies)
- **Documentation**: [packages/specification/README.md](../packages/specification/README.md)

### @atlas-composer/preset-library
- **Location**: `packages/preset-library/`
- **Purpose**: Curated collection of ready-to-use composite presets
- **Exports**: Preset catalog API, preset JSON files
- **Dependencies**: `@atlas-composer/specification`
- **Note**: Only composite-custom presets are exported by default; view mode presets are for web app only
- **Documentation**: [packages/preset-library/README.md](../packages/preset-library/README.md)

### @atlas-composer/projection-loader
- **Location**: `packages/projection-loader/`
- **Purpose**: Runtime loader for composite projection configurations
- **Exports**: `loadCompositeProjection`, `registerProjection`, D3 helpers
- **Dependencies**: `@atlas-composer/projection-core`, `@atlas-composer/specification`
- **Bundle Size**: ~6KB (94% smaller than full D3 projection bundle)
- **Documentation**: [packages/projection-loader/README.md](../packages/projection-loader/README.md)

### @atlas-composer/projection-core
- **Location**: `packages/projection-core/`
- **Purpose**: Low-level utilities for building composite projections
- **Exports**: Stream utilities, bounds checking, composite builder
- **Dependencies**: None (pure D3-compatible functions)
- **Documentation**: [packages/projection-core/README.md](../packages/projection-core/README.md)

### Build Commands

```bash
# Build all packages in dependency order
pnpm build:packages

# Build individual packages
pnpm build:specification
pnpm build:preset-library
pnpm build:loader
pnpm build:core

# Type check all packages
pnpm typecheck:packages
```

## Domain Boundaries

1. **Configuration Domain** (core/atlases/)
   - Atlas definitions and metadata
   - Territory composition rules
   - JSON schema validation

2. **Projection Domain** (core/projections/)
   - Projection definitions and families (20+ projections)
   - Parameter configuration and defaults
   - Projection registry with recommendation engine
   - D3 projection factory and creation

3. **Parameter Domain** (core/parameters/)
   - Central parameter registry with metadata
   - Type-safe parameter definitions with constraints
   - Family-based parameter relevance and validation
   - Parameter inheritance system

4. **Preset Domain** (core/presets/, services/presets/)
   - Core: Domain types (PresetLoadResult, TerritoryDefaults, ViewModePreset)
   - Core: Validation logic (validateCompositePreset, validateViewPreset)
   - Core: Conversion logic (convertToDefaults, extractTerritoryParameters)
   - Services: File loading (PresetLoader, ViewPresetLoader)
   - Services: Atlas metadata extraction (AtlasMetadataService)

5. **Rendering Domain** (services/rendering/)
   - Cartographer coordination
   - D3MapRenderer for pure D3 rendering
   - Map rendering logic
   - Graticule overlay with shared projection

6. **Data Domain** (services/data/)
   - GeoJSON loading and caching
   - Natural Earth data processing
   - Territory data management
   - Returns Result<T, GeoDataError> for explicit error handling

7. **Error Domain** (core/types/)
   - Result type for explicit success/failure handling
   - Domain error types as discriminated unions
   - Error factory functions for consistent error creation
   - LoadResult conversion utilities for interop

8. **UI Domain** (views/, components/, composables/)
   - Vue components and page layouts (16 components)
   - Reusable composables for logic (19 composables including useAtlasData, useParameterProvider)
   - Component-specific state and interactions
   - Type-safe props and events (vue-props.ts, composables.ts)

9. **State Domain** (stores/)
   - Atlas state: atlas.ts - Atlas selection, config, service instance
   - Projection state: projection.ts - Projection selection, composite, canvas
   - View state: view.ts - View mode, territory mode, visibility rules
   - Geographic data state: geoData.ts - GeoJSON data, caching
   - Parameter state: parameters.ts - Global and territory projection parameters
   - UI state: ui.ts - Loading states, modals, toasts
   - Reactive computed properties and watchers

## Vue Architecture Details

### Component Hierarchy
```
App.vue
├── AppHeader.vue (navigation, language, theme)
├── RouterView
│   └── MapView.vue (142 lines - main coordinator)
│       ├── MapRenderer.vue (147 lines - D3 rendering)
│       ├── TerritoryControls.vue (119 lines - territory transforms)
│       ├── ProjectionSelector.vue (114 lines - projection selection)
│       └── UI Components (16 total)
│           ├── ViewModeSection, ProjectionInfo, ProjectionParamsControls
│           └── Reusable: CardContainer, FormControl, SectionHeader
└── AppFooter.vue (credits, links)
```

### Composables (19 total)
**Data Loading**:
- useAtlasData - Orchestrates atlas initialization and data loading
- useAtlasLoader - VueUse async state for atlas loading
- useLoadingState - Skeleton loading state

**Store Abstraction**:
- useProjectionConfig - View-mode-aware projection resolution
- useViewMode - View mode options with translations
- useViewState - Aggregated view state orchestration
- usePresetDefaults - Preset default value management

**Parameter Management**:
- useParameterProvider - Parameter context injection
- useTerritoryParameters - Territory-specific parameters
- useTerritoryTransforms - Territory transform calculations

**UI Interactions**:
- useTerritoryCursor - Territory cursor state (542 lines)
- useTerritoryModeOptions - Territory mode dropdown options
- useClipExtentEditor - Clip extent editing UI
- useProjectionPanning - Pan controls
- useProjectionRecommendations - Projection recommendation display

**Utilities**:
- useUrlState - URL serialization/deserialization
- useMapWatchers - Map reactivity watchers
- useSliderState - Slider state management
- useCollectionSet - Collection set management

### State Management
**atlasStore** (atlas.ts - 257 lines):
- Atlas selection (selectedAtlasId)
- Atlas configuration (currentAtlasConfig)
- Atlas service instance (atlasService)
- Loading state (isAtlasLoading)

**projectionStore** (projection.ts - 341 lines):
- Projection selection (selectedProjection)
- Composite projection (compositeProjection)
- Canvas dimensions (canvasDimensions, referenceScale)
- Custom parameters (customRotate, customCenter, etc.)
- Projection parameter management

**viewStore** (view.ts - 414 lines):
- View mode (composite-custom, split, unified, built-in-composite)
- Territory mode (all, selected)
- Current preset (currentViewPreset)
- Visibility rules and UI state

**geoDataStore** (geoData.ts - 398 lines):
- GeoJSON data caching
- Territory data management
- Loading states

**parameterStore** (parameters.ts - 446 lines):
- Global projection parameters
- Per-territory parameters
- Parameter priority resolution

**uiStore** (ui.ts - 113 lines):
- Loading modals, toasts, dialogs
- Theme management

### Type Safety
**vue-props.ts**:
- MapRendererProps, ViewComponentProps
- TerritoryControlsProps, ProjectionSelectorProps
- Centralized prop definitions with defaults

**composables.ts**:
- Return type interfaces for all composables
- LoadingState, ProjectionConfig, TerritoryConfig, ViewModeConfig
- TerritoryTransforms, AtlasData, ProjectionFiltering

## Reference Files

For detailed information on specific domains:
- Atlas System: docs/atlases.md
- Projections: docs/projections.md
- Services: docs/services.md
- Scripts: docs/scripts.md
- Vue Architecture: docs/vue-architecture.md
- Adding New Atlas: docs/add-new-atlas.md
- Architecture Decisions: docs/adrs.md

## Critical Dependencies

- d3-geo: Core projection engine
- d3-geo-projection: Extended projections
- @observablehq/plot: Declarative plotting
- topojson-client: TopoJSON to GeoJSON conversion
- ajv: JSON schema validation
- pinia: Vue state management
- vue-i18n: Internationalization

## Development Commands

```bash
pnpm install              # Install dependencies
pnpm run dev              # Start dev server
pnpm run build            # Build for production
pnpm run prepare-geodata  # Process Natural Earth data
pnpm run validate-configs # Validate atlas configurations
```

## Entry Points

- Application: src/main.ts
- Routing: src/router/index.ts
- Main View: src/views/MapView.vue
- Renderer: src/components/MapRenderer.vue

## State Management

Two primary stores:
1. **configStore** (stores/config.ts)
   - Selected atlas, projection, view mode
   - Custom projection parameters (delegates to parameterStore)
   - UI preferences (theme, language)
   - Parameter writes via convenience methods (setCustomRotate, setCustomCenter, etc.)

2. **geoDataStore** (stores/geoData.ts)
   - Loaded GeoJSON data
   - Cartographer service instance
   - Data loading state

3. **parameterStore** (stores/parameters.ts)
   - Global and territory-specific projection parameters
   - Parameter inheritance and validation
   - Single source of truth for effective parameters
   - Reactive parameter access via globalEffectiveParameters

## Type System

Central type definitions:
- types/atlas.ts: Atlas configuration types
- types/composite.ts: Territory composition
- types/geo-data.ts: Geographic data structures
- core/projections/types.ts: Projection metadata
- types/territory.ts: Territory positioning

## Application Features
- Multi-atlas support (France, Portugal, Spain, EU, USA, World)
- 20+ projections with smart recommendations
- Interactive projection parameter controls
- Three view modes (composite-custom, built-in-composite, split, unified)
- Real-time territory positioning
- Responsive design with theme support
- Internationalization (EN/FR)

## Projection Core Package (packages/projection-core/)

Shared utilities for composite projection building, used by both the Vue app and the standalone loader:

### Architecture
- **Pure Functions**: Zero-dependency utilities for composite projection logic
- **D3-Compatible Types**: ProjectionLike, StreamLike interfaces match D3 signatures without importing d3-geo
- **Modular Structure**: Stream, bounds, invert, and composite builder utilities
- **Workspace Package**: Built independently, consumed by projection-loader and main app

### Package Structure
```
packages/projection-core/
├── src/
│   ├── types.ts                   # D3-compatible type interfaces
│   ├── stream/                    # Stream utilities
│   │   ├── point-capture.ts       # Point capture stream factory
│   │   └── multiplexer.ts         # Stream multiplexer factory
│   ├── bounds/                    # Bounds utilities
│   │   ├── checker.ts             # Bounds checking functions
│   │   └── clip-extent.ts         # ClipExtent calculators
│   ├── invert/                    # Invert utilities
│   │   └── validator.ts           # Invert with bounds validation
│   ├── composite/                 # Composite builder
│   │   └── builder.ts             # buildCompositeProjection factory
│   └── index.ts                   # Public exports
├── package.json
└── README.md
```

### Exports
**Types**:
- `ProjectionLike` - D3-compatible projection interface
- `StreamLike` - D3 stream protocol interface
- `GeoBounds` - Geographic bounds object `{ minLon, minLat, maxLon, maxLat }`
- `SubProjectionEntry` - Sub-projection with bounds
- `CompositeProjectionConfig` - Configuration for buildCompositeProjection

**Stream Utilities**:
- `createPointCaptureStream()` - Captures projected point coordinates
- `createStreamMultiplexer()` - Routes streams to multiple projections

**Bounds Utilities**:
- `isPointInBounds()` - Check if point within bounds
- `boundsFromArray()` - Convert array `[[minLon, minLat], [maxLon, maxLat]]` to GeoBounds
- `boundsToArray()` - Convert GeoBounds to array format
- `calculateClipExtentFromBounds()` - Calculate clipExtent from projection bounds
- `calculateClipExtentFromPixelOffset()` - Calculate clipExtent from pixel offset array

**Invert Utilities**:
- `invertWithBoundsValidation()` - Invert with geographic bounds validation

**Composite Builder**:
- `buildCompositeProjection()` - Creates D3-compatible composite projection function

### Build Integration
- Built first: `pnpm build:core` runs before loader and app builds
- Consumed via workspace protocol: `"@atlas-composer/projection-core": "workspace:*"`

## Projection Loader Package (packages/projection-loader/)

The standalone projection loader is published as `@atlas-composer/projection-loader` workspace package:

### Architecture
- **Runtime Registry**: Map-based projection storage
- **Plugin Pattern**: Users register projection factories at runtime
- **Zero Dependencies**: No d3-geo or d3-geo-projection bundled (uses projection-core utilities)
- **Self-Contained Types**: Extends projection-core types with loader-specific interfaces
- **Workspace Package**: Built independently, tested separately

### Package Structure
```
packages/projection-loader/
├── src/
│   ├── standalone-projection-loader.ts    # Core loader (uses projection-core)
│   ├── d3-projection-helpers.ts           # Optional D3 factories
│   └── index.ts                           # Public exports
├── __tests__/                             # Test suite (24 tests)
├── examples/                              # Usage examples (5 examples)
├── package.json                           # Depends on @atlas-composer/projection-core
└── README.md                              # User-facing documentation
```

### Benefits
- No version conflicts with user's D3 installation
- 94% smaller bundle size (~6KB vs ~100KB with bundled deps)
- Tree-shakeable exports
- Independent versioning and publishing
- Tree-shakeable (import only needed projections)
- Works with any D3 version (v7, v8, future)
- Supports custom projection implementations

### API
- registerProjection(id, factory) - Register single projection
- registerProjections(factories) - Bulk registration
- loadCompositeProjection(config, options) - Load composite projection
- getRegisteredProjections() - Query registry
- clearProjections() - Clear registry

### D3 Helpers (Optional)
File: packages/projection-loader/src/d3-projection-helpers.ts
- Tree-shakeable D3 projection factories
- Bulk registration helper
- Keeps D3 dependencies isolated from main loader

### Code Generation
The code generator (src/services/export/code-generator.ts) produces loader-based exports:
- Includes projection registration code
- Embeds configuration as JSON
- Calls loadCompositeProjection() with dimensions
- Generates compact code (80-92% smaller than manual implementations)
- Self-documenting (shows registration pattern)

### Build Integration
- Built after core: `pnpm build:loader` runs after `pnpm build:core`
- Integrated in main build: `pnpm build` runs core -> loader -> app
- Independent test suite with 24 tests
- Examples demonstrate usage patterns

See docs/export.md for detailed documentation.

## Parameter Management Architecture

All projection parameters are managed through a unified parameter provider system:

### Parameter Provider
- **Location**: `src/core/parameters/parameter-definitions.ts` + `src/services/parameters/projection-parameter-manager.ts`
- **Single source of truth** for all runtime parameter access
- Parameters are validated and type-checked through the registry

### Managed Parameters
All parameters accessed exclusively through parameter provider:
- **Geographic**: `center`, `rotate`, `parallels`
- **Scale**: `scaleMultiplier` (baseScale computed from referenceScale)
- **Position**: `translateOffset` (from config), `translate` (adjustment parameter)
- **Clipping**: `pixelClipExtent` [x1, y1, x2, y2] - pixel coordinates relative to territory center
- **Quality**: `clipAngle`, `precision`

### Storage Locations
- **Preset files**: Parameters stored in `projection.parameters` and `layout.pixelClipExtent`
- **Runtime**: ALL parameters accessed through `parameterProvider.getEffectiveParameters(territoryCode)`
- **Stores**: `configStore` and `territoryStore` delegate to `parameterStore`

### Clipping Format
- **Only format**: `pixelClipExtent: [x1, y1, x2, y2]` as 4-element array
- **Coordinates**: Pixel offsets relative to territory center (translateOffset)
- **No legacy formats**: Object `{x1,y1,x2,y2}` and nested array `[[x1,y1],[x2,y2]]` removed

## Related Documentation

- **Domain-specific**: `atlases.md`, `projections.md`, `presets.md`, `services.md`
- **UI Layer**: `vue-architecture.md`
- **Export System**: `export.md`
- **Scripts**: `scripts.md`
- **Testing**: `testing.md`
- **Architecture Decisions**: `adrs.md`
- **Improvements & Inspirations**: `improvements.md` - Architectural improvement opportunities and future directions
