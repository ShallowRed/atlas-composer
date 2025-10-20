<script setup lang="ts">
import type * as Plot from '@observablehq/plot'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useClipExtentEditor } from '@/composables/useClipExtentEditor'
import { useMapWatchers } from '@/composables/useMapWatchers'
import { useProjectionPanning } from '@/composables/useProjectionPanning'
import { useTerritoryCursor } from '@/composables/useTerritoryCursor'
import { Cartographer } from '@/services/rendering/cartographer-service'
import { MapRenderCoordinator } from '@/services/rendering/map-render-coordinator'
import { MapSizeCalculator } from '@/services/rendering/map-size-calculator'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useUIStore } from '@/stores/ui'

interface Props {
  // For simple territory maps
  geoData?: GeoJSON.FeatureCollection | null
  title?: string
  area?: number
  region?: string
  isMainland?: boolean
  preserveScale?: boolean
  width?: number
  hLevel?: number
  height?: number
  projection?: string // Optional projection override for split/composite-custom mode
  territoryCode?: string // Territory code for parameter resolution in split mode
  fullHeight?: boolean
  // For composite maps
  mode?: 'simple' | 'composite'
}

const props = withDefaults(defineProps<Props>(), {
  geoData: null,
  isMainland: false,
  preserveScale: false,
  width: 200,
  height: 160,
  hLevel: 3,
  mode: 'simple',
  fullHeight: true,
})

const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()
const parameterStore = useParameterStore()
const uiStore = useUIStore()
const mapContainer = ref<HTMLElement>()

// Watch territory-specific parameter changes in split mode
// Watch the effective parameters which automatically trigger when territory params change
watch(
  () => props.territoryCode ? parameterStore.getEffectiveParameters(props.territoryCode) : null,
  () => {
    if (props.territoryCode) {
      debouncedRenderMap()
    }
  },
  { deep: true },
)

const isLoading = ref(false)
const error = ref<string | null>(null)
const isMounted = ref(false)
const isRendering = ref(false)
const pendingRender = ref(false)
let renderDebounceTimer: ReturnType<typeof setTimeout> | null = null

// Use cartographer from store
const cartographer = computed(() => geoDataStore.cartographer)

// Projection panning composable for interactive rotation via mouse drag
const {
  handleMouseDown: handlePanMouseDown,
  cursorStyle: panningCursorStyle,
  cleanup: cleanupProjectionPanning,
} = useProjectionPanning(props.projection)

// Territory cursor composable for drag-to-move functionality
const {
  isDragEnabled,
  isDragging: _isDragging,
  dragTerritoryCode: _dragTerritoryCode,
  hoveredTerritoryCode,
  isTerritoryDraggable: _isTerritoryDraggable,
  getCursorStyle: getTerritoryyCursorStyle,
  handleTerritoryMouseDown,
  handleTerritoryMouseEnter,
  handleTerritoryMouseLeave,
  createBorderZoneOverlays,
  cleanup: cleanupTerritoryCursor,
} = useTerritoryCursor()

// Clip extent editor composable for interactive corner dragging
const {
  renderClipExtentHandles,
  toggleTerritorySelection,
  cleanup: cleanupClipExtentEditor,
} = useClipExtentEditor()

// Get current cursor style based on territory dragging and projection panning
const cursorStyle = computed(() => {
  // Territory dragging takes absolute precedence
  if (isDragEnabled.value && hoveredTerritoryCode.value) {
    return getTerritoryyCursorStyle(hoveredTerritoryCode.value)
  }

  // Fallback to projection panning cursor
  return panningCursorStyle.value
})

// Map watchers composable for all watch statements
// Use debouncedRenderMap to batch rapid successive calls during atlas changes
const { cleanup: cleanupMapWatchers } = useMapWatchers(
  {
    mode: props.mode,
    geoData: props.geoData,
    projection: props.projection,
    preserveScale: props.preserveScale,
  },
  {
    onProjectionParamsChange: debouncedRenderMap,
    onFittingModeChange: debouncedRenderMap,
    onCanvasDimensionsChange: debouncedRenderMap,
    onReferenceScaleChange: debouncedRenderMap,
    onDependenciesChange: debouncedRenderMap,
  },
)

