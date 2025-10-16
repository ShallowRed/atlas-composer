<script setup lang="ts">
import type * as Plot from '@observablehq/plot'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useTerritoryCursor } from '@/composables/useTerritoryCursor'
import { getRelevantParameters } from '@/core/projections/parameters'
import { projectionRegistry } from '@/core/projections/registry'
import { Cartographer } from '@/services/rendering/cartographer-service'
import { MapRenderCoordinator } from '@/services/rendering/map-render-coordinator'
import { MapSizeCalculator } from '@/services/rendering/map-size-calculator'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useTerritoryStore } from '@/stores/territory'
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
  projection?: string // Optional projection override for individual mode
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
const territoryStore = useTerritoryStore()
const parameterStore = useParameterStore()
const uiStore = useUIStore()
const mapContainer = ref<HTMLElement>()

const isLoading = ref(false)
const error = ref<string | null>(null)
const isMounted = ref(false)
const isRendering = ref(false)

// Pan interaction state
const isPanning = ref(false)
const panStartX = ref(0)
const panStartY = ref(0)
const panStartRotationLon = ref(0)
const panStartRotationLat = ref(0)

// Use cartographer from store
const cartographer = computed(() => geoDataStore.cartographer)

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

// Check if current projection supports panning (rotateLongitude)
const supportsPanning = computed(() => {
  const projectionId = props.projection ?? configStore.selectedProjection
  if (!projectionId)
    return false

  const projection = projectionRegistry.get(projectionId as string)
  if (!projection)
    return false

  const relevantParams = getRelevantParameters(projection.family)
  return relevantParams.rotateLongitude
})

// Check if current projection supports latitude panning (rotateLatitude and not locked)
const supportsLatitudePanning = computed(() => {
  const projectionId = props.projection ?? configStore.selectedProjection
  if (!projectionId)
    return false

  const projection = projectionRegistry.get(projectionId as string)
  if (!projection)
    return false

  const relevantParams = getRelevantParameters(projection.family)
  return relevantParams.rotateLatitude && !configStore.rotateLatitudeLocked
})

// Get current cursor style based on territory dragging and projection panning
const cursorStyle = computed(() => {
  // Territory dragging takes precedence
  if (isDragEnabled.value && hoveredTerritoryCode.value) {
    return getTerritoryyCursorStyle(hoveredTerritoryCode.value)
  }

  // Fallback to projection panning cursor
  if (!supportsPanning.value)
    return 'default'
  return isPanning.value ? 'grabbing' : 'grab'
})

// Watch for projection parameter changes and update cartographer
watch(
  () => configStore.effectiveProjectionParams,
  async (newParams) => {
    if (cartographer.value && newParams) {
      cartographer.value.updateProjectionParams(newParams)
      await renderMap()
    }
  },
  { deep: true },
)

// Watch for fitting mode changes
watch(
  () => configStore.projectionFittingMode,
  async (newMode) => {
    if (cartographer.value) {
      cartographer.value.updateFittingMode(newMode)
      // Trigger a re-render with the updated mode
      await renderMap()
    }
  },
)

// Render map on mount
onMounted(async () => {
  // Wait for DOM to be ready
  await nextTick()
  isMounted.value = true
  await renderMap()
})

// Cleanup event listeners on unmount
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }
  cleanupTerritoryCursor()
})

// Use MapSizeCalculator service for size calculation
const computedSize = computed(() =>
  MapSizeCalculator.calculateSize({
    mode: props.mode === 'composite' ? 'composite' : 'territory',
    isMainland: props.isMainland,
    preserveScale: props.preserveScale,
    area: props.area,
    width: props.width,
    height: props.height,
  }),
)

const insetValue = computed(() => {
  return props.isMainland ? 20 : 5
})

async function renderMap() {
  // Don't render if not mounted yet
  if (!isMounted.value) {
    return
  }

  // Don't render if already rendering (prevent concurrent renders)
  if (isRendering.value) {
    return
  }

  // Check required dependencies
  if (!mapContainer.value || !cartographer.value) {
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
      const projectionToUse = (props.projection ?? configStore.selectedProjection) as string

      plot = await MapRenderCoordinator.renderSimpleMap(cartographer.value, {
        geoData: props.geoData,
        projection: projectionToUse,
        width,
        height,
        inset: insetValue.value,
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

    // Wait for next tick to ensure SVG paths are rendered
    await nextTick()

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
          createBorderZoneOverlays(svg, cartographer.value.customComposite, computedSize.value.width, computedSize.value.height)
        }
        else {
          // Add territory event listeners for drag functionality (fallback for path-based dragging)
          setupTerritoryEventListeners(svg)
        }
      }

      const { width, height } = computedSize.value
      MapRenderCoordinator.applyOverlays(
        svg,
        configStore.viewMode as 'composite-custom' | 'composite-existing' | 'individual',
        {
          showBorders: uiStore.showCompositionBorders,
          showLimits: uiStore.showMapLimits,
          projectionId: (configStore.compositeProjection || configStore.selectedProjection) as string,
          width,
          height,
          customComposite: cartographer.value?.customComposite,
          isMainland: props.isMainland,
        },
      )
    }
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Error rendering map'
    console.error('Error rendering map:', err)
  }
  finally {
    isLoading.value = false
    isRendering.value = false
  }
}

