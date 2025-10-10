# Service Layer Architecture

## Table of Contents
- [Overview](#overview)
- [Service Organization](#service-organization)
- [Service Interactions](#service-interactions)
- [Atlas Services](#atlas-services)
- [Data Services](#data-services)
- [Projection Services](#projection-services)
- [Rendering Services](#rendering-services)
- [Design Patterns](#design-patterns)
- [Usage Guidelines](#usage-guidelines)

## Overview

The service layer contains business logic extracted from Vue components and Pinia stores. Services are organized by domain responsibility into four main categories:

- **Atlas Services**: Atlas-specific logic, pattern detection, and orchestration
- **Data Services**: Geographic data loading, filtering, and processing
- **Projection Services**: Projection creation, management, and UI logic
- **Rendering Services**: Map rendering, overlays, and size calculations

All new services (Phase 1-4 refactoring) use static methods for testability without Vue context.

## Service Organization

```
src/services/
├── atlas/
│   ├── atlas-coordinator.ts          # Orchestrates atlas changes
│   ├── atlas-pattern-service.ts      # Pattern detection & decisions
│   ├── atlas-service.ts              # Data access facade
│   └── territory-defaults-service.ts # Territory initialization
├── data/
│   ├── geo-data-service.ts           # Geographic data loading
│   ├── territory-data-loader.ts      # Strategy pattern for loading
│   └── territory-filter-service.ts   # Territory filtering & grouping
├── projection/
│   ├── composite-projection.ts       # Composite projection implementation
│   ├── projection-service.ts         # Projection creation & management
│   └── projection-ui-service.ts      # UI visibility logic
└── rendering/
    ├── border-renderer.ts            # Border rendering strategies
    ├── cartographer-factory.ts       # Factory for Cartographer
    ├── cartographer-service.ts       # Main rendering coordinator
    ├── composite-settings-builder.ts # Build composite settings
    ├── map-overlay-service.ts        # Overlay rendering
    ├── map-render-coordinator.ts     # Rendering orchestration
    └── map-size-calculator.ts        # Size calculations
```

## Service Interactions

### Component → Store → Service Flow

```
┌─────────────────┐
│   Components    │
│  (MapView.vue)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Stores      │
│  (config.ts)    │
│  (geoData.ts)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Services     │
│  (Organized by  │
│    domain)      │
└─────────────────┘
```

### Atlas Change Flow

When a user changes atlas (e.g., from France to Portugal):

```
Component (MapView)
    │
    ├─> configStore.changeAtlas('portugal')
    │       │
    │       ├─> AtlasCoordinator.handleAtlasChange()
    │       │       │
    │       │       ├─> AtlasPatternService.getDefaultViewMode()
    │       │       ├─> TerritoryDefaultsService.initializeAll()
    │       │       └─> Returns initial configuration
    │       │
    │       └─> Update store state
    │
    └─> geoDataStore.loadAtlasData()
            │
            ├─> TerritoryDataLoader.loadTerritoryData()
            │       │
            │       ├─> AtlasPatternService.isSingleFocus()
            │       └─> Select appropriate strategy
            │
            └─> CartographerFactory.create()
```

### Map Rendering Flow

When rendering a map in MapRenderer component:

```
MapRenderer.vue
    │
    ├─> MapRenderCoordinator.renderSimpleMap() or renderCompositeMap()
    │       │
    │       ├─> CompositeSettingsBuilder.buildSettings() (if composite-custom)
    │       │       │
    │       │       ├─> extractTerritoryCodes()
    │       │       └─> buildTerritoryProjections()
    │       │
    │       └─> Cartographer.render()
    │               │
    │               ├─> ProjectionService.getProjection()
    │               │       │
    │               │       └─> ProjectionFactory.createById()
    │               │
    │               ├─> GeoDataService.getTerritoriesGeoData()
    │               │
    │               └─> Plot.plot() (Observable Plot)
    │
    └─> MapRenderCoordinator.applyOverlays()
            │
            └─> MapOverlayService.applyOverlays()
                    │
                    ├─> createCompositeBorderPath() (if needed)
                    ├─> computeSceneBBox()
                    └─> D3 selection API for SVG manipulation
```

### Territory Filtering Flow

When filtering territories based on mode:

```
Component
    │
    └─> geoDataStore.filteredTerritories (computed)
            │
            └─> TerritoryFilterService.filterTerritories()
                    │
                    ├─> AtlasService.getAllTerritories()
                    ├─> AtlasService.getTerritoryModes()
                    └─> Apply filtering logic based on mode
```

### Projection UI Visibility Flow

When determining which UI controls to show:

```
Component
    │
    └─> ProjectionUIService.shouldShowProjectionSelector()
            │
            ├─> AtlasPatternService.isSingleFocus()
            ├─> Check viewMode
            └─> Return visibility decision
```

## Atlas Services

### AtlasPatternService

**Purpose**: Centralize pattern detection and behavioral decisions for different atlas types.

**Key Methods**:
- `isSingleFocus(config)` - Check if atlas has single mainland + overseas territories
- `isEqualMembers(config)` - Check if atlas has equal member states (e.g., EU)
- `supportsSplitView(config)` - Check if split view is supported
- `getDefaultViewMode(config)` - Get recommended view mode for atlas
- `getPrimaryTerritoryRole(config)` - Determine if territories are "mainland" or "members"

**Used By**: Stores, TerritoryDataLoader, ProjectionUIService

**Pattern**: Static methods for stateless pattern detection

**Example**:
```typescript
if (AtlasPatternService.isSingleFocus(atlasConfig)) {
  viewMode = 'individual'
}
else {
  viewMode = 'composite-existing'
}
```

---

### AtlasCoordinator

**Purpose**: Orchestrate complex atlas change operations that involve multiple services.

**Key Methods**:
- `handleAtlasChange(atlasId, registryConfig)` - Coordinate all updates when changing atlas
- `getInitialConfiguration(atlasId, registryConfig)` - Build initial configuration for atlas

**Uses**: AtlasPatternService, TerritoryDefaultsService

**Used By**: config store

**Pattern**: Coordinator pattern for multi-step operations

**Example**:
```typescript
const config = AtlasCoordinator.handleAtlasChange('france', registryConfig)
// Returns: { viewMode, projectionMode, selectedProjection, compositeProjection, ... }
```

---

### TerritoryDefaultsService

**Purpose**: Initialize territory projections, translations, and scales with sensible defaults.

**Key Methods**:
- `initializeAll(territories, baseProjection, compositeConfig)` - Initialize all defaults
- `mergeCustomConfig(defaults, customConfig)` - Merge custom configuration with defaults

**Used By**: AtlasCoordinator, config store

**Pattern**: Static methods for initialization logic

**Example**:
```typescript
const defaults = TerritoryDefaultsService.initializeAll(
  ['FR-75', 'FR-971', 'FR-972'],
  'conic-equal-area',
  compositeConfig
)
// Returns: { territoryProjections, territoryTranslations, territoryScales }
```

---

### AtlasService

**Purpose**: Atlas-aware facade providing unified API for territory data access.

**Key Methods**:
- `getTerritories()` - Get filtered/grouped territories
- `getTerritoryModes()` - Get available display modes
- `getTerritoryGroups()` - Get territory groupings
- `getProjectionParams()` - Get projection parameters

**Uses**: GeoDataService, AtlasConfig

**Used By**: Components, TerritoryFilterService

**Pattern**: Facade pattern (instance-based)

**Example**:
```typescript
const atlasService = new AtlasService(geoDataService, atlasConfig)
const territories = atlasService.getTerritories()
const modes = atlasService.getTerritoryModes()
```

## Data Services

### TerritoryDataLoader

**Purpose**: Load territory data using pattern-specific strategies.

**Key Methods**:
- `loadTerritoryData(cartographer, atlasConfig, mainlandCode)` - Load data using appropriate strategy

**Strategies**:
- `SingleFocusLoadStrategy` - For atlases with 1 mainland + N overseas
- `EqualMembersLoadStrategy` - For atlases with N equal member states

**Uses**: AtlasPatternService, GeoDataService

**Used By**: geoData store

**Pattern**: Strategy pattern for pattern-specific loading

**Example**:
```typescript
const result = await TerritoryDataLoader.loadTerritoryData(
  cartographer,
  atlasConfig,
  'FR'
)
// Returns: { mainlandData, overseasTerritoriesData, rawUnifiedData }
```

---

### TerritoryFilterService

**Purpose**: Filter and group territories based on display modes.

**Key Methods**:
- `filterTerritories(territories, context)` - Filter territories by mode
- `groupByRegion(territories)` - Group territories by region

**Used By**: geoData store (computed properties)

**Pattern**: Static methods for filtering logic

**Example**:
```typescript
const filtered = TerritoryFilterService.filterTerritories(territories, {
  hasTerritorySelector: true,
  territoryMode: 'atlantic',
  allTerritories: [...],
  territoryModes: {...}
})
```

---

### GeoDataService

**Purpose**: Load and process geographic data from TopoJSON sources.

**Key Methods**:
- `loadData()` - Load TopoJSON and metadata
- `getAllTerritoriesGeoData()` - Get all territory data
- `getTerritoriesGeoData(codes)` - Get filtered territory data
- `getTerritoryInfo()` - Get territory metadata
- `calculateBounds(feature)` - Calculate geographic bounds

**Used By**: Cartographer, TerritoryDataLoader, AtlasService

**Pattern**: Instance-based with data caching

**Example**:
```typescript
const geoDataService = new GeoDataService(geoDataConfig)
await geoDataService.loadData()
const territories = geoDataService.getAllTerritoriesGeoData()
```

## Projection Services

### ProjectionUIService

**Purpose**: Determine UI visibility logic for projection controls.

**Key Methods**:
- `getProjectionGroups(projections)` - Group projections by category
- `shouldShowProjectionSelector(atlasConfig, viewMode)` - Show/hide projection selector
- `shouldShowProjectionModeSelector(atlasConfig, viewMode)` - Show/hide mode selector
- `shouldShowCompositeProjectionSelector(atlasConfig, viewMode)` - Show/hide composite selector
- `shouldShowTerritorySelector(atlasConfig)` - Show/hide territory selector
- `shouldShowViewModeSelector(atlasConfig)` - Show/hide view mode selector
- `shouldShowScalePreservation(atlasConfig, viewMode)` - Show/hide scale preservation

**Uses**: AtlasPatternService

**Used By**: config store (computed properties)

**Pattern**: Static methods for UI logic

**Example**:
```typescript
const showSelector = ProjectionUIService.shouldShowProjectionSelector(
  atlasConfig,
  'composite-custom'
)
// Returns: true/false
```

---

### ProjectionService

**Purpose**: Create and manage projections using factory/registry pattern.

**Key Methods**:
- `setProjectionParams(params)` - Set region-specific parameters
- `getProjection(type, data)` - Create projection using factory
- `getAvailableProjections(context)` - Get filtered projections
- `groupProjectionsByCategory(projections)` - Group projections
- `recommendProjection(context)` - Get projection recommendation

**Uses**: ProjectionFactory, ProjectionRegistry

**Used By**: Cartographer, components

**Pattern**: Instance-based with region configuration

**Example**:
```typescript
const projectionService = new ProjectionService()
projectionService.setProjectionParams(franceParams)
const projection = projectionService.getProjection('conic-equal-area', geoData)
```

---

### CompositeProjection

**Purpose**: Custom composite projection with manual territory positioning (insets).

**Key Methods**:
- `initialize()` - Initialize all sub-projections
- `setTerritoryProjection(code, projectionId)` - Change projection for territory
- `setTerritoryTranslation(code, x, y)` - Set territory position
- `setTerritoryScale(code, multiplier)` - Set territory scale
- `getProjection()` - Get composite projection function
- `rebuild()` - Rebuild composite projection
- `getCompositionBorders()` - Get border rectangles

**Uses**: ProjectionFactory, ProjectionRegistry, d3-geo

**Used By**: Cartographer

**Pattern**: Instance-based with complex state management

**Example**:
```typescript
const composite = new CompositeProjection(compositeConfig)
composite.setTerritoryProjection('FR-971', 'mercator')
composite.setTerritoryTranslation('FR-971', 100, 200)
composite.rebuild()
```

## Rendering Services

### MapSizeCalculator

**Purpose**: Calculate map dimensions with configurable defaults.

**Key Methods**:
- `calculateSize(config)` - Calculate map size based on mode and properties
- `calculateProportionalSize(area, baseWidth, baseArea, minHeight)` - Calculate proportional size

**Used By**: MapRenderer component

**Pattern**: Static methods for size calculations

**Example**:
```typescript
const { width, height } = MapSizeCalculator.calculateSize({
  mode: 'composite',
  isMainland: false,
  preserveScale: true,
  area: 374000,
  width: 200,
  height: 160
})
```

---

### MapOverlayService

**Purpose**: Render map overlays (composition borders and limits) using D3 APIs.

**Key Methods**:
- `applyOverlays(svg, config)` - Apply overlays to rendered SVG
- `boundsToRect(bounds)` - Convert bounds to rectangle
- `unionRect(base, next)` - Compute union of rectangles
- `computeSceneBBox(svg)` - Compute bounding box of all paths
- `createCompositeBorderPath(projectionId, width, height)` - Create border path

**Uses**: D3 selection API, ProjectionFactory, ProjectionRegistry

**Used By**: MapRenderCoordinator

**Pattern**: Static methods with D3 integration

**Example**:
```typescript
MapOverlayService.applyOverlays(svg, {
  showBorders: true,
  showLimits: true,
  viewMode: 'composite-custom',
  projectionId: 'france',
  width: 800,
  height: 600,
  customComposite: compositeProjection
})
```

---

### CompositeSettingsBuilder

**Purpose**: Build custom composite settings from atlas configuration.

**Key Methods**:
- `extractTerritoryCodes(compositeConfig)` - Extract territory codes from config
- `buildTerritoryProjections(codes, mode, projection, territoryProjections)` - Build projections map
- `buildSettings(compositeConfig, mode, ...)` - Build complete settings

**Used By**: MapRenderCoordinator

**Pattern**: Static methods for settings construction

**Example**:
```typescript
const settings = CompositeSettingsBuilder.buildSettings(
  compositeConfig,
  'individual',
  'conic-equal-area',
  territoryProjections,
  territoryTranslations,
  territoryScales
)
// Returns: { territoryProjections, territoryTranslations, territoryScales }
```

---

### MapRenderCoordinator

**Purpose**: Coordinate map rendering by building options and orchestrating services.

**Key Methods**:
- `renderSimpleMap(cartographer, config)` - Render simple territory map
- `renderCompositeMap(cartographer, config)` - Render composite map
- `applyOverlays(svg, viewMode, config)` - Apply overlays to rendered map

**Uses**: CompositeSettingsBuilder, MapOverlayService, Cartographer

**Used By**: MapRenderer component

**Pattern**: Coordinator pattern for rendering orchestration

**Example**:
```typescript
const plot = await MapRenderCoordinator.renderSimpleMap(cartographer, {
  geoData: featureCollection,
  projection: 'mercator',
  width: 800,
  height: 600,
  inset: 20,
  showGraticule: true,
  ...
})
```

---

### CartographerService

**Purpose**: Main rendering coordinator with unified API for all render modes.

**Key Methods**:
- `render(options)` - Unified rendering API (simple/composite modes)
- `renderSimple(options)` - Simple projection rendering
- `renderCustomComposite(options)` - Custom composite rendering
- `renderProjectionComposite(options)` - Projection-based composite rendering
- `createPlot(data, projection, width, height, inset)` - Common Plot creation

**Uses**: ProjectionService, GeoDataService, CompositeProjection, Observable Plot

**Used By**: MapRenderer component, MapRenderCoordinator

**Pattern**: Instance-based with complex orchestration

**Example**:
```typescript
const cartographer = new Cartographer(geoDataConfig, compositeConfig)
await cartographer.init()
const plot = await cartographer.render({
  mode: 'simple',
  geoData: data,
  projection: 'mercator',
  width: 800,
  height: 600
})
```

---

### CartographerFactory

**Purpose**: Factory for creating region-specific Cartographer instances.

**Key Methods**:
- `create(regionId)` - Create or retrieve cached Cartographer
- `getInstance(regionId)` - Get cached instance
- `clear(regionId)` - Clear cached instance
- `clearAll()` - Clear all instances

**Uses**: AtlasRegistry, Cartographer

**Used By**: geoData store

**Pattern**: Static factory with instance caching

**Example**:
```typescript
const cartographer = await CartographerFactory.create('france')
// Returns cached instance if available, creates new one otherwise
```

---

### BorderRenderer

**Purpose**: Border rendering strategies for different composite modes.

**Classes**:
- `CustomCompositeBorderRenderer` - Renders borders for custom composite
- `ExistingCompositeBorderRenderer` - Renders borders for existing projections

**Status**: Created but not fully integrated (deferred)

**Pattern**: Strategy pattern for border rendering

## Design Patterns

### Static Methods (New Services)

**Used In**: Phase 1-4 services (AtlasPatternService, TerritoryFilterService, etc.)

**Benefits**:
- Testable without Vue context
- Functional programming style
- No state management in services
- Easy to mock in tests

**Example**:
```typescript
export class AtlasPatternService {
  static isSingleFocus(config: AtlasConfig): boolean {
    return config.compositeProjectionConfig?.type === 'single-focus'
  }
}
```

---

### Instance-Based Services (Existing Services)

**Used In**: GeoDataService, ProjectionService, Cartographer, AtlasService

**Benefits**:
- Stateful operations (caching, configuration)
- Complex initialization requirements
- Legacy compatibility
- Service lifecycle management

**Example**:
```typescript
export class GeoDataService {
  private territoryData: Map<string, TerritoryGeoData> = new Map()

  constructor(public readonly config: GeoDataConfig) {}

  async loadData(): Promise<void> {
    // Load and cache data
  }
}
```

---

### Strategy Pattern

**Used In**: TerritoryDataLoader

**Purpose**: Select appropriate loading logic based on atlas pattern

**Implementation**:
```typescript
interface LoadStrategy {
  load(cartographer, atlasConfig, mainlandCode): Promise<LoadResult>
}

class SingleFocusLoadStrategy implements LoadStrategy { ... }
class EqualMembersLoadStrategy implements LoadStrategy { ... }

// Usage
const strategy = isSingleFocus ? new SingleFocusLoadStrategy() : new EqualMembersLoadStrategy()
const result = await strategy.load(...)
```

---

### Coordinator Pattern

**Used In**: AtlasCoordinator, MapRenderCoordinator

**Purpose**: Orchestrate complex multi-step operations involving multiple services

**Benefits**:
- Single responsibility for coordination
- Clear orchestration flow
- Easy to test coordination logic
- Reduces complexity in stores/components

**Example**:
```typescript
export class AtlasCoordinator {
  static handleAtlasChange(atlasId, registryConfig) {
    // Step 1: Detect pattern
    const pattern = AtlasPatternService.getDefaultViewMode(...)

    // Step 2: Initialize defaults
    const defaults = TerritoryDefaultsService.initializeAll(...)

    // Step 3: Return coordinated result
    return { ...pattern, ...defaults }
  }
}
```

---

### Facade Pattern

**Used In**: AtlasService

**Purpose**: Provide simplified API hiding complexity from components

**Benefits**:
- Simplified component code
- Consistent API across features
- Easy to refactor internals

**Example**:
```typescript
export class AtlasService {
  getTerritories() {
    // Hide complexity of filtering, grouping, etc.
    return this.geoDataService.getAllTerritoriesGeoData()
  }
}
```

---

### Factory Pattern

**Used In**: CartographerFactory, ProjectionFactory

**Purpose**: Create configured instances with proper initialization

**Benefits**:
- Centralized creation logic
- Instance caching
- Consistent initialization
- Easy to add new types

**Example**:
```typescript
export class CartographerFactory {
  private static instances = new Map<string, Cartographer>()

  static async create(regionId: string): Promise<Cartographer> {
    if (this.instances.has(regionId)) {
      return this.instances.get(regionId)!
    }

    const cartographer = new Cartographer(...)
    await cartographer.init()
    this.instances.set(regionId, cartographer)
    return cartographer
  }
}
```

## Usage Guidelines

### 1. Import from Organized Subdirectories

```typescript
// ❌ Bad - Don't import from root
import { AtlasService } from '@/services/atlas-service'
// ✅ Good - Import from organized structure
import { AtlasPatternService } from '@/services/atlas/atlas-pattern-service'
import { TerritoryDataLoader } from '@/services/data/territory-data-loader'
import { ProjectionUIService } from '@/services/projection/projection-ui-service'

import { MapSizeCalculator } from '@/services/rendering/map-size-calculator'
```

### 2. Use Static Methods for Stateless Operations

```typescript
// ✅ Good - Static method for stateless operation
if (AtlasPatternService.isSingleFocus(config)) {
  // ...
}

// ❌ Bad - Don't create instances for stateless operations
const service = new AtlasPatternService()
if (service.isSingleFocus(config)) {
  // ...
}
```

### 3. Use Instance Methods for Stateful Operations

```typescript
// ✅ Good - Instance for stateful service
const geoDataService = new GeoDataService(config)
await geoDataService.loadData()
const data = geoDataService.getAllTerritoriesGeoData()

// ❌ Bad - Don't use static methods for stateful operations
await GeoDataService.loadData(config)
const data = GeoDataService.getAllTerritoriesGeoData()
```

### 4. Services Handle Business Logic, Not Presentation

```typescript
// ✅ Good - Service returns data, component handles presentation
const territories = TerritoryFilterService.filterTerritories(data, context)

// Component
territories.forEach((t) => {
  console.log(`${t.name}: ${t.code}`)
})

// ❌ Bad - Don't put presentation logic in services
const html = TerritoryFilterService.renderTerritories(data, context)
```

### 5. Components Coordinate Service Calls

```typescript
// ✅ Good - Component coordinates multiple services
async function handleAtlasChange() {
  const config = AtlasCoordinator.handleAtlasChange(atlasId, registryConfig)
  await geoDataStore.loadAtlasData()
  configStore.applyConfiguration(config)
}

// ❌ Bad - Don't let services directly update stores
AtlasCoordinator.handleAtlasChangeAndUpdateStore(atlasId, store)
```

### 6. Stores Use Services for Complex Operations

```typescript
// ✅ Good - Store uses service for complex logic
const filteredTerritories = computed(() => {
  return TerritoryFilterService.filterTerritories(territories, {
    hasTerritorySelector: atlasConfig.hasTerritorySelector,
    territoryMode: configStore.territoryMode,
    allTerritories: atlasService.getAllTerritories(),
    territoryModes: atlasService.getTerritoryModes()
  })
})

// ❌ Bad - Don't implement complex logic in stores
const filteredTerritories = computed(() => {
  if (!atlasConfig.hasTerritorySelector) {
    return territories
  }
  // 50 lines of complex filtering logic...
})
```

### 7. Keep Services Focused on Single Responsibility

```typescript
// ✅ Good - Focused services
MapSizeCalculator.calculateSize(...)
MapOverlayService.applyOverlays(...)

// ❌ Bad - God service doing everything
MapService.calculateSize(...)
MapService.applyOverlays(...)
MapService.renderMap(...)
MapService.filterTerritories(...)
```

## Benefits

### Clear Separation of Concerns
- Each service has a single, well-defined responsibility
- Easy to understand what each service does
- Changes to one concern don't affect others

### Testable Without Vue Dependencies
- Static methods don't require Vue context
- Easy to unit test with simple inputs/outputs
- No need to mock stores or components

### Reusable Across Components
- Services can be used by any component
- Consistent behavior across the application
- No duplication of business logic

### Consistent Patterns and Conventions
- Same patterns used throughout codebase
- Easy to add new services following examples
- Clear guidelines for when to use each pattern

### Easy to Navigate and Discover
- Organized by domain (atlas, data, projection, rendering)
- Related services co-located
- Clear naming conventions

### Reduced Component Complexity
- Components focus on user interaction and presentation
- Business logic delegated to services
- Smaller, more maintainable components

---

**Last Updated**: October 10, 2025
**Refactoring Phase**: 4 (Complete)
**Total Services**: 17 (11 new + 6 reorganized)