// Watch geoData prop directly for unified/split mode
// This ensures map re-renders when territory filtering changes the data
watch(() => props.geoData, (newData, oldData) => {
  if (props.mode === 'simple' && newData !== oldData) {
    debouncedRenderMap()
  }
}, { deep: false }) // Don't use deep, just watch reference changes

// Render map on mount
onMounted(async () => {
  // Wait for DOM to be ready
  await nextTick()
  isMounted.value = true
  await renderMap()
})

// Cleanup event listeners on unmount
onUnmounted(() => {
  // Clear any pending debounced render
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer)
  }

  cleanupProjectionPanning()
  cleanupTerritoryCursor()
  cleanupClipExtentEditor()
  cleanupMapWatchers()
})

// Use MapSizeCalculator service for size calculation
const computedSize = computed(() => {
  // Use canvas dimensions from config store if available (for composite mode)
  const config = configStore.canvasDimensions
    ? {
        compositeWidth: configStore.canvasDimensions.width,
        compositeHeight: configStore.canvasDimensions.height,
      }
    : undefined

  return MapSizeCalculator.calculateSize({
    mode: props.mode === 'composite' ? 'composite' : 'territory',
    isMainland: props.isMainland,
    preserveScale: props.preserveScale,
    area: props.area,
    width: props.width,
    height: props.height,
    config,
  })
})

/**
 * Debounced render function to batch multiple rapid render requests
 */
async function debouncedRenderMap() {
  console.info('[MapRenderer] debouncedRenderMap() called', {
    isReinitializing: geoDataStore.isReinitializing,
  })

  // Don't schedule render if geoDataStore is reinitializing
  if (geoDataStore.isReinitializing) {
    console.info('[MapRenderer] Skipping debounced render - geoDataStore is reinitializing')
    pendingRender.value = true
    return
  }

  // Clear existing timer
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer)
  }

  // If already rendering, mark that we need another render after this one completes
  if (isRendering.value) {
    console.info('[MapRenderer] Render in progress, marking pendingRender = true')
    pendingRender.value = true
    return
  }

  // Debounce by 50ms to batch rapid successive calls
  renderDebounceTimer = setTimeout(() => {
    renderMap()
  }, 50)
}