async function renderComposite(): Promise<Plot.Plot> {
  if (!cartographer.value) {
    throw new Error('Cartographer not initialized')
  }

  const { width, height } = computedSize.value

  return await MapRenderCoordinator.renderCompositeMap(cartographer.value, {
    viewMode: configStore.viewMode as 'composite-custom' | 'composite-existing' | 'individual',
    projectionMode: configStore.projectionMode,
    territoryMode: configStore.territoryMode,
    selectedProjection: configStore.selectedProjection as string,
    compositeProjection: configStore.compositeProjection as string | undefined,
    width,
    height,
    showGraticule: uiStore.showGraticule,
    showSphere: uiStore.showSphere,
    showCompositionBorders: uiStore.showCompositionBorders,
    showMapLimits: uiStore.showMapLimits,
    currentAtlasConfig: configStore.currentAtlasConfig,
    territoryProjections: territoryStore.territoryProjections,
    territoryTranslations: territoryStore.territoryTranslations,
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
    const territoryCode = path.getAttribute('data-territory')

    path.addEventListener('mousedown', event => handleTerritoryMouseDown(event as MouseEvent))
    path.addEventListener('mouseenter', event => handleTerritoryMouseEnter(event as MouseEvent))
    path.addEventListener('mouseleave', () => handleTerritoryMouseLeave())
  })
}

// Combined mouse interaction handlers (territory dragging + projection panning)
function handleMouseDown(event: MouseEvent) {
  const target = event.target as Element

  // Check if this is a territory element first
  if (isDragEnabled.value && target.hasAttribute && target.hasAttribute('data-territory')) {
    handleTerritoryMouseDown(event)
    return
  }

  // Fallback to projection panning
  if (!supportsPanning.value) {
    return
  }

  isPanning.value = true
  panStartX.value = event.clientX
  panStartY.value = event.clientY

  // Get current rotation values
  const currentRotationLon = configStore.customRotateLongitude
    ?? configStore.effectiveProjectionParams?.rotate?.mainland?.[0]
    ?? 0
  const currentRotationLat = configStore.customRotateLatitude
    ?? configStore.effectiveProjectionParams?.rotate?.mainland?.[1]
    ?? 0

  panStartRotationLon.value = currentRotationLon
  panStartRotationLat.value = currentRotationLat

  // Add global mouse move and mouse up listeners
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)

  // Prevent text selection during drag
  event.preventDefault()
}

function handleMouseMove(event: MouseEvent) {
  if (!isPanning.value)
    return

  const dx = event.clientX - panStartX.value
  const dy = event.clientY - panStartY.value

  // Convert pixel movement to rotation degrees
  // X-axis: Negative dx means dragging left, which should rotate map right (increase longitude)
  // Y-axis: Negative dy means dragging up, which should rotate map down (decrease latitude)
  // Scale factor: ~0.5 degrees per pixel for smooth interaction
  const lonDelta = -dx * 0.5
  const latDelta = supportsLatitudePanning.value ? -dy * 0.5 : 0

  const newRotationLon = panStartRotationLon.value + lonDelta
  const newRotationLat = panStartRotationLat.value + latDelta

  // Wrap longitude rotation to -180 to 180 range
  let wrappedLon = newRotationLon % 360
  if (wrappedLon > 180)
    wrappedLon -= 360
  if (wrappedLon < -180)
    wrappedLon += 360

  // Clamp latitude rotation to -90 to 90 range (avoid flipping over poles)
  const clampedLat = Math.max(-90, Math.min(90, newRotationLat))

  // Update both rotation axes through the config store
  configStore.setCustomRotate(wrappedLon, clampedLat)
}

function handleMouseUp() {
  isPanning.value = false

  // Remove global listeners
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
}

// Watch dependencies based on mode
watch(() => {
  if (props.mode === 'composite') {
    return [
      configStore.viewMode,
      configStore.projectionMode,
      configStore.compositeProjection,
      configStore.selectedProjection,
      configStore.territoryMode,
      configStore.scalePreservation,
      uiStore.showGraticule,
      uiStore.showSphere,
      uiStore.showCompositionBorders,
      uiStore.showMapLimits,
      territoryStore.territoryTranslations,
      // territoryStore.territoryScales removed - scale multipliers in parameter store
      territoryStore.territoryProjections,
      parameterStore.territoryParametersVersion, // Watch for parameter changes to trigger re-render
      geoDataStore.filteredTerritories, // Watch filtered territories to re-render when selection changes
    ]
  }
  return [
    props.geoData,
    props.projection,
    configStore.selectedProjection,
    props.preserveScale,
    uiStore.showGraticule,
    uiStore.showSphere,
    uiStore.showCompositionBorders,
    uiStore.showMapLimits,
    // NOTE: effectiveProjectionParams is NOT watched here because we have a dedicated
    // watcher that calls updateProjectionParams() which updates the existing cartographer
    // Watching it here would trigger a full re-render which is unnecessary
  ]
}, async () => {
  await renderMap()
}, { deep: true, flush: 'post' })
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
      class="map-plot bg-base-200 h-full w-fit rounded-sm border border-base-300 flex-col items-center justify-center"
      :style="{
        display: isLoading || error ? 'none' : 'flex',
        cursor: cursorStyle,
      }"
      @mousedown="handleMouseDown"
    />
  </div>
</template>
