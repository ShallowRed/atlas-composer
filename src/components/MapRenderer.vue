<script setup lang="ts">
import type * as Plot from '@observablehq/plot'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { MapRenderCoordinator } from '@/services/rendering/map-render-coordinator'
import { MapSizeCalculator } from '@/services/rendering/map-size-calculator'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

interface Props {
  // For simple territory maps
  geoData?: GeoJSON.FeatureCollection | null
  title?: string
  area?: number
  region?: string
  isMainland?: boolean
  preserveScale?: boolean
  width?: number
  height?: number
  projection?: string // Optional projection override for individual mode

  // For composite maps
  mode?: 'simple' | 'composite'
}

const props = withDefaults(defineProps<Props>(), {
  geoData: null,
  isMainland: false,
  preserveScale: false,
  width: 200,
  height: 160,
  mode: 'simple',
})

const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()
const mapContainer = ref<HTMLElement>()

const isLoading = ref(false)
const error = ref<string | null>(null)
const isMounted = ref(false)
const isRendering = ref(false)

// Use cartographer from store
const cartographer = computed(() => geoDataStore.cartographer)

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
        showGraticule: configStore.showGraticule,
        showCompositionBorders: configStore.showCompositionBorders,
        showMapLimits: configStore.showMapLimits,
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
          showBorders: configStore.showCompositionBorders,
          showLimits: configStore.showMapLimits,
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
    showGraticule: configStore.showGraticule,
    showCompositionBorders: configStore.showCompositionBorders,
    showMapLimits: configStore.showMapLimits,
    currentAtlasConfig: configStore.currentAtlasConfig,
    territoryProjections: configStore.territoryProjections,
    territoryTranslations: configStore.territoryTranslations,
    territoryScales: configStore.territoryScales,
    filteredTerritories: geoDataStore.filteredTerritories,
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
      configStore.showGraticule,
      configStore.showCompositionBorders,
      configStore.showMapLimits,
      configStore.territoryTranslations,
      configStore.territoryScales,
      configStore.territoryProjections,
      geoDataStore.filteredTerritories, // Watch filtered territories to re-render when selection changes
    ]
  }
  return [
    props.geoData,
    props.projection,
    configStore.selectedProjection,
    props.preserveScale,
    configStore.showGraticule,
    configStore.showCompositionBorders,
    configStore.showMapLimits,
  ]
}, async () => {
  await renderMap()
}, { deep: true, flush: 'post' })
</script>

<template>
  <div class="map-renderer">
    <h4
      v-if="title"
      class="font-medium mb-2 text-sm text-gray-600"
    >
      {{ title }}
      <span v-if="area">({{ area.toLocaleString() }} km²)</span>
    </h4>

    <div
      v-show="!isLoading && !error"
      ref="mapContainer"
      class="map-plot bg-base-200 w-fit rounded-sm border border-base-300"
      :style="{ display: isLoading || error ? 'none' : 'block' }"
    />
  </div>
</template>
