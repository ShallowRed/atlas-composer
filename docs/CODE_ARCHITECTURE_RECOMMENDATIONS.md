# Code Architecture Recommendations

## Analysis Date: October 10, 2025

This document provides architectural recommendations after analyzing the core state management and rendering logic in Atlas Composer.

---

## 📊 Overview

After analyzing `geoData.ts`, `config.ts`, and `MapRenderer.vue`, several patterns emerged that could be improved for better separation of concerns, testability, and maintainability.

## 🎯 Key Findings

### 1. **Store Responsibilities Are Well-Defined** ✅

**What's Good:**
- `config.ts` handles UI state and user preferences (projections, view modes, scales)
- `geoData.ts` handles data loading and territory filtering
- Clear separation between configuration and data

**What Could Be Better:**
- Some business logic leaks into stores that should be in services
- Computed properties doing complex calculations
- Initialization logic scattered across multiple methods

---

## 🔍 Detailed Analysis

### File: `config.ts` (Config Store)

#### Issues Identified

##### 1. **Pattern Detection Logic in Store**

**Current Code:**
```typescript
const isSingleFocusPattern = configStore.currentAtlasConfig.pattern === 'single-focus'
```

**Issue:** Pattern-specific behavior checks are scattered throughout the codebase.

**Recommendation:** Create a Pattern Strategy service
```typescript
// src/services/atlas-pattern-service.ts
export class AtlasPatternService {
  constructor(private pattern: AtlasPattern) {}

  isSingleFocus(): boolean {
    return this.pattern === 'single-focus'
  }

  isEqualMembers(): boolean {
    return this.pattern === 'equal-members'
  }

  supportsSplitView(): boolean {
    return this.pattern === 'single-focus'
  }

  getDefaultViewMode(): ViewMode {
    return this.isSingleFocus() ? 'composite-custom' : 'unified'
  }

  // Encapsulate all pattern-specific behavior
}
```

##### 2. **Complex Initialization Logic**

**Current Code:**
```typescript
function initializeTerritoryProjections() {
  const all = atlasService.value.getAllTerritories()
  return calculateDefaultProjections(all, 'mercator')
}
const territoryProjections = ref<Record<string, string>>(initializeTerritoryProjections())
```

**Issue:**
- Initialization functions inline in store definition
- Called multiple times on atlas changes
- Mixes computed and imperative code

**Recommendation:** Extract to initialization service
```typescript
// src/services/territory-defaults-service.ts
export class TerritoryDefaultsService {
  constructor(private atlasService: AtlasService) {}

  initializeAll() {
    return {
      projections: this.initializeProjections(),
      translations: this.initializeTranslations(),
      scales: this.initializeScales(),
    }
  }

  initializeProjections(): Record<string, string> {
    const territories = this.atlasService.getAllTerritories()
    return calculateDefaultProjections(territories, 'mercator')
  }

  // ... other methods
}
```

##### 3. **Watch Logic Too Complex**

**Current Code:**
```typescript
watch(selectedAtlas, (newRegion) => {
  const config = getAtlasConfig(newRegion)

  // 50+ lines of state updates
  if (!config.supportedViewModes.includes(viewMode.value)) {
    viewMode.value = config.defaultViewMode
  }

  if (config.hasTerritorySelector) {
    if (config.defaultTerritoryMode) {
      territoryMode.value = config.defaultTerritoryMode
    }
    // ... more logic
  }

  // Reinitialize everything
  territoryProjections.value = initializeTerritoryProjections()
  // ... more updates
})
```

**Issue:**
- 50+ lines in a single watcher
- Imperative state synchronization
- Hard to test and maintain

**Recommendation:** Extract to coordinated action
```typescript
// In store
async function switchAtlas(newAtlasId: string) {
  selectedAtlas.value = newAtlasId

  // Delegate to service for complex orchestration
  const atlasCoordinator = new AtlasCoordinator(
    newAtlasId,
    getAtlasConfig(newAtlasId)
  )

  // Service returns complete state update
  const newState = atlasCoordinator.prepareAtlasState({
    currentViewMode: viewMode.value,
    currentTerritoryMode: territoryMode.value,
  })

  // Simple state assignments
  Object.assign(this, newState)
}

// Simple watcher just calls the action
watch(selectedAtlas, switchAtlas)
```