async function renderMap() {
  console.info('[MapRenderer] renderMap() called', {
    isMounted: isMounted.value,
    isRendering: isRendering.value,
    isReinitializing: geoDataStore.isReinitializing,
    hasContainer: !!mapContainer.value,
    hasCartographer: !!cartographer.value,
    mode: props.mode,
  })

  // Don't render if not mounted yet
  if (!isMounted.value) {
    console.warn('[MapRenderer] Skipping render - not mounted')
    return
  }

  // Don't render if geoDataStore is reinitializing (atlas switch in progress)
  if (geoDataStore.isReinitializing) {
    console.warn('[MapRenderer] Skipping render - geoDataStore is reinitializing')
    pendingRender.value = true
    return
  }

  // Don't render if already rendering (prevent concurrent renders)
  if (isRendering.value) {
    console.warn('[MapRenderer] Skipping render - already rendering')
    pendingRender.value = true
    return
  }

  // Check required dependencies
  if (!mapContainer.value || !cartographer.value) {
    console.warn('[MapRenderer] Skipping render - missing dependencies', {
      hasContainer: !!mapContainer.value,
      hasCartographer: !!cartographer.value,
    })
    return
  }

  try {
    isRendering.value = true
    isLoading.value = true
    error.value = null
    mapContainer.value.innerHTML = ''

    let plot: Plot.Plot

    // Handle composite mode
    if (props.mode === 'composite') {
      plot = await renderComposite()
    }
    else {
      // Handle simple mode - geoData is required
      if (!props.geoData) {
        // Don't warn during initial load, only if data should be available
        return
      }

      const { width, height } = computedSize.value
      const projectionToUse = props.projection ?? configStore.selectedProjection

      // Check if projection is loaded
      if (!projectionToUse) {
        console.warn('[MapRenderer] Skipping render: projection not yet loaded')
        return
      }

      // Apply territory-specific parameters if territoryCode is provided (split mode)
      if (props.territoryCode) {
        const territoryParams = parameterStore.getEffectiveParameters(props.territoryCode)
        cartographer.value.updateProjectionParams(territoryParams)
      }

      plot = await MapRenderCoordinator.renderSimpleMap(cartographer.value, {
        geoData: props.geoData,
        projection: projectionToUse,
        width,
        height,
        isMainland: props.isMainland,
        area: props.area,
        preserveScale: props.preserveScale,
        showGraticule: uiStore.showGraticule,
        showSphere: uiStore.showSphere,
        showCompositionBorders: uiStore.showCompositionBorders,
        showMapLimits: uiStore.showMapLimits,
      })
    }

    // Check again after async operations in case component unmounted
    if (!mapContainer.value) {
      // Component unmounted during render - this is normal, just return silently
      return
    }

    mapContainer.value.appendChild(plot as any)

    const svg = mapContainer.value.querySelector('svg')
    if (svg instanceof SVGSVGElement) {
      // Add territory attributes for drag functionality

      if (isDragEnabled.value) {
        let geoData: GeoJSON.FeatureCollection | null = null

        // In composite mode, get data from cartographer's internal GeoDataService
        if (props.mode === 'composite' && cartographer.value?.geoData) {
          try {
            // Get the data that was used for rendering by calling the same method the cartographer uses
            const territoryMode = configStore.territoryMode
            const territoryCodes = geoDataStore.filteredTerritories?.map(t => t.code)
            geoData = await cartographer.value.geoData.getRawUnifiedData(territoryMode, territoryCodes)
          }
          catch (error) {
            console.error('Failed to fetch raw unified data from cartographer:', error) // Debug log
          }
        }
        // In simple mode, use props or store data
        else if (props.geoData || geoDataStore.rawUnifiedData) {
          geoData = props.geoData || geoDataStore.rawUnifiedData
        }

        if (geoData) {
          Cartographer.addTerritoryAttributes(svg, geoData)
        }

        // Create border zone overlays for improved drag UX (custom composite mode only)
        if (props.mode === 'composite' && configStore.viewMode === 'composite-custom' && cartographer.value?.customComposite) {
          createBorderZoneOverlays(
            svg,
            cartographer.value.customComposite,
            computedSize.value.width,
            computedSize.value.height,
            (territoryCode) => {
              // When a territory is clicked, toggle its selection for clip extent editing
              toggleTerritorySelection(territoryCode)
              // Re-render handles to show/hide them for the selected territory
              renderClipExtentHandles(svg)
            },
          )
        }
        else {
          // Add territory event listeners for drag functionality (fallback for path-based dragging)
          setupTerritoryEventListeners(svg)
        }

        // Render clip extent corner handles for interactive editing
        renderClipExtentHandles(svg)
      }

      const { width, height } = computedSize.value
      const overlayProjectionId = configStore.compositeProjection || configStore.selectedProjection

      // Only apply overlays if projection is loaded
      if (overlayProjectionId) {
        MapRenderCoordinator.applyOverlays(
          svg,
          configStore.viewMode as 'composite-custom' | 'built-in-composite' | 'individual',
          {
            showBorders: uiStore.showCompositionBorders,
            showLimits: uiStore.showMapLimits,
            projectionId: overlayProjectionId,
            width,
            height,
            customComposite: cartographer.value?.customComposite,
            isMainland: props.isMainland,
            filteredTerritoryCodes: new Set(geoDataStore.filteredTerritories.map(t => t.code)),
            mainlandCode: configStore.currentAtlasConfig?.splitModeConfig?.mainlandCode,
          },
        )
      }
    }
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Error rendering map'
    console.error('Error rendering map:', err)
  }
  finally {
    isLoading.value = false
    isRendering.value = false

    // If a render was requested while we were rendering, trigger it now
    if (pendingRender.value) {
      console.info('[MapRenderer] pendingRender detected, scheduling another render')
      pendingRender.value = false
      // Use nextTick to ensure state has settled
      nextTick(() => {
        debouncedRenderMap()
      })
    }
  }
}

