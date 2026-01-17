# Vue Architecture

## Overview

Vue 3 Composition API with TypeScript, Pinia stores, and composable-based logic.

**Stack**: Vue 3, TypeScript, Pinia, Vue Router, Vue I18n, Tailwind CSS, DaisyUI
**Tests**: 440 passing (Vitest + @vue/test-utils)

## Project Structure

```
src/
├── views/                    # Page components (MapView, AboutView)
├── components/
│   ├── MapRenderer.vue       # D3 map rendering
│   ├── configuration/        # View-mode controls (4 components)
│   └── ui/                   # 28 reusable UI components
│       ├── layout/           # Layout structure
│       ├── primitives/       # Core UI elements
│       ├── forms/            # Form controls
│       ├── projections/      # Projection components
│       ├── parameters/       # Parameter controls
│       └── ...               # presets, import, export, settings
├── composables/              # 16 composition functions
├── stores/                   # 4 Pinia stores
└── types/                    # TypeScript definitions
```

## Component Hierarchy

```
App.vue
├── AppHeader (navigation, language, theme)
├── RouterView
│   └── MapView (main coordinator)
│       ├── MapRenderer (D3 rendering)
│       └── View-Mode Controls (conditional)
└── AppFooter
```

## Key Components

| Component | Role |
|-----------|------|
| **MapView** | Main coordinator, delegates to composables |
| **MapRenderer** | D3 rendering, interactive features (panning, dragging, clip extent editing) |
| **SplitView** | Renders territories in separate projections |

## View-Mode Control Components (src/components/configuration/)

| Component | View Mode | Key Features |
|-----------|-----------|--------------|
| **CompositeCustomControls** | composite-custom | PresetSelector, ImportControls, GlobalProjectionControls, territory accordion with per-territory controls |
| **UnifiedControls** | unified | ViewPresetSelector, global projection, fitting mode |
| **SplitControls** | split | ViewPresetSelector, territory accordion (no positioning) |
| **BuiltInCompositeControls** | built-in-composite | Pre-built d3-composite-projections |

## UI Components (30 components, 8 subdirectories)

**Layout**: AppHeader, AppFooter, MainLayout, ScrollableContent

**Primitives**: AccordionItem, Alert, ButtonGroup, CardContainer, LabelWithIcon, Modal

**Forms**: CheckboxControl, RangeSlider, DropdownControl (full a11y, keyboard nav), ToggleControl

**Settings**: LanguageSelector, ThemeSelector, ShareButton

**Projections**: ProjectionDropdown (with recommendation badges), ProjectionInfo, ProjectionParamsControls

**Parameters**: GlobalProjectionControls, TerritoryParameterControls, TerritorySetManager
**Import/Export**: ImportControls, ImportModal, CompositeExportDialog, ToastNotification

**Presets**: PresetSelector (async loading, validation, application)

## Composables (16 functions)

| Composable | Purpose |
|------------|---------|
| **useAtlasLoader** | Async atlas config loading via VueUse's useAsyncState |
| **useAtlasData** | Atlas initialization and data reloading orchestration |
| **useLoadingState** | Legacy loading state (largely superseded by appStore) |
| **useAtlasConfig** | Centralized atlas configuration access |
| **useParameterProvider** | Parameter provider adapter for services |
| **useCollectionSet** | Territory collection set validation |
| **useProjectionConfig** | Projection configuration helpers |
| **useViewMode** | View mode options |
| **useTerritoryConfig** | Territory configuration state |
| **useTerritoryTransforms** | Facade aggregating territory data, commands, reset, visibility |
| **useTerritoryParameters** | Territory-specific parameter management |
| **useViewState** | View mode flags, visibility conditions |
| **useProjectionRecommendations** | Badge system for projection recommendations |
| **useTerritoryCursor** | Territory drag-to-move with D3 integration |
| **useClipExtentEditor** | Interactive clip extent corner editing |
| **useProjectionPanning** | Map panning for azimuthal/cylindrical projections |
| **useMapWatchers** | Reactive map update watchers |
| **useUrlState** | URL state serialization for shareable links |
| **useProjectionValidation** | Projection selection validation |

## Pinia Stores (7 stores)

| Store | Domain | Key State |
|-------|--------|-----------|
| **appStore** | Lifecycle state machine | state (idle/loading/ready/error), isFirstLoad, showSkeleton |
| **atlasStore** | Atlas selection | selectedAtlasId, atlasService, currentAtlasConfig |
| **projectionStore** | Projection config | projectionId, projectionParams, fittingMode, referenceScale |
| **viewStore** | View mode | viewMode, territoryMode, activeTerritories |
| **parameterStore** | Territory parameters | atlasParameters, globalParameters, territoryParameters |
| **geoDataStore** | Geographic data | territories, filteredTerritories, renderVersion |
| **uiStore** | UI preferences | theme, showGraticule, showCompositionBorders |

## Data Flow

```
User Action → v-model/Event → Composable → Store Action → State Change → Watcher (useAtlasData) → Service → Store Update → Re-render
```