##### 4. **Projection Filtering Logic**

**Current Code:**
```typescript
const projectionGroups = computed(() => {
  const filteredProjections = projectionRegistry.filter({
    atlasId: selectedAtlas.value,
    viewMode: viewMode.value,
    excludeCategories: ['COMPOSITE'],
  })

  // Group projections by category
  const groups: { [key: string]: any[] } = {}

  filteredProjections.forEach((projection) => {
    const category = projection.category
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category]!.push({
      value: projection.id,
      label: projection.name,
      category: projection.category,
    })
  })

  return Object.keys(groups).map(category => ({
    category,
    options: groups[category],
  }))
})
```

**Issue:**
- Data transformation logic in computed property
- Should be in a service or utility

**Recommendation:** Move to projection service
```typescript
// src/services/projection-ui-service.ts
export class ProjectionUIService {
  constructor(private registry: ProjectionRegistry) {}

  getGroupedProjections(params: {
    atlasId: string
    viewMode: ViewMode
  }): ProjectionGroup[] {
    const filtered = this.registry.filter({
      atlasId: params.atlasId,
      viewMode: params.viewMode,
      excludeCategories: ['COMPOSITE'],
    })

    return this.groupByCategory(filtered)
  }

  private groupByCategory(projections: Projection[]): ProjectionGroup[] {
    // Grouping logic here
  }
}

// In store - just call service
const projectionGroups = computed(() =>
  projectionUIService.getGroupedProjections({
    atlasId: selectedAtlas.value,
    viewMode: viewMode.value,
  })
)
```

---

### File: `geoData.ts` (GeoData Store)

#### Issues Identified

##### 1. **Service Access Pattern Inconsistency**

**Current Code:**
```typescript
const service = (cartographer.value as any).geoDataService
```

**Issue:**
- Using `as any` to access private property
- Breaks encapsulation
- Type unsafe

**Recommendation:** Expose service through public API
```typescript
// In Cartographer class
class Cartographer {
  private geoDataService: GeoDataService

  // Add public getter
  get geoData(): GeoDataService {
    return this.geoDataService
  }
}

// In store - clean access
const service = cartographer.value.geoData
```

##### 2. **Pattern Detection in Data Loading**

**Current Code:**
```typescript
const isSingleFocusPattern = configStore.currentAtlasConfig.pattern === 'single-focus'

if (isSingleFocusPattern) {
  // Load primary and secondary separately
  const [mainland, overseas] = await Promise.all([
    service.getMainLandData(),
    service.getOverseasData(),
  ])

  mainlandData.value = mainland
  overseasTerritoriesData.value = overseas || []
}
else {
  // Equal-members pattern: load all territories as equal
  const allTerritoriesData = await service.getAllTerritories()

  // Transform to expected format
  const territories = allTerritoriesData.map((territoryData: any) => ({
    name: territoryData.territory.name,
    code: territoryData.territory.code,
    area: territoryData.territory.area,
    region: territoryData.territory.region || 'Unknown',
    data: {
      type: 'FeatureCollection' as const,
      features: [territoryData.feature],
    },
  }))

  mainlandData.value = null
  overseasTerritoriesData.value = territories
}
```

**Issue:**
- Pattern-specific loading logic in store
- Data transformation in store (should be in service)
- Conditional logic makes testing harder

