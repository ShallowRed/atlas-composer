<script setup lang="ts">
import type * as Plot from '@observablehq/plot'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useTerritoryCursor } from '@/composables/useTerritoryCursor'
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
const svgElement = ref<SVGSVGElement>()

const isLoading = ref(false)
const error = ref<string | null>(null)
const isMounted = ref(false)
const isRendering = ref(false)

// Use cartographer from store
const cartographer = computed(() => geoDataStore.cartographer)

// Territory cursor composable for drag-to-move functionality
const { isDragging, currentHoveredTerritory, attachListeners, detachListeners } = useTerritoryCursor({
  svgElement,
  onOffsetChange: (territoryCode: string, deltaX: number, deltaY: number) => {
    // Get current translation
    const current = territoryStore.territoryTranslations[territoryCode] || { x: 0, y: 0 }

    // Update with delta
    territoryStore.setTerritoryTranslation(territoryCode, 'x', current.x + deltaX)
    territoryStore.setTerritoryTranslation(territoryCode, 'y', current.y + deltaY)
  },
  getTerritoryCode: (element: SVGElement) => {
    // Find the parent path element with data-territory attribute
    let current: SVGElement | null = element
    while (current && current.tagName !== 'svg') {
      if (current.hasAttribute('data-territory')) {
        return current.getAttribute('data-territory')
      }
      current = current.parentElement as SVGElement
    }
    return null
  },
  isDraggingEnabled: () => {
    // Only enable dragging in composite-custom mode
    return props.mode === 'composite' && configStore.viewMode === 'composite-custom'
  },
  isTerritoryDraggable: (territoryCode: string) => {
    // Don't allow dragging the mainland
    const mainlandCode = configStore.currentAtlasConfig?.territories?.mainland?.code
    return territoryCode !== mainlandCode
  },
})

// Watch for projection parameter changes and update cartographer
watch(
  () => configStore.effectiveProjectionParams,
  async (newParams) => {
    console.log('[MapRenderer] effectiveProjectionParams changed:', newParams)
    if (cartographer.value && newParams) {
      cartographer.value.updateProjectionParams(newParams)
      // Trigger a re-render with the updated parameters
      await renderMap()
    }
  },
  { deep: true },
)

// Render map on mount
onMounted(async () => {
  // Wait for DOM to be ready
  await nextTick()
  isMounted.value = true
  await renderMap()
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
      // Store SVG reference for cursor composable
      svgElement.value = svg

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

      // Attach territory drag listeners if in composite mode
      if (props.mode === 'composite' && configStore.viewMode === 'composite-custom') {
        // Detach old listeners first to avoid duplicates
        detachListeners()
        // Add data-territory attributes to paths for territory identification
        addTerritoryDataAttributes(svg)
        // Attach new listeners
        attachListeners()
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

/**
 * Add data-territory attributes to SVG paths for territory identification
 * This enables the cursor composable to identify which territory is being dragged
 *
 * Observable Plot renders paths with aria-label attributes containing the territory name
 * and stores data in __data__ property on the path element
 */
function addTerritoryDataAttributes(svg: SVGSVGElement) {
  // Find all path elements in the SVG that are part of the map (not graticule or sphere)
  const paths = svg.querySelectorAll('path[aria-label]')

  paths.forEach((path) => {
    // Try to get territory code from the path's bound data (Observable Plot pattern)
    const element = path as any
    const territoryData = element.__data__

    if (territoryData?.properties) {
      // Extract territory code from properties
      const territoryCode = territoryData.properties.code
        || territoryData.properties.INSEE_DEP
        || territoryData.properties.name

      if (territoryCode && !path.hasAttribute('data-territory')) {
        path.setAttribute('data-territory', territoryCode)

        // Check if this is the mainland (don't make it draggable)
        const isMainland = configStore.currentAtlasConfig?.territories?.mainland?.code === territoryCode
        if (!isMainland) {
          // Add cursor style to indicate draggability for overseas territories
          path.style.cursor = 'grab'
        }
      }
    }
  })
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
    class="map-renderer relative"
    :class="{
      'h-full': props.fullHeight,
      'h-fit': !props.fullHeight,
    }"
  >
    <div
      v-show="!isLoading && !error"
      ref="mapContainer"
      class="map-plot bg-base-200 h-full w-fit rounded-sm border border-base-300 flex-col items-center justify-center"
      :class="{
        'cursor-grabbing': isDragging,
      }"
      :style="{ display: isLoading || error ? 'none' : 'flex' }"
    />
    <!-- Show territory name when hovering in composite-custom mode -->
    <div
      v-if="currentHoveredTerritory && props.mode === 'composite' && configStore.viewMode === 'composite-custom'"
      class="absolute bottom-4 left-4 badge badge-primary badge-lg"
    >
      <i class="ri-drag-move-2-line mr-1" />
      {{ currentHoveredTerritory }}
    </div>
  </div>
</template>