## Parameter Registry Integration

**Flow**: Parameter Edit → parameterStore.setTerritoryParameter() (validates via registry) → MapRenderer watcher → CompositeProjection.updateTerritoryParameters() → renderMap()

**Provider Pattern**: geoDataStore creates adapter connecting parameterStore to Cartographer with registry-based resolution for parameter inheritance (territory > global > atlas > registry defaults).

## Type Safety

**Prop Types** (vue-props.ts): MapRendererProps, ViewComponentProps, TerritoryControlsProps, ProjectionSelectorProps, DisplayOptionsSectionProps

**Composable Types** (composables.ts): LoadingState, ProjectionConfig, TerritoryConfig, ViewModeConfig, TerritoryTransforms, AtlasData, ProjectionFiltering

All types exported from `src/types/index.ts`.

## Testing

**Framework**: Vitest + @vue/test-utils (440 tests passing, 18 skipped)

| Domain | Tests | Coverage |
|--------|-------|----------|
| Territory Services | 31 | TerritoryVisibilityService, TerritoryResetService, TerritoryDataService |
| Export Services | 9 | Composite export |
| Projection Services | 19 | Projection logic |
| View Orchestration | 61 | UI visibility logic |
| UI Components | 42 | DropdownControl |
| Share Functionality | 9 | ShareButton |

**Skipped tests**: Component tests requiring full atlas loading need refactoring for DI.

**Test utilities**: `src/__tests__/test-utils.ts` - i18n mocking, store mocking, withSetup() helper.

## Patterns

### Composable Composition Pattern

**Pattern**: Build complex composables from focused, single-responsibility sub-composables.

**Example** (useTerritoryTransforms refactoring):
```typescript
// Facade composable delegates to focused composables
export function useTerritoryTransforms() {
  const territoryData = useTerritoryData()       // Read-only data
  const territoryCommands = useTerritoryCommands() // Write operations
  const territoryReset = useTerritoryReset()     // Reset orchestration
  const territoryVisibility = useTerritoryVisibility() // Visibility rules
  return { /* aggregate all functionality */ }
}

// Service: Pure business logic (fully testable)
export class TerritoryVisibilityService {
  static shouldShowEmptyState(params: {...}): boolean { /* ... */ }
}
```

**Metrics**: Lines 326 → 84 (74% reduction), 0 → 31 unit tests

**When to Use**: Composable >150 lines, multiple responsibilities, 3+ store dependencies

### Core Patterns
- `<script setup lang="ts">` for all components
- Props: `defineProps<Type>()`, Events: `defineEmits<Type>()`
- Global state: Pinia stores, Local: component refs, Derived: computed
- Feature-based grouping, co-located tests, centralized types
- Templates under 100 lines

### Code Organization
- Feature-based grouping (composables/, stores/, components/ui/)
- Co-located tests (__tests__ folders)
- Centralized types (src/types/)
- Average component size: 70 lines

## Performance

**Optimizations**: Centralized watchers in useAtlasData.setupWatchers(), loading state with withMinLoadingTime(), shallow component hierarchy

**Opportunities**: Virtual scrolling for large territory lists, v-memo for static content, lazy loading, shallowRef for GeoJSON

## Integration Points

- **Services**: Component → Store → Watcher (useAtlasData) → Service → Store → Re-render
- **D3/Plot**: MapRenderer.vue owns D3, CartographerService coordinates rendering
- **I18n**: Vue I18n plugin, useI18n() composable, locales in src/i18n/locales/

## Conditional Rendering

**Pattern**: Extract complex conditionals into computed properties

```vue
<!-- Before: inline --> <CardContainer v-show="viewStore.viewMode === 'unified' || ...">
<!-- After: semantic --> <CardContainer v-show="shouldShowRightSidebar">
```

**viewStore**: Provides show* computed properties via ProjectionUIService
**useViewState**: Provides view mode flags (isCompositeMode, etc.) and compound conditions

## Territory Customization (Custom Composite Mode)

Custom composite mode allows selecting which territories to include. Territory set managed via viewStore.activeTerritoryCodes (Set<string>).

**Flow**:
1. **Init**: Preset loaded → viewStore.setActiveTerritories(codes)
2. **Display**: geoDataStore.filteredTerritories filters by activeTerritoryCodes
3. **Add/Remove**: TerritorySetManager calls viewStore.addTerritoryToComposite() → triggerRender()
4. **Reset**: Restores preset territory codes and parameters

**Components**: TerritorySetManager (selection UI), TerritoriesControl (reset button, accordion), CompositeCustomControls (top-level)

**Design Decisions**:
- Set<string> for O(1) membership checking
- Filter at display level to avoid reloading data
- Limit to preset territories (adding arbitrary territories requires CompositeProjection rebuild)
- Always show mainland for context
- New Set for reactivity (Vue 3 requires new object references)

## Related Documentation

- [architecture.md](architecture.md) - Overall architecture
- [services.md](services.md) - Service layer
- [atlases.md](atlases.md) - Atlas configuration
- [projections.md](projections.md) - Projection system