**Recommendation:** Pattern-based data loader
```typescript
// src/services/territory-data-loader.ts
export interface TerritoryDataResult {
  primary: GeoJSON.FeatureCollection | null
  territories: Territory[]
}

export abstract class TerritoryDataLoader {
  constructor(protected geoDataService: GeoDataService) {}

  abstract load(): Promise<TerritoryDataResult>
}

export class SingleFocusLoader extends TerritoryDataLoader {
  async load(): Promise<TerritoryDataResult> {
    const [primary, secondary] = await Promise.all([
      this.geoDataService.getMainLandData(),
      this.geoDataService.getOverseasData(),
    ])

    return {
      primary,
      territories: secondary || [],
    }
  }
}

export class EqualMembersLoader extends TerritoryDataLoader {
  async load(): Promise<TerritoryDataResult> {
    const allTerritoriesData = await this.geoDataService.getAllTerritories()

    return {
      primary: null,
      territories: this.transformToTerritories(allTerritoriesData),
    }
  }

  private transformToTerritories(data: any[]): Territory[] {
    return data.map(td => ({
      name: td.territory.name,
      code: td.territory.code,
      area: td.territory.area,
      region: td.territory.region || 'Unknown',
      data: {
        type: 'FeatureCollection' as const,
        features: [td.feature],
      },
    }))
  }
}

// Factory
export class TerritoryDataLoaderFactory {
  static create(
    pattern: AtlasPattern,
    geoDataService: GeoDataService
  ): TerritoryDataLoader {
    switch (pattern) {
      case 'single-focus':
        return new SingleFocusLoader(geoDataService)
      case 'equal-members':
        return new EqualMembersLoader(geoDataService)
      default:
        throw new Error(`Unsupported pattern: ${pattern}`)
    }
  }
}

// In store - simple and clean
async function loadTerritoryData() {
  const loader = TerritoryDataLoaderFactory.create(
    configStore.currentAtlasConfig.pattern,
    cartographer.value.geoData
  )

  const result = await loader.load()
  mainlandData.value = result.primary
  overseasTerritoriesData.value = result.territories
}
```

##### 3. **Filtered Territories Logic**

**Current Code:**
```typescript
const filteredTerritories = computed(() => {
  const configStore = useConfigStore()
  const territories = overseasTerritoriesData.value

  if (!territories || territories.length === 0)
    return []

  const atlasConfig = configStore.currentAtlasConfig
  const atlasService = configStore.atlasService

  const hasTerritoryModes = atlasConfig.hasTerritorySelector

  if (!hasTerritoryModes) {
    return territories
  }

  const allTerritories = atlasService.getAllTerritories()
  const territoryModes = atlasService.getTerritoryModes()
  const allowedTerritories = getTerritoriesForMode(
    allTerritories,
    configStore.territoryMode,
    territoryModes,
  )
  const allowedCodes = allowedTerritories.map(t => t.code)

  return territories.filter(territory =>
    territory && territory.code && allowedCodes.includes(territory.code),
  )
})
```

**Issue:**
- Business logic in computed property
- Mixing concerns (filtering + mode resolution)
- Hard to test in isolation

**Recommendation:** Territory filter service
```typescript
// src/services/territory-filter-service.ts
export class TerritoryFilterService {
  constructor(
    private atlasService: AtlasService,
    private atlasConfig: AtlasConfig
  ) {}

  filter(
    territories: Territory[],
    mode: string
  ): Territory[] {
    if (!territories?.length) {
      return []
    }

    // No filtering if no modes defined
    if (!this.atlasConfig.hasTerritorySelector) {
      return territories
    }

    const allowedCodes = this.getAllowedCodes(mode)
    return territories.filter(t =>
      t?.code && allowedCodes.includes(t.code)
    )
  }

  private getAllowedCodes(mode: string): string[] {
    const allTerritories = this.atlasService.getAllTerritories()
    const modes = this.atlasService.getTerritoryModes()
    const allowed = getTerritoriesForMode(allTerritories, mode, modes)
    return allowed.map(t => t.code)
  }
}

// In store - simple delegation
const filterService = computed(() =>
  new TerritoryFilterService(
    configStore.atlasService,
    configStore.currentAtlasConfig
  )
)

const filteredTerritories = computed(() =>
  filterService.value.filter(
    overseasTerritoriesData.value,
    configStore.territoryMode
  )
)
```

---

### File: `MapRenderer.vue` (Component)

#### Issues Identified

##### 1. **Overlay Logic Belongs in Service**

**Current Code:**
```typescript
function applyOverlays(svg: SVGSVGElement) {
  const showBorders = configStore.showCompositionBorders
  const showLimits = configStore.showMapLimits

  if (!showBorders && !showLimits) {

  }

  // 100+ lines of DOM manipulation
  // Complex geometry calculations
  // Pattern-specific rendering
}
```

