<script setup lang="ts">
import type * as Plot from '@observablehq/plot'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { getRelevantParameters } from '@/core/projections/parameters'
import { projectionRegistry } from '@/core/projections/registry'
import { MapRenderCoordinator } from '@/services/rendering/map-render-coordinator'
import { MapSizeCalculator } from '@/services/rendering/map-size-calculator'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
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

// Get current cursor style based on panning support and state
const cursorStyle = computed(() => {
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
    territoryScales: territoryStore.territoryScales,
    filteredTerritories: geoDataStore.filteredTerritories,
  })
}

// Pan interaction handlers
function handleMouseDown(event: MouseEvent) {
  if (!supportsPanning.value)
    return

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
  const latDelta = -dy * 0.5

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
      territoryStore.territoryScales,
      territoryStore.territoryProjections,
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
