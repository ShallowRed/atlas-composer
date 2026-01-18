# Service Layer Architecture

## Overview
Business logic extracted from Vue components and Pinia stores.
Organized by concern: atlas/, data/, projection/, rendering/, export/.

## Service Patterns

| Pattern | When to Use | Examples |
|---------|------------|----------|
| **Instance** | Maintains state, caches data, domain objects | GeoDataService, CompositeProjection, Cartographer |
| **Static** | Pure transformations, orchestration, utilities | TerritoryFilterService, AtlasCoordinator, MapOverlayService |

## Atlas Services (src/services/atlas/)

| Service | Pattern | Purpose |
|---------|---------|---------|
| **AtlasCoordinator** | Static | Orchestrates atlas changes, loads presets, extracts territory parameters |
| **InitializationService** | Static | Centralized init logic: atlas startup, preset loading, view mode changes |
| **TerritoryDefaultsService** | Static | Calculates default territory projections, translations, scales |
| **PresetLoader** | Static | Loads/validates presets from configs/presets/, delegates to core validators |
| **AtlasMetadataService** | Static | Cached access to atlas projection metadata from preset files |
| **AtlasService** | Instance | Facade for territory data and configuration access |

**InitializationService Validation**: Validates BEFORE clearing data (fail-fast). All view modes require matching preset type.

## Territory Services (src/services/territory/)

| Service | Pattern | Purpose |
|---------|---------|---------|
| **TerritoryVisibilityService** | Static | Pure functions for visibility rules (shouldShowEmptyState, hasVisibleTerritories) |
| **TerritoryResetService** | Static | Calculates reset operations (preset values or fallback defaults) |
| **TerritoryDataService** | Instance | Aggregates territory data from stores (territories, translations, scales, projections) |

## Data Services (src/services/data/)

| Service | Pattern | Purpose |
|---------|---------|---------|
| **TerritoryDataLoader** | - | Loads territory data for rendering |
| **TerritoryFilterService** | Static | Filters/groups territories by display mode |
| **GeoDataService** | Instance | TopoJSON loading and caching |

## Projection Services (src/services/projection/)

| Service | Pattern | Purpose |
|---------|---------|---------|
| **ProjectionUIService** | Static | Projection grouping and UI visibility logic |
| **ProjectionService** | Instance | Projection creation using factory/registry pattern |

**Parameter Application by Family**:
- Azimuthal/Conic: Uses rotation for positioning
- Cylindrical: Uses rotation parameters
- Auto mode: D3's fitExtent calculates scale
- Manual mode: User controls scale and center

### Positioning Module (src/core/positioning/)

Canonical positioning format for projection-agnostic geographic focus storage.

```typescript
interface CanonicalPositioning {
  focusLongitude: number // -180 to 180
  focusLatitude: number // -90 to 90
  rotateGamma?: number // -180 to 180
}
```

**D3 Conversion**: CYLINDRICAL uses center, CONIC/AZIMUTHAL uses rotate.

### CompositeProjection

Instance-based composite projection with manual territory positioning.

**Key Methods**:
- `initialize()` / `build()` - Set up and build composite with clipExtent
- `updateTerritoryProjection()` - Change territory projection type
- `updateTerritoryParameters()` - Update parameters using canonical format
- `updateReferenceScale()` - Recalculate all territory scales
- `updateScale()` - Set territory scale multiplier
- `getCompositionBorders()` - Get border rectangles (uses clipExtent when available)
- `exportConfig()` - Export configuration as JSON

**Features**:
- ClipExtent: Pixel-based clipping `[x1, y1, x2, y2]` relative to territory position
- Scale sync: Reads scaleMultiplier from store, recalculates on reference scale changes
- Uses `@atlas-composer/projection-core` for stream multiplexing and inversion

## View Services (src/services/view/)

### ViewOrchestrationService (Static)

Centralized visibility and control state logic for all view modes.
Takes ViewState snapshot, returns boolean flags. 61 unit tests.