**Issue:**
- DOM manipulation in component (should be testable)
- Geometry calculations mixed with rendering
- Hard to test without mounting component

**Recommendation:** Extract to overlay service
```typescript
// src/services/map-overlay-service.ts
export class MapOverlayService {
  constructor(
    private configStore: ConfigStore,
    private cartographer: Cartographer
  ) {}

  applyOverlays(
    svg: SVGSVGElement,
    width: number,
    height: number
  ): void {
    if (!this.shouldShowOverlays()) {
      return
    }

    const overlayGroup = this.createOverlayGroup(svg)

    if (this.configStore.showCompositionBorders) {
      this.addCompositionBorders(overlayGroup, width, height)
    }

    if (this.configStore.showMapLimits) {
      this.addMapLimits(overlayGroup, svg)
    }

    this.cleanup(overlayGroup)
  }

  private shouldShowOverlays(): boolean {
    return this.configStore.showCompositionBorders
      || this.configStore.showMapLimits
  }

  private createOverlayGroup(svg: SVGSVGElement): SVGGElement {
    const group = document.createElementNS(svg.namespaceURI, 'g')
    group.setAttribute('class', 'map-overlays')
    group.setAttribute('pointer-events', 'none')
    svg.appendChild(group)
    return group
  }

  private addCompositionBorders(
    group: SVGGElement,
    width: number,
    height: number
  ): void {
    const renderer = this.getBorderRenderer()
    renderer.render(group, width, height)
  }

  private getBorderRenderer(): BorderRenderer {
    const viewMode = this.configStore.viewMode

    if (viewMode === 'composite-custom') {
      return new CustomCompositeBorderRenderer(
        this.cartographer.customComposite
      )
    }

    if (viewMode === 'composite-existing') {
      return new ExistingCompositeBorderRenderer(
        this.configStore.compositeProjection,
        this.configStore.selectedProjection
      )
    }

    throw new Error(`No border renderer for view mode: ${viewMode}`)
  }

  // ... other methods
}

// In component - simple delegation
async function renderMap() {
  // ... existing render logic

  const svg = mapContainer.value.querySelector('svg')
  if (svg instanceof SVGSVGElement) {
    const overlayService = new MapOverlayService(
      configStore,
      cartographer.value
    )
    overlayService.applyOverlays(svg, width, height)
  }
}
```

##### 2. **Render Logic Pattern Detection**

**Current Code:**
```typescript
async function renderComposite(): Promise<Plot.Plot> {
  // ... setup

  // Determine rendering mode
  const mode = configStore.viewMode === 'composite-custom'
    ? 'composite-custom'
    : 'composite-projection'

  // Get territory codes
  const territoryCodes = configStore.viewMode === 'composite-existing'
    ? undefined
    : geoDataStore.filteredTerritories.map(t => t.code)

  // ... render
}
```

**Issue:**
- View mode checks scattered in render logic
- Conditional logic makes code harder to follow

**Recommendation:** Render strategy pattern
```typescript
// src/services/render-strategy.ts
export abstract class RenderStrategy {
  abstract render(
    cartographer: Cartographer,
    width: number,
    height: number,
    options: RenderContext
  ): Promise<Plot.Plot>
}

export class SimpleRenderStrategy extends RenderStrategy {
  async render(
    cartographer: Cartographer,
    width: number,
    height: number,
    options: RenderContext
  ): Promise<Plot.Plot> {
    return cartographer.render({
      mode: 'simple',
      geoData: options.geoData,
      projection: options.projection,
      width,
      height,
      // ... other options
    })
  }
}

export class CompositeCustomRenderStrategy extends RenderStrategy {
  async render(
    cartographer: Cartographer,
    width: number,
    height: number,
    options: RenderContext
  ): Promise<Plot.Plot> {
    return cartographer.render({
      mode: 'composite-custom',
      territoryCodes: options.filteredTerritories.map(t => t.code),
      // ... other options
    })
  }
}

export class CompositeExistingRenderStrategy extends RenderStrategy {
  async render(
    cartographer: Cartographer,
    width: number,
    height: number,
    options: RenderContext
  ): Promise<Plot.Plot> {
    return cartographer.render({
      mode: 'composite-projection',
      territoryCodes: undefined, // Composite handles all
      // ... other options
    })
  }
}

// Factory
export class RenderStrategyFactory {
  static create(
    mode: string,
    viewMode: ViewMode
  ): RenderStrategy {
    if (mode === 'composite') {
      if (viewMode === 'composite-custom') {
        return new CompositeCustomRenderStrategy()
      }
      return new CompositeExistingRenderStrategy()
    }
    return new SimpleRenderStrategy()
  }
}

// In component - clean and simple
async function renderMap() {
  const strategy = RenderStrategyFactory.create(
    props.mode,
    configStore.viewMode
  )

  const plot = await strategy.render(
    cartographer.value,
    width,
    height,
    {
      geoData: props.geoData,
      projection: props.projection ?? configStore.selectedProjection,
      filteredTerritories: geoDataStore.filteredTerritories,
      // ... other context
    }
  )

  mapContainer.value.appendChild(plot)
}
```

