<script setup lang="ts">
import type { ViewState } from '@/services/view/view-orchestration-service'
import type { TerritoryCode } from '@/types/branded'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useClipExtentEditor } from '@/composables/useClipExtentEditor'
import { useMapWatchers } from '@/composables/useMapWatchers'
import { useProjectionPanning } from '@/composables/useProjectionPanning'
import { useSliderState } from '@/composables/useSliderState'
import { useTerritoryCursor } from '@/composables/useTerritoryCursor'
import { TRANSITION_DURATION } from '@/config/transitions'
import { getAtlasPresets } from '@/core/atlases/registry'
import { Cartographer } from '@/services/rendering/cartographer-service'
import { MapRenderCoordinator } from '@/services/rendering/map-render-coordinator'
import { MapSizeCalculator } from '@/services/rendering/map-size-calculator'
import { ViewOrchestrationService } from '@/services/view/view-orchestration-service'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useUIStore } from '@/stores/ui'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

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

const debug = logger.vue.component

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
  projection?: string | null // Optional projection override for split/composite-custom mode
  territoryCode?: TerritoryCode // Territory code for parameter resolution in split mode
  fullHeight?: boolean
  // For composite maps
  mode?: 'simple' | 'composite'
}

const atlasStore = useAtlasStore()
const projectionStore = useProjectionStore()
const viewStore = useViewStore()
const geoDataStore = useGeoDataStore()
const parameterStore = useParameterStore()
const uiStore = useUIStore()
const mapContainer = ref<HTMLElement>()

// Compute showSphere based on view mode (always on for unified mode)
const showSphere = computed<boolean>(() => {
  const atlasConfig = atlasStore.currentAtlasConfig
  if (!atlasConfig)
    return false

  const atlasId = atlasStore.selectedAtlasId
  const presets = getAtlasPresets(atlasId)
  const hasPresets = presets.length > 0

  const viewState: ViewState = {
    viewMode: viewStore.viewMode,
    atlasConfig,
    hasPresets,
    hasOverseasTerritories: geoDataStore.overseasTerritories.length > 0,
    isPresetLoading: false,
    showProjectionSelector: viewStore.showProjectionSelector,
    showIndividualProjectionSelectors: viewStore.showIndividualProjectionSelectors,
    isMainlandInTerritories: geoDataStore.allActiveTerritories.some(
      t => t.code === atlasConfig.splitModeConfig?.mainlandCode || t.code === 'MAINLAND',
    ),
    showMainland: atlasConfig.pattern === 'single-focus',
  }

  return ViewOrchestrationService.shouldShowSphere(viewState)
})

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

const isLoading = ref(true)
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
  isPanning,
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
  isDraggingCorner,
  cleanup: cleanupClipExtentEditor,
} = useClipExtentEditor()

// Global slider state tracker
const { isSliderActive } = useSliderState()

// Track if we're currently in a drag operation (territory dragging, projection panning, clip extent editing, or slider interaction)
const isInDragOperation = computed(() => _isDragging.value || isPanning.value || isDraggingCorner.value || isSliderActive.value)

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

// Render map on mount - delay to allow browser to paint initial hidden state
onMounted(async () => {
  // Wait for Vue to commit the initial render
  await nextTick()
  isMounted.value = true

  // CRITICAL: Use setTimeout to break completely out of Vue's synchronous
  // update batching. This ensures the browser paints the initial state
  // (isLoading=true, opacity=0) before we start rendering.
  // Without this delay, Vue batches all updates and the browser only
  // paints the final state (isLoading=false, opacity=1).
  setTimeout(async () => {
    await renderMap()
  }, TRANSITION_DURATION.renderDelay)
})

// Cleanup event listeners on unmount
onUnmounted(() => {
  // Clear any pending debounced render
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer)
  }

  // Clear the map container to remove all SVG elements
  if (mapContainer.value) {
    mapContainer.value.innerHTML = ''
  }

  cleanupProjectionPanning()
  cleanupTerritoryCursor()
  cleanupClipExtentEditor()
  cleanupMapWatchers()
})

