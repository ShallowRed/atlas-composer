# Rendering Logic Refactoring Proposal

## Current Problems

### 1. **Scattered Responsibilities**
```
MapRenderer.vue → decides when to render
    ↓
geoDataStore → prepares settings and delegates
    ↓
Cartographer → actually renders
```

### 2. **Unclear Ownership**
- **MapRenderer.vue**: Has rendering logic for both simple AND composite modes
- **geoDataStore**: Contains rendering methods (`renderProjectionComposite`, `renderCustomComposite`)
- **Cartographer**: Also has rendering methods with the same names
- **Result**: Three layers doing similar things!

### 3. **Data Flow Issues**
- MapRenderer watches config changes → calls geoDataStore methods
- geoDataStore synchronizes state with Cartographer
- Cartographer doesn't know about Vue's reactivity
- Settings are passed through multiple layers

### 4. **Tight Coupling**
- MapRenderer imports both stores (config + geoData)
- geoDataStore accesses private internals of Cartographer: `(cartographer.value as any).geoDataService`
- Cartographer creates its own service instances

## Proposed Architecture

### **Single Responsibility Principle**

```
┌─────────────────────────────────────────────────────┐
│                  MapRenderer.vue                     │
│  - Receives props (data, projection, dimensions)    │
│  - Renders simple maps directly                     │
│  - For composite: delegates to Cartographer         │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│                   Cartographer                       │
│  - Single entry point for rendering                 │
│  - Owns all rendering logic (simple + composite)    │
│  - Manages projection services                      │
│  - Creates Observable Plot instances                │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│                   geoDataStore                       │
│  - ONLY manages data loading and caching           │
│  - Provides territory data                          │
│  - NO rendering logic                               │
└─────────────────────────────────────────────────────┘
```

## Detailed Refactoring Plan

### Phase 1: Consolidate Rendering in Cartographer

**Move ALL rendering logic to Cartographer:**

```typescript
// src/cartographer/Cartographer.ts
export class Cartographer {
  // Existing services
  private projectionService: GeoProjectionService
  private geoDataService: GeoDataService
  private customComposite: CustomCompositeProjection
  
  // NEW: Unified rendering interface
  async render(options: RenderOptions): Promise<HTMLElement> {
    switch (options.mode) {
      case 'simple':
        return this.renderSimple(options)
      case 'composite-custom':
        return this.renderCustomComposite(options)
      case 'composite-projection':
        return this.renderProjectionComposite(options)
      default:
        throw new Error(`Unknown render mode: ${options.mode}`)
    }
  }
  
  private async renderSimple(options: SimpleRenderOptions): Promise<HTMLElement> {
    // Simple single-territory rendering
    const { geoData, projection, width, height, inset } = options
    
    const proj = this.projectionService.getProjection(projection, geoData)
    
    return Plot.plot({
      width,
      height,
      inset,
      projection: proj,
      marks: [
        Plot.geo(geoData, {
          fill: getTerritoryFillColor(),
          stroke: getTerritoryStrokeColor(),
        }),
      ],
    })
  }
  
  private async renderCustomComposite(options: CompositeRenderOptions): Promise<HTMLElement> {
    // Custom composite with per-territory projections
    const { territoryMode, width, height, settings } = options
    
    // Apply settings to custom composite
    this.applyCustomCompositeSettings(settings)
    
    const rawData = await this.geoDataService.getRawUnifiedData(territoryMode)
    
    return Plot.plot({
      width,
      height,
      inset: 20,
      projection: ({ width, height }) => {
        return this.customComposite.build(width, height, true)
      },
      marks: [
        Plot.geo(rawData, {
          fill: (d: any) => getTerritoryFillColor(d.properties?.code),
          stroke: getTerritoryStrokeColor(),
        }),
      ],
    })
  }
  
  private async renderProjectionComposite(options: CompositeRenderOptions): Promise<HTMLElement> {
    // Projection-based composite (albers-france, etc.)
    const { territoryMode, projection, width, height } = options
    
    const rawData = await this.geoDataService.getRawUnifiedData(territoryMode)
    const proj = this.projectionService.getProjection(projection, rawData)
    
    return Plot.plot({
      width,
      height,
      inset: 20,
      projection: proj,
      marks: [
        Plot.geo(rawData, {
          fill: (d: any) => getTerritoryFillColor(d.properties?.code),
          stroke: getTerritoryStrokeColor(),
        }),
      ],
    })
  }
  
  private applyCustomCompositeSettings(settings: CustomCompositeSettings): void {
    // Update projections
    Object.entries(settings.territoryProjections).forEach(([code, projectionType]) => {
      this.customComposite.updateTerritoryProjection(code, projectionType)
    })
    
    // Update translations
    Object.entries(settings.territoryTranslations).forEach(([code, translation]) => {
      this.customComposite.updateTranslationOffset(code, [translation.x, translation.y])
    })
    
    // Update scales
    Object.entries(settings.territoryScales).forEach(([code, scale]) => {
      this.customComposite.updateScale(code, scale)
    })
  }
}

// Types
export interface RenderOptions {
  mode: 'simple' | 'composite-custom' | 'composite-projection'
}

export interface SimpleRenderOptions extends RenderOptions {
  mode: 'simple'
  geoData: GeoJSON.FeatureCollection
  projection: string
  width: number
  height: number
  inset: number
  isMetropolitan?: boolean
}

export interface CompositeRenderOptions extends RenderOptions {
  mode: 'composite-custom' | 'composite-projection'
  territoryMode: string
  projection: string
  width: number
  height: number
  settings?: CustomCompositeSettings
}

export interface CustomCompositeSettings {
  territoryProjections: Record<string, string>
  territoryTranslations: Record<string, { x: number, y: number }>
  territoryScales: Record<string, number>
}
```