##### 3. **Size Calculation Logic**

**Current Code:**
```typescript
const computedSize = computed(() => {
  // For composite maps, use fixed larger dimensions
  if (props.mode === 'composite') {
    return { width: 800, height: 600 }
  }

  // Si des dimensions sont explicitement fournies, les utiliser
  if (props.width && props.height && !props.preserveScale) {
    return { width: props.width, height: props.height }
  }

  // Pour la France métropolitaine, utiliser des dimensions fixes
  if (props.isMainland) {
    return { width: 500, height: 400 }
  }

  // Pour les territoires avec préservation d'échelle
  if (props.preserveScale && props.area) {
    // Complex calculation
    const franceMetropoleArea = 550000
    const scaleFactor = Math.sqrt(props.area / franceMetropoleArea)
    // ... more logic
  }

  // Dimensions par défaut
  return { width: props.width, height: props.height }
})
```

**Issue:**
- Business logic in computed property
- Hard-coded reference values (France-specific)
- Complex branching logic

**Recommendation:** Size calculator service
```typescript
// src/services/map-size-calculator.ts
export interface SizeCalculatorParams {
  mode: 'simple' | 'composite'
  width?: number
  height?: number
  preserveScale?: boolean
  isPrimary?: boolean
  area?: number
  referenceArea?: number // Make configurable
}

export class MapSizeCalculator {
  private static COMPOSITE_SIZE = { width: 800, height: 600 }
  private static PRIMARY_SIZE = { width: 500, height: 400 }
  private static DEFAULT_REFERENCE_AREA = 550000 // km² (can be configured)

  calculate(params: SizeCalculatorParams): { width: number, height: number } {
    if (params.mode === 'composite') {
      return MapSizeCalculator.COMPOSITE_SIZE
    }

    if (this.hasExplicitSize(params)) {
      return { width: params.width!, height: params.height! }
    }

    if (params.isPrimary) {
      return MapSizeCalculator.PRIMARY_SIZE
    }

    if (params.preserveScale && params.area) {
      return this.calculateProportionalSize(params)
    }

    return this.getDefaultSize(params)
  }

  private hasExplicitSize(params: SizeCalculatorParams): boolean {
    return !!params.width && !!params.height && !params.preserveScale
  }

  private calculateProportionalSize(params: SizeCalculatorParams) {
    const referenceArea = params.referenceArea
      ?? MapSizeCalculator.DEFAULT_REFERENCE_AREA
    const scaleFactor = Math.sqrt(params.area! / referenceArea)

    const baseSize = MapSizeCalculator.PRIMARY_SIZE
    const width = Math.max(50, Math.min(300, baseSize.width * scaleFactor))
    const height = Math.max(40, Math.min(240, baseSize.height * scaleFactor))

    return {
      width: Math.round(width),
      height: Math.round(height),
    }
  }

  private getDefaultSize(params: SizeCalculatorParams) {
    return {
      width: params.width ?? 200,
      height: params.height ?? 160,
    }
  }
}

// In component - simple delegation
const sizeCalculator = new MapSizeCalculator()

const computedSize = computed(() =>
  sizeCalculator.calculate({
    mode: props.mode,
    width: props.width,
    height: props.height,
    preserveScale: props.preserveScale,
    isPrimary: props.isMainland,
    area: props.area,
  })
)
```