async function renderComposite(): Promise<Plot.Plot> {
  if (!cartographer.value) {
    throw new Error('Cartographer not initialized')
  }

  console.info('[MapRenderer] renderComposite() - cartographer info:', {
    cartographerId: (cartographer.value as any).__id,
    cartographerAtlasId: (cartographer.value as any).__atlasId,
    cartographerTerritories: (cartographer.value as any).__territories,
    filteredTerritories: geoDataStore.filteredTerritories.map(t => t.code),
    customCompositeKeys: cartographer.value.customComposite
      ? Object.keys(cartographer.value.customComposite)
      : 'no customComposite',
  })

  const { width, height } = computedSize.value

  // Build territory projections and translations from parameter store
  // Use cartographer's composite config as source of truth for territories
  const territoryProjections: Record<string, string> = {}
  const territoryTranslations: Record<string, { x: number, y: number }> = {}

  // Get all territory codes from cartographer's customComposite
  const territoryCodes = cartographer.value.customComposite
    ? Object.keys(cartographer.value.customComposite)
    : []

  console.info('[MapRenderer] Building territory params for codes:', territoryCodes)

  for (const territoryCode of territoryCodes) {
    const projectionId = parameterStore.getTerritoryProjection(territoryCode)
    if (projectionId) {
      territoryProjections[territoryCode] = projectionId
    }
    territoryTranslations[territoryCode] = parameterStore.getTerritoryTranslation(territoryCode)
  }

  // Check if projections are loaded before rendering
  if (!configStore.selectedProjection) {
    console.warn('[MapRenderer] Cannot render composite: selectedProjection not loaded')
    throw new Error('Cannot render composite map: projection not loaded')
  }

  return await MapRenderCoordinator.renderCompositeMap(cartographer.value, {
    viewMode: configStore.viewMode as 'composite-custom' | 'built-in-composite' | 'individual',
    territoryMode: configStore.territoryMode,
    selectedProjection: configStore.selectedProjection,
    compositeProjection: configStore.compositeProjection ?? undefined,
    width,
    height,
    showGraticule: uiStore.showGraticule,
    showSphere: uiStore.showSphere,
    showCompositionBorders: uiStore.showCompositionBorders,
    showMapLimits: uiStore.showMapLimits,
    currentAtlasConfig: configStore.currentAtlasConfig,
    territoryProjections,
    territoryTranslations,
    // territoryScales removed - scale multipliers come from parameter store
    filteredTerritories: geoDataStore.filteredTerritories,
  })
}

/**
 * Setup event listeners for territory drag functionality
 */
function setupTerritoryEventListeners(svg: SVGSVGElement) {
  if (!isDragEnabled.value)
    return

  const paths = svg.querySelectorAll('path[data-territory]')

  paths.forEach((path) => {
    path.addEventListener('mousedown', event => handleTerritoryMouseDown(event as MouseEvent))
    path.addEventListener('mouseenter', event => handleTerritoryMouseEnter(event as MouseEvent))
    path.addEventListener('mouseleave', () => handleTerritoryMouseLeave())
  })
}

// Combined mouse interaction handlers (territory dragging + projection panning)
function handleMouseDown(event: MouseEvent) {
  const target = event.target as Element

  // Priority 1: Territory dragging (if enabled and on territory)
  if (isDragEnabled.value && target.hasAttribute && target.hasAttribute('data-territory')) {
    handleTerritoryMouseDown(event)
    return
  }

  // Priority 2: Projection panning (if supported)
  handlePanMouseDown(event)
}
</script>

<template>
  <div
    class="map-renderer"
    :class="{
      'h-full': props.fullHeight,
      'h-fit': !props.fullHeight,
    }"
  >
    <div
      v-show="!isLoading && !error"
      ref="mapContainer"
      class="map-plot bg-base-200 border-base-300 p-2"
      :style="{
        display: isLoading || error ? 'none' : 'flex',
        cursor: cursorStyle,
      }"
      @mousedown="handleMouseDown"
    />
  </div>
</template>

<style lang="css" scoped>
@reference 'tailwindcss';
.map-plot {
  @apply h-full w-fit rounded-sm border flex-col items-center justify-center;
}
</style>