### Phase 2: Simplify geoDataStore

**Remove rendering logic, keep ONLY data management:**

```typescript
// src/stores/geoData.ts
export const useGeoDataStore = defineStore('geoData', () => {
  // Services
  const geoDataService = ref<RealGeoDataService | null>(null)
  
  // State - ONLY DATA
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const metropolitanFranceData = ref<GeoJSON.FeatureCollection | null>(null)
  const domtomTerritoriesData = ref<Territory[]>([])
  
  // Computed - ONLY DATA TRANSFORMATIONS
  const filteredTerritories = computed(() => {
    // ... existing logic
  })
  
  const territoryGroups = computed(() => {
    // ... existing logic
  })
  
  // Actions - ONLY DATA LOADING
  const initialize = async () => {
    geoDataService.value = new RealGeoDataService()
    await geoDataService.value.loadData()
  }
  
  const loadTerritoryData = async () => {
    // Load data from service
    const [metroData, domtomData] = await Promise.all([
      geoDataService.value!.getMetropoleData(),
      geoDataService.value!.getDOMTOMData(),
    ])
    
    metropolitanFranceData.value = metroData
    domtomTerritoriesData.value = domtomData || []
  }
  
  // NO MORE RENDERING METHODS!
  
  return {
    // State
    isLoading,
    error,
    metropolitanFranceData,
    domtomTerritoriesData,
    
    // Computed
    filteredTerritories,
    territoryGroups,
    
    // Actions
    initialize,
    loadTerritoryData,
  }
})
```

### Phase 3: Simplify MapRenderer

**MapRenderer becomes a thin wrapper:**

```vue
<!-- src/components/MapRenderer.vue -->
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Cartographer } from '@/cartographer/Cartographer'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

interface Props {
  geoData?: GeoJSON.FeatureCollection | null
  title?: string
  area?: number
  mode?: 'simple' | 'composite'
  projection?: string
  width?: number
  height?: number
  isMetropolitan?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'simple',
  width: 200,
  height: 160,
})

const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()
const mapContainer = ref<HTMLElement>()
const cartographer = new Cartographer() // One instance per component
const isLoading = ref(false)
const error = ref<string | null>(null)

async function renderMap() {
  if (!mapContainer.value) return
  
  try {
    isLoading.value = true
    error.value = null
    mapContainer.value.innerHTML = ''
    
    let plot: HTMLElement
    
    if (props.mode === 'simple') {
      // Simple mode: single territory
      plot = await cartographer.render({
        mode: 'simple',
        geoData: props.geoData!,
        projection: props.projection || configStore.selectedProjection,
        width: props.width,
        height: props.height,
        inset: props.isMetropolitan ? 20 : 5,
        isMetropolitan: props.isMetropolitan,
      })
    } else {
      // Composite mode: multiple territories
      const mode = configStore.viewMode === 'composite-custom' 
        ? 'composite-custom' 
        : 'composite-projection'
      
      plot = await cartographer.render({
        mode,
        territoryMode: configStore.territoryMode,
        projection: configStore.selectedProjection,
        width: 800,
        height: 600,
        settings: configStore.viewMode === 'composite-custom' ? {
          territoryProjections: configStore.territoryProjections,
          territoryTranslations: configStore.territoryTranslations,
          territoryScales: configStore.territoryScales,
        } : undefined,
      })
    }
    
    mapContainer.value.appendChild(plot)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Rendering error'
    console.error('MapRenderer error:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => renderMap())
watch(() => [props.geoData, props.projection, configStore.selectedProjection], renderMap)
</script>
```

## Benefits

### 1. **Clear Separation of Concerns**
- **Cartographer**: Rendering expert
- **geoDataStore**: Data provider
- **MapRenderer**: View layer coordinator

### 2. **Easier Testing**
```typescript
// Test Cartographer in isolation
const cartographer = new Cartographer()
const plot = await cartographer.render({
  mode: 'simple',
  geoData: mockData,
  projection: 'mercator',
  width: 200,
  height: 200,
  inset: 5,
})
expect(plot).toBeInstanceOf(HTMLElement)
```

### 3. **Better Type Safety**
- Explicit `RenderOptions` types
- No more `any` casts to access private properties
- Clear contracts between layers

### 4. **Reusability**
- Cartographer can be used outside Vue
- Services can be swapped/mocked easily
- No hidden dependencies on stores

### 5. **Maintainability**
- One place to look for rendering logic
- One place to look for data loading
- Clear data flow: Props → Cartographer → Plot

## Migration Strategy

### Step 1: Create new Cartographer API (non-breaking)
- Add new `render()` method
- Keep old methods for backward compatibility

### Step 2: Update MapRenderer to use new API
- Simplify rendering logic
- Remove store rendering calls

### Step 3: Clean up geoDataStore
- Remove rendering methods
- Mark as deprecated first

### Step 4: Remove old Cartographer methods
- After all components updated
- Remove deprecated methods

## Timeline Estimate
- **Phase 1**: 2-3 hours
- **Phase 2**: 1 hour  
- **Phase 3**: 1-2 hours
- **Testing**: 1 hour
- **Total**: ~5-7 hours