// Use MapSizeCalculator service for size calculation
const computedSize = computed(() => {
  // Use canvas dimensions from projection store if available (for composite mode)
  const config = projectionStore.canvasDimensions
    ? {
        compositeWidth: projectionStore.canvasDimensions.width,
        compositeHeight: projectionStore.canvasDimensions.height,
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
 * Skips debouncing when in drag operation (territory dragging or projection panning)
 */
async function debouncedRenderMap() {
  // Don't schedule render if geoDataStore is reinitializing
  if (geoDataStore.isReinitializing) {
    pendingRender.value = true
    return
  }

  // Clear existing timer
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer)
  }

  // If already rendering, mark that we need another render after this one completes
  if (isRendering.value) {
    pendingRender.value = true
    return
  }

  // Skip debouncing during drag operations for immediate feedback
  if (isInDragOperation.value) {
    renderMap()
    return
  }

  // Debounce by 50ms to batch rapid successive calls
  renderDebounceTimer = setTimeout(() => {
    renderMap()
  }, 50)
}

async function renderMap() {
  // Don't render if not mounted yet
  if (!isMounted.value) {
    debug('Skipping render - not mounted yet')
    return
  }

  // Don't render if geoDataStore is reinitializing (atlas switch in progress)
  if (geoDataStore.isReinitializing) {
    debug('Skipping render - geoDataStore reinitializing')
    pendingRender.value = true
    return
  }

  // Don't render if already rendering (prevent concurrent renders)
  if (isRendering.value) {
    debug('Skipping render - already rendering, will retry after')
    pendingRender.value = true
    return
  }

  // Check required dependencies
  if (!mapContainer.value || !cartographer.value) {
    debug('Skipping render - missing dependencies (container: %s, cartographer: %s)', !!mapContainer.value, !!cartographer.value)
    return
  }

  try {
    isRendering.value = true
    isLoading.value = true
    error.value = null

    mapContainer.value.innerHTML = ''

    let svg: SVGSVGElement

    // Handle composite mode
    if (props.mode === 'composite') {
      svg = await renderComposite()
    }
    else {
      // Handle simple mode - geoData is required
      if (!props.geoData) {
        // Don't warn during initial load, only if data should be available
        return
      }

      const { width, height } = computedSize.value
      const projectionToUse = props.projection ?? projectionStore.selectedProjection

      // Check if projection is loaded
      if (!projectionToUse) {
        debug('Skipping render: projection not yet loaded')
        return
      }

      // Apply territory-specific parameters if territoryCode is provided (split mode)
      if (props.territoryCode) {
        const territoryParams = parameterStore.getEffectiveParameters(props.territoryCode)
        cartographer.value.updateProjectionParams(territoryParams)
      }

      svg = await MapRenderCoordinator.renderSimpleMap(cartographer.value, {
        geoData: props.geoData,
        projection: projectionToUse,
        width,
        height,
        isMainland: props.isMainland,
        area: props.area,
        preserveScale: props.preserveScale,
        showGraticule: uiStore.showGraticule,
        showSphere: showSphere.value,
        showCompositionBorders: uiStore.showCompositionBorders,
        showMapLimits: uiStore.showMapLimits,
      })
    }

    // Check again after async operations in case component unmounted
    if (!mapContainer.value) {
      // Component unmounted during render - this is normal, just return silently
      return
    }

    mapContainer.value.appendChild(svg)

    if (svg instanceof SVGSVGElement) {
      // Add territory attributes for drag functionality

      if (isDragEnabled.value) {
        let geoData: GeoJSON.FeatureCollection | null = null

        // In composite mode, get data from cartographer's internal GeoDataService
        if (props.mode === 'composite' && cartographer.value?.geoData) {
          try {
            // Get the data that was used for rendering by calling the same method the cartographer uses
            const territoryMode = viewStore.territoryMode
            const territoryCodes = geoDataStore.overseasTerritories?.map(t => t.code)
            geoData = await cartographer.value.geoData.getRawUnifiedData(territoryMode, territoryCodes)
          }
          catch (err) {
            debug('Failed to fetch raw unified data: %O', err)
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
        if (props.mode === 'composite' && viewStore.viewMode === 'composite-custom' && cartographer.value?.customComposite) {
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
      const overlayProjectionId = projectionStore.compositeProjection || projectionStore.selectedProjection

      // Determine geoData for graticule overlay (same data used for rendering)
      let graticuleGeoData: GeoJSON.FeatureCollection | GeoJSON.Feature | { type: 'Sphere' } | undefined
      if (props.mode === 'composite') {
        // For composite mode, try to get the unified data
        if (cartographer.value?.geoData) {
          const territoryMode = viewStore.territoryMode
          const territoryCodes = geoDataStore.overseasTerritories?.map(t => t.code)
          graticuleGeoData = await cartographer.value.geoData.getRawUnifiedData(territoryMode, territoryCodes) ?? undefined
        }
      }
      else {
        // For simple mode, use props.geoData
        graticuleGeoData = props.geoData ?? undefined
      }

      // Get projection parameters for graticule
      const graticuleParams = props.territoryCode
        ? parameterStore.getEffectiveParameters(props.territoryCode)
        : parameterStore.globalParameters

      // Determine the effective view mode for graticule rendering
      // Only use composite-custom mode when in actual composite rendering mode
      const isCompositeMode = props.mode === 'composite'
      const effectiveViewMode = isCompositeMode
        ? viewStore.viewMode as 'composite-custom' | 'built-in-composite'
        : 'simple'

      // Only apply overlays if projection is loaded
      if (overlayProjectionId) {
        MapRenderCoordinator.applyOverlays(
          svg,
          isCompositeMode ? viewStore.viewMode as 'composite-custom' | 'built-in-composite' : 'individual',
          {
            showBorders: uiStore.showCompositionBorders,
            showLimits: uiStore.showMapLimits,
            projectionId: overlayProjectionId,
            width,
            height,
            customComposite: isCompositeMode ? cartographer.value?.customComposite : undefined,
            isMainland: props.isMainland,
            filteredTerritoryCodes: new Set(geoDataStore.allActiveTerritories.map(t => t.code)),
            mainlandCode: atlasStore.currentAtlasConfig?.splitModeConfig?.mainlandCode,
          },
        )

        // Apply graticule overlay (scale-adaptive graticule lines)
        // Use the same projection that was used for rendering to ensure alignment
        const renderProjection = cartographer.value?.lastProjection ?? undefined
        MapRenderCoordinator.applyGraticuleOverlay(svg, {
          showGraticule: uiStore.showGraticule,
          width,
          height,
          projection: renderProjection,
          projectionId: overlayProjectionId,
          viewMode: effectiveViewMode,
          customComposite: isCompositeMode ? (cartographer.value?.customComposite as any) : undefined,
          geoData: graticuleGeoData,
          projectionParams: graticuleParams,
          showSphere: showSphere.value,
          filteredTerritoryCodes: new Set(geoDataStore.allActiveTerritories.map(t => t.code)),
        })
      }
    }
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Error rendering map'
    debug('Error rendering map: %O', err)
  }
  finally {
    isLoading.value = false
    isRendering.value = false

    // If a render was requested while we were rendering, trigger it now
    if (pendingRender.value) {
      debug('Pending render detected, scheduling another render')
      pendingRender.value = false
      // Use nextTick to ensure state has settled
      nextTick(() => {
        debouncedRenderMap()
      })
    }
  }
}

async function renderComposite(): Promise<SVGSVGElement> {
  if (!cartographer.value) {
    throw new Error('Cartographer not initialized')
  }

  debug('renderComposite() starting - territories: %o', geoDataStore.overseasTerritories.map(t => t.code))

  const { width, height } = computedSize.value

  // Build territory projections and translations from parameter store
  // Use cartographer's composite config as source of truth for territories
  const territoryProjections: Record<string, string> = {}
  const territoryTranslations: Record<string, { x: number, y: number }> = {}

  // Get all territory codes from cartographer's customComposite
  const territoryCodes = cartographer.value.customComposite
    ? Object.keys(cartographer.value.customComposite)
    : []

  debug('Building territory params for %d territories', territoryCodes.length)

  // Convert: Object.keys returns string[], need to convert to TerritoryCode
  for (const territoryCode of territoryCodes) {
    const brandedCode = territoryCode as TerritoryCode
    const projectionId = parameterStore.getTerritoryProjection(brandedCode)
    if (projectionId) {
      territoryProjections[territoryCode] = projectionId
    }
    territoryTranslations[territoryCode] = parameterStore.getTerritoryTranslation(brandedCode)
  }

  // Check if projections are loaded before rendering
  if (!projectionStore.selectedProjection) {
    debug('Cannot render composite: selectedProjection not loaded')
    throw new Error('Cannot render composite map: projection not loaded')
  }

  return await MapRenderCoordinator.renderCompositeMap(cartographer.value, {
    viewMode: viewStore.viewMode as 'composite-custom' | 'built-in-composite' | 'individual',
    territoryMode: viewStore.territoryMode,
    selectedProjection: projectionStore.selectedProjection,
    compositeProjection: projectionStore.compositeProjection ?? undefined,
    width,
    height,
    showGraticule: uiStore.showGraticule,
    showSphere: showSphere.value,
    showCompositionBorders: uiStore.showCompositionBorders,
    showMapLimits: uiStore.showMapLimits,
    currentAtlasConfig: atlasStore.currentAtlasConfig,
    territoryProjections,
    territoryTranslations,
    // territoryScales removed - scale multipliers come from parameter store
    overseasTerritories: geoDataStore.overseasTerritories,
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
      ref="mapContainer"
      class="map-plot w-full bg-base-200 border-base-300 p-2"
      :class="{
        'map-ready': !isLoading && !error,
        'map-loading': isLoading || error,
      }"
      :style="{
        display: 'flex',
        cursor: cursorStyle,
      }"
      @mousedown="handleMouseDown"
    />
  </div>
</template>

<style lang="css" scoped>
@reference 'tailwindcss';
.map-plot {
  @apply h-full w-full rounded-sm border flex-col items-center justify-center;
  transition: opacity var(--transition-fade) ease;
}

.map-loading {
  opacity: 0;
}

.map-ready {
  opacity: 1;
}
</style>
