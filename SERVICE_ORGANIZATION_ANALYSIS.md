# Service Organization Analysis

## Overview
This document analyzes the existing root-level services in `/src/services` to determine if they should be reorganized into the new subdirectory structure (`atlas/`, `data/`, `projection/`, `rendering/`) for architectural consistency.

## Current State

### New Service Structure (Created During Refactoring)
```
src/services/
  atlas/
    ├── atlas-coordinator.ts          # Orchestrates atlas changes
    ├── atlas-pattern-service.ts      # Pattern detection & behavioral decisions
    └── territory-defaults-service.ts # Territory initialization

  data/
    ├── territory-data-loader.ts      # Strategy pattern for loading data
    └── territory-filter-service.ts   # Territory filtering & grouping

  projection/
    └── projection-ui-service.ts      # Projection grouping & UI visibility

  rendering/
    ├── border-renderer.ts            # Border rendering strategies
    └── map-size-calculator.ts        # Map dimension calculations
```

### Existing Root-Level Services (Pre-Refactoring)
```
src/services/
  ├── atlas-service.ts          # Atlas-aware facade for data access
  ├── cartographer-factory.ts   # Factory for Cartographer instances
  ├── cartographer-service.ts   # Main rendering coordinator
  ├── composite-projection.ts   # Composite projection implementation
  ├── geo-data-service.ts       # Geographic data loading & processing
  └── projection-service.ts     # Projection creation & management
```

## Service Analysis

### 1. atlas-service.ts (90 lines)
**Current Purpose:**
- Atlas-aware facade providing unified API for territory data
- Abstracts away data access from components
- Provides: territories, modes, groups, projection parameters

**Key Methods:**
- `getTerritories()` - Get filtered/grouped territories
- `getTerritoryModes()` - Get available display modes
- `getTerritoryGroups()` - Get territory groupings
- `getProjectionParams()` - Get projection parameters

**Architecture:**
- Instance-based (constructor pattern)
- Dependencies: GeoDataService, AtlasConfig
- Used by: Components (facade layer)

**Recommendation:** ✅ **Move to `atlas/`**
- **Reason:** Atlas-aware facade that provides atlas-specific data access
- **New location:** `src/services/atlas/atlas-service.ts`
- **Clear separation:** Complements `atlas-pattern-service` (pattern detection) and `atlas-coordinator` (orchestration)

---

### 2. cartographer-service.ts (245 lines)
**Current Purpose:**
- Main rendering coordinator
- Unified rendering API for different render modes
- Orchestrates projection, geo-data, and rendering operations

**Key Methods:**
- `render()` - Unified rendering API (simple/composite modes)
- `renderSimple()` - Simple projection rendering
- `renderCustomComposite()` - Custom composite rendering
- `renderProjectionComposite()` - Projection-based composite rendering
- `createPlot()` - Common Plot creation logic

**Architecture:**
- Instance-based (constructor pattern)
- Dependencies: ProjectionService, GeoDataService, CompositeProjection
- Used by: MapRenderer component

**Recommendation:** ✅ **Move to `rendering/`**
- **Reason:** Primary responsibility is rendering coordination
- **New location:** `src/services/rendering/cartographer-service.ts`
- **Clear separation:** Works with `border-renderer` and `map-size-calculator`

---

### 3. cartographer-factory.ts (80 lines)
**Current Purpose:**
- Factory for creating region-specific Cartographer instances
- Instance caching to avoid re-initialization
- Proper cleanup when switching regions

**Key Methods:**
- `create()` - Create or retrieve cached Cartographer
- `getInstance()` - Get cached instance
- `clear()` - Clear cached instance
- `clearAll()` - Clear all instances

**Architecture:**
- Static factory pattern
- Dependencies: AtlasRegistry, Cartographer
- Used by: Stores, components that need Cartographer

**Recommendation:** ✅ **Move to `rendering/`**
- **Reason:** Factory for rendering service (Cartographer)
- **New location:** `src/services/rendering/cartographer-factory.ts`
- **Clear separation:** Co-located with cartographer-service for factory pattern