---

## 📋 Priority Recommendations

### High Priority (Do Now)

1. **Extract Pattern Logic** - Create `AtlasPatternService` to centralize pattern detection
2. **Fix Cartographer Encapsulation** - Add public getter for `geoDataService`
3. **Extract Overlay Service** - Move DOM manipulation out of component
4. **Territory Data Loader** - Strategy pattern for loading based on atlas pattern

### Medium Priority (Do Soon)

5. **Projection UI Service** - Move projection grouping logic out of store
6. **Territory Filter Service** - Extract filtering logic for testability
7. **Size Calculator Service** - Make sizing logic reusable and configurable
8. **Atlas Coordinator** - Orchestrate complex atlas switching

### Low Priority (Nice to Have)

9. **Render Strategy Pattern** - Clean up render mode branching
10. **Territory Defaults Service** - Centralize initialization logic

---

## 🎯 Benefits Summary

After implementing these recommendations:

### Testability ✅
- Services can be unit tested without Vue components
- Mock dependencies easily
- Isolated business logic

### Maintainability ✅
- Single responsibility principle
- Clear separation of concerns
- Easier to locate and fix bugs

### Extensibility ✅
- New patterns/strategies easy to add
- Polymorphism instead of conditionals
- Open/closed principle

### Type Safety ✅
- No more `as any` casts
- Better IDE support
- Compile-time error detection

### Performance ✅
- Lazy loading services
- Reusable instances
- Less reactive overhead in stores

---

## 🏗️ Implementation Strategy

### Phase 1: Foundation (Week 1)
1. Create service directory structure
2. Extract `AtlasPatternService`
3. Extract `MapOverlayService`
4. Fix Cartographer encapsulation

### Phase 2: Data Layer (Week 2)
5. Create `TerritoryDataLoader` hierarchy
6. Create `TerritoryFilterService`
7. Update stores to use services

### Phase 3: UI Layer (Week 3)
8. Extract `ProjectionUIService`
9. Extract `MapSizeCalculator`
10. Update components

### Phase 4: Orchestration (Week 4)
11. Create `AtlasCoordinator`
12. Simplify store watchers
13. Add comprehensive tests

---

## 📚 Example Service Structure

```
src/services/
├── atlas/
│   ├── atlas-pattern-service.ts
│   ├── atlas-coordinator.ts
│   └── territory-defaults-service.ts
├── data/
│   ├── territory-data-loader.ts
│   ├── territory-filter-service.ts
│   └── geo-data-service.ts (existing)
├── rendering/
│   ├── map-overlay-service.ts
│   ├── map-size-calculator.ts
│   ├── render-strategy.ts
│   └── cartographer-service.ts (existing)
├── projection/
│   ├── projection-ui-service.ts
│   └── projection-service.ts (existing)
└── composite/
    └── composite-projection.ts (existing)
```

---

## 💡 Key Principles Applied

1. **Single Responsibility Principle** - Each service has one clear purpose
2. **Dependency Inversion** - Depend on abstractions, not concretions
3. **Strategy Pattern** - Encapsulate algorithms (loaders, renderers)
4. **Factory Pattern** - Create objects based on context
5. **Facade Pattern** - Simplify complex subsystems (coordinators)

---

## 🔗 Related Documentation

- [Atlas Pattern Refactoring Plan](./ATLAS_PATTERN_REFACTORING_PLAN.md)
- [Rendering Refactor Proposal](./RENDERING_REFACTOR_PROPOSAL.md) (if exists)
- [Service Layer Best Practices](./SERVICE_LAYER_GUIDE.md) (to be created)

---

## ✅ Acceptance Criteria

- [ ] No `as any` casts in store code
- [ ] No business logic in Vue computed properties
- [ ] Services are unit testable without Vue
- [ ] Stores are < 200 lines each
- [ ] Components delegate to services for complex operations
- [ ] Pattern detection centralized in one place
- [ ] 80%+ test coverage on services

---

**Review Status:** ⏳ Pending Review
**Estimated Effort:** 2-4 weeks (depending on team size)
**Risk Level:** Low (incremental refactoring, backward compatible)
