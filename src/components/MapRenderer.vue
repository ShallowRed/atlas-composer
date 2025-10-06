<script setup lang="ts">
import type * as Plot from '@observablehq/plot'
import type { CompositeRenderOptions, SimpleRenderOptions } from '@/cartographer/Cartographer'
import { computed, onMounted, ref, watch } from 'vue'
import { Cartographer } from '@/cartographer/Cartographer'
import { TERRITORY_CODES } from '@/constants/france-territories'
import { useConfigStore } from '@/stores/config'

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
const mapContainer = ref<HTMLElement>()
const cartographer = ref<Cartographer | null>(null)

const isLoading = ref(false)
const error = ref<string | null>(null)

// Initialize cartographer on mount
onMounted(async () => {
  if (!cartographer.value) {
    try {
      cartographer.value = new Cartographer()
      await cartographer.value.init()
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error initializing cartographer'
      console.error('Cartographer initialization error:', err)
    }
  }
  await renderMap()
})

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
    const franceMetropoleArea = 550000
    const scaleFactor = Math.sqrt(props.area / franceMetropoleArea)

    const baseWidth = 500
    const baseHeight = 400

    const proportionalWidth = Math.max(50, Math.min(300, baseWidth * scaleFactor))
    const proportionalHeight = Math.max(40, Math.min(240, baseHeight * scaleFactor))

    return {
      width: Math.round(proportionalWidth),
      height: Math.round(proportionalHeight),
    }
  }

  // Dimensions par défaut
  return { width: props.width, height: props.height }
})

const insetValue = computed(() => {
  return props.isMainland ? 20 : 5
})

// Removed getProjection - now handled directly by Cartographer

async function renderMap() {
  if (!mapContainer.value || !cartographer.value) {
    console.warn('Map container or cartographer not available yet')
    return
  }

  try {
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
      const projectionToUse = props.projection || configStore.selectedProjection

      const options: SimpleRenderOptions = {
        mode: 'simple',
        geoData: props.geoData,
        projection: projectionToUse,
        width,
        height,
        inset: insetValue.value,
        isMainland: props.isMainland,
        area: props.area,
        preserveScale: props.preserveScale,
      }

      plot = await cartographer.value.render(options)
    }

    mapContainer.value.appendChild(plot as any)
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Error rendering map'
    console.error('Error rendering map:', err)
  }
  finally {
    isLoading.value = false
  }
}

async function renderComposite(): Promise<Plot.Plot> {
  if (!cartographer.value) {
    throw new Error('Cartographer not initialized')
  }

  const { width, height } = computedSize.value

  // Build custom composite settings if in custom mode
  let customSettings
  if (configStore.viewMode === 'composite-custom') {
    // Build territory projections
    const territoryProjections: Record<string, string> = {}
    if (configStore.projectionMode === 'individual') {
      Object.assign(territoryProjections, configStore.territoryProjections)
    }
    else {
      // Uniform mode: all territories use the same projection
      TERRITORY_CODES.forEach((code) => {
        territoryProjections[code] = configStore.selectedProjection
      })
    }

    customSettings = {
      territoryProjections,
      territoryTranslations: configStore.territoryTranslations,
      territoryScales: configStore.territoryScales,
    }
  }

  // Determine rendering mode
  const mode = configStore.viewMode === 'composite-custom'
    ? 'composite-custom'
    : 'composite-projection'

  const options: CompositeRenderOptions = {
    mode,
    territoryMode: configStore.territoryMode,
    projection: configStore.compositeProjection || configStore.selectedProjection,
    width,
    height,
    settings: customSettings,
  }

  return await cartographer.value.render(options)
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
      configStore.territoryTranslations,
      configStore.territoryScales,
      configStore.territoryProjections,
    ]
  }
  return [
    props.geoData,
    props.projection,
    configStore.selectedProjection,
    props.preserveScale,
  ]
}, async () => {
  await renderMap()
}, { deep: true })
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