---

### 4. composite-projection.ts (609 lines)
**Current Purpose:**
- Custom composite projection implementation
- Manual positioning of territories (insets)
- Supports both traditional and multi-mainland patterns
- Territory-specific projection management

**Key Methods:**
- `initialize()` - Initialize sub-projections
- `setTerritoryProjection()` - Change projection for territory
- `setTerritoryTranslation()` - Set territory position
- `setTerritoryScale()` - Set territory scale
- `getProjection()` - Get composite projection function
- `rebuild()` - Rebuild composite projection

**Architecture:**
- Instance-based (constructor pattern)
- Dependencies: d3-geo, ProjectionFactory, ProjectionRegistry
- Used by: Cartographer

**Recommendation:** ✅ **Move to `projection/`**
- **Reason:** Core projection logic for composite projections
- **New location:** `src/services/projection/composite-projection.ts`
- **Clear separation:** Complements `projection-service` and `projection-ui-service`

---

### 5. geo-data-service.ts (402 lines)
**Current Purpose:**
- Loading and processing geographic data
- TopoJSON data conversion
- Territory extraction and caching
- Bounds calculation

**Key Methods:**
- `loadData()` - Load TopoJSON and metadata
- `getAllTerritoriesGeoData()` - Get all territory data
- `getTerritoriesGeoData()` - Get filtered territory data
- `getTerritoryInfo()` - Get territory metadata
- `getAllTerritoryInfo()` - Get all territory metadata
- `calculateBounds()` - Calculate geographic bounds

**Architecture:**
- Instance-based (constructor pattern)
- Dependencies: d3-geo, topojson-client
- Used by: Cartographer, stores

**Recommendation:** ✅ **Move to `data/`**
- **Reason:** Primary responsibility is geographic data loading and processing
- **New location:** `src/services/data/geo-data-service.ts`
- **Clear separation:** Works with `territory-data-loader` and `territory-filter-service`

---

### 6. projection-service.ts (252 lines)
**Current Purpose:**
- Projection creation and management
- Projection filtering and recommendations
- Region-specific projection parameters
- Integration with ProjectionFactory and Registry

**Key Methods:**
- `setProjectionParams()` - Set region-specific parameters
- `getProjection()` - Create projection using factory
- `getAvailableProjections()` - Get filtered projections
- `groupProjectionsByCategory()` - Group projections
- `recommendProjection()` - Get projection recommendation

**Architecture:**
- Instance-based (constructor pattern)
- Dependencies: ProjectionFactory, ProjectionRegistry
- Used by: Cartographer, components

**Recommendation:** ✅ **Move to `projection/`**
- **Reason:** Core projection logic for projection management
- **New location:** `src/services/projection/projection-service.ts`
- **Clear separation:** Complements `composite-projection` and `projection-ui-service`

---

## Proposed New Structure

```
src/services/
  atlas/
    ├── atlas-coordinator.ts          # Orchestrates atlas changes [NEW]
    ├── atlas-pattern-service.ts      # Pattern detection & behavioral decisions [NEW]
    ├── atlas-service.ts              # Atlas-aware facade for data access [MOVED]
    └── territory-defaults-service.ts # Territory initialization [NEW]

  data/
    ├── geo-data-service.ts           # Geographic data loading & processing [MOVED]
    ├── territory-data-loader.ts      # Strategy pattern for loading data [NEW]
    └── territory-filter-service.ts   # Territory filtering & grouping [NEW]

  projection/
    ├── composite-projection.ts       # Composite projection implementation [MOVED]
    ├── projection-service.ts         # Projection creation & management [MOVED]
    └── projection-ui-service.ts      # Projection grouping & UI visibility [NEW]

  rendering/
    ├── border-renderer.ts            # Border rendering strategies [NEW]
    ├── cartographer-factory.ts       # Factory for Cartographer instances [MOVED]
    ├── cartographer-service.ts       # Main rendering coordinator [MOVED]
    └── map-size-calculator.ts        # Map dimension calculations [NEW]
```