**Key Visibility Rules**:

| Method | True When |
|--------|-----------|
| `shouldShowRightSidebar` | Non-unified modes |
| `shouldShowProjectionParams` | unified, built-in-composite |
| `shouldShowTerritoryControls` | composite-custom, split |
| `shouldShowPresetSelector` | composite-custom + presets available |
| `shouldShowCompositeRenderer` | composite-custom, built-in-composite |
| `shouldShowSplitView` | split mode |
| `shouldShowUnifiedView` | unified mode |

**Usage**: Components use `useViewState` composable which wraps service methods in Vue computed refs.

## Parameter Management (src/services/parameters/)

### ParameterRegistry (src/core/parameters/)

Central registry for parameter definitions, metadata, and validation. Singleton.

**Features**:
- Complete metadata (displayName, description, unit, type)
- Projection family relevance (CYLINDRICAL, CONIC, AZIMUTHAL, COMPOSITE)
- Type-safe constraints with range validation
- Export control flags

### ProjectionParameterManager

Instance-based service for parameter state management with unified `ProjectionParameters` format.

**Key Methods**:
- `setAtlasParameters()` / `setGlobalParameter()` / `setTerritoryParameter()`
- `getEffectiveParameters()` - Resolves inheritance: territory > global > atlas > registry defaults
- `validateParameter()` - Registry-based validation
- Normalizes legacy `center`/`rotate` to canonical `focusLongitude`/`focusLatitude`

**Territory Configuration**: All stored as parameters in registry:
- `projectionId`, `translateOffset`, `scaleMultiplier`, `pixelClipExtent`

## Export/Import Services (src/services/export/)

| Service | Purpose |
|---------|---------|
| **CompositeExportService** | Serialize projection to JSON for export |
| **CompositeImportService** | Parse, validate, migrate, apply configurations |
| **ConfigMigrator** | Automatic version migration (v1.0 chain) |

**Export Format**: `{ version, metadata, territories[] }` where each territory has `projection.{id, family, parameters}` and `layout.{translateOffset, pixelClipExtent}`.

**Import Flow**: Parse JSON -> Check version -> Migrate if needed -> Validate -> Check atlas compatibility -> Apply to stores.

## Rendering Services (src/services/rendering/)

| Service | Purpose |
|---------|---------|
| **MapSizeCalculator** | Calculate map dimensions with padding |
| **D3MapRenderer** | Static D3 rendering for territories, sphere |
| **MapOverlayService** | Composition borders and map limits overlays |
| **GraticuleService** | Scale-adaptive graticule geometry |
| **GraticuleOverlayService** | SVG rendering for graticule lines |
| **CompositeSettingsBuilder** | Build composite settings from config |
| **MapRenderCoordinator** | Coordinate rendering and overlays |
| **CartographerService** | Main coordinator with unified render API |

**Graticule Levels**: Scale-adaptive density (30-90 degree steps based on projection scale).

### CartographerService

Main rendering coordinator with D3.js integration. Instance-based.

**Key Methods**:
- `renderSimple()` / `renderCustomComposite()` / `renderProjectionComposite()`
- `updateProjectionParams()` / `updateFittingMode()` / `updateTerritoryParameters()`
- `updateCanvasDimensions()` / `updateReferenceScale()`
- `lastProjection` getter - Enables overlay sharing with same projection instance

### CartographerFactory
Static factory with instance caching: `create()`, `getInstance()`.

## Design Patterns

| Pattern | Used By | Purpose |
|---------|---------|---------|
| **Static Methods** | Export/import services | Testability, functional style |
| **Instance-Based** | Cartographer, GeoDataService | Stateful operations, caching |
| **Strategy** | TerritoryDataLoader | View mode-based data loading |
| **Coordinator** | InitializationService, MapRenderCoordinator | Multi-step orchestration |
| **Facade** | AtlasService | Simplified API |
| **Factory** | CartographerFactory, ProjectionFactory | Instance creation |
- Easy to navigate and discover
- Reduced component complexity