## Concern Separation Analysis

### ✅ Clear Separation Between New and Existing Services

#### Atlas Layer
- **atlas-pattern-service** (NEW): Pattern detection & behavioral decisions
- **atlas-coordinator** (NEW): Orchestration logic for atlas changes
- **territory-defaults-service** (NEW): Territory initialization
- **atlas-service** (EXISTING): Data access facade
- **NO OVERLAP**: Each has distinct responsibilities

#### Data Layer
- **territory-data-loader** (NEW): Loading strategies (pattern-specific)
- **territory-filter-service** (NEW): Filtering and grouping
- **geo-data-service** (EXISTING): Raw data loading and processing
- **NO OVERLAP**: New services add higher-level abstractions

#### Projection Layer
- **projection-ui-service** (NEW): UI visibility logic
- **projection-service** (EXISTING): Projection creation and management
- **composite-projection** (EXISTING): Custom composite implementation
- **NO OVERLAP**: Each handles different aspects of projection system

#### Rendering Layer
- **border-renderer** (NEW): Border rendering strategies
- **map-size-calculator** (NEW): Dimension calculations
- **cartographer-service** (EXISTING): Main rendering coordinator
- **cartographer-factory** (EXISTING): Cartographer instance factory
- **NO OVERLAP**: Each handles specific rendering concerns

### Architectural Benefits

1. **Consistent Organization**
   - All services organized by concern
   - Clear directory structure
   - Easy to navigate and understand

2. **Discoverability**
   - Related services co-located
   - Logical grouping by responsibility
   - Clear naming conventions

3. **Maintainability**
   - Changes to one concern isolated to one directory
   - Easy to identify service dependencies
   - Clear boundaries between layers

4. **Scalability**
   - Room for future services in each layer
   - Consistent pattern for new additions
   - Clear place for everything

## Migration Impact

### Files to Move: 6
1. `atlas-service.ts` → `atlas/atlas-service.ts`
2. `cartographer-service.ts` → `rendering/cartographer-service.ts`
3. `cartographer-factory.ts` → `rendering/cartographer-factory.ts`
4. `composite-projection.ts` → `projection/composite-projection.ts`
5. `geo-data-service.ts` → `data/geo-data-service.ts`
6. `projection-service.ts` → `projection/projection-service.ts`

### Import Updates Required
- **Stores** (2 files): config.ts, geoData.ts
- **Components** (2 files): MapRenderer.vue, TerritoryControls.vue
- **Services** (8 files): New services that import existing services
- **Tests** (if any): Update test file imports

### Estimated Effort
- **Moving files**: 5 minutes
- **Updating imports**: 15-20 minutes
- **Testing**: 10 minutes
- **Total**: ~35-40 minutes

## Recommendation

### ✅ **Proceed with Reorganization**

**Reasons:**
1. **Clear concern separation** - No overlap between new and existing services
2. **Architectural consistency** - All services organized by responsibility
3. **Low risk** - Only import paths change, no logic changes
4. **High value** - Better organization, discoverability, maintainability
5. **Complete refactoring** - Logical conclusion to the service layer refactoring

**Next Steps:**
1. Move files to subdirectories
2. Update imports in stores
3. Update imports in components
4. Update imports in services
5. Update imports in tests (if any)
6. Verify application still works
7. Update documentation

**Priority:** Medium-High
- Not urgent (current structure works)
- But highly beneficial for long-term maintainability
- Natural conclusion to the refactoring effort

## Conclusion

All existing root-level services have clear, distinct responsibilities that align well with the new subdirectory structure. Moving them will:

- ✅ Improve architectural consistency
- ✅ Enhance discoverability and navigation
- ✅ Maintain clear concern separation
- ✅ Complete the service layer refactoring
- ✅ Provide a solid foundation for future development

**Recommendation:** Proceed with the migration.
