<script setup lang="ts">
import * as Plot from '@observablehq/plot'
import { computed, onMounted, ref, watch } from 'vue'
import { GeoProjectionService } from '@/services/GeoProjectionService'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { getTerritoryFillColor, getTerritoryStrokeColor } from '@/utils/colorUtils'

interface Props {
  // For simple territory maps
  geoData?: GeoJSON.FeatureCollection | null
  title?: string
  area?: number
  region?: string
  isMetropolitan?: boolean
  preserveScale?: boolean
  width?: number
  height?: number
  projection?: string // Optional projection override for individual mode

  // For composite maps
  mode?: 'simple' | 'composite'
}

const props = withDefaults(defineProps<Props>(), {
  geoData: null,
  isMetropolitan: false,
  preserveScale: false,
  width: 200,
  height: 160,
  mode: 'simple',
})

const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()
const mapContainer = ref<HTMLElement>()
const projectionService = new GeoProjectionService()

const isLoading = ref(false)
const error = ref<string | null>(null)

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
  if (props.isMetropolitan) {
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
  return props.isMetropolitan ? 20 : 5
})

function getProjection() {
  if (!props.geoData)
    return null

  // Use provided projection or fall back to store's selected projection
  const projectionToUse = props.projection || configStore.selectedProjection

  // Use specialized projection for metropolitan France
  if (props.isMetropolitan && projectionToUse === 'albers') {
    return {
      type: 'conic-conformal' as const,
      parallels: [45.898889, 47.696014] as [number, number],
      rotate: [-3, 0] as [number, number],
      domain: props.geoData,
    }
  }

  return projectionService.getProjection(projectionToUse, props.geoData)
}

async function renderMap() {
  if (!mapContainer.value) {
    console.warn('Map container not available yet')
    return
  }

  try {
    isLoading.value = true
    error.value = null
    mapContainer.value.innerHTML = ''

    // Handle composite mode
    if (props.mode === 'composite') {
      await renderComposite()
      return
    }

    // Handle simple mode
    if (!props.geoData) {
      console.warn('No geo data available')
      return
    }

    const projection = getProjection()
    if (!projection) {
      console.warn('Could not create projection')
      return
    }

    const { width, height } = computedSize.value

    const plot = Plot.plot({
      width,
      height,
      inset: insetValue.value,
      projection,
      marks: [
        Plot.geo(props.geoData, {
          fill: getTerritoryFillColor(),
          stroke: getTerritoryStrokeColor(),
          strokeWidth: props.isMetropolitan ? 1.2 : 1,
        }),
      ],
    })

    mapContainer.value.appendChild(plot)
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Error rendering map'
    console.error('Error rendering map:', err)
  }
  finally {
    isLoading.value = false
  }
}

async function renderComposite() {
  if (!geoDataStore.cartographer) {
    await geoDataStore.initialize()
  }

  await geoDataStore.updateCartographerSettings()

  // Choose rendering method based on view mode
  if (configStore.viewMode === 'composite-custom') {
    // Custom composite with individual projections per territory
    await geoDataStore.renderCustomComposite(mapContainer.value!)
  }
  else if (configStore.viewMode === 'composite-existing') {
    // Existing composite projection (albers-france or conic-conformal-france)
    await geoDataStore.renderProjectionComposite(mapContainer.value!)
  }
}

onMounted(() => {
  renderMap()
})

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

    <div v-if="isLoading" class="text-center p-8">
      <div class="loading loading-spinner loading-lg text-primary" />
      <p>Chargement de la carte...</p>
    </div>

    <div v-if="error" class="alert alert-error">
      <span>{{ error }}</span>
    </div>

    <div
      ref="mapContainer"
      class="map-plot bg-base-200 w-fit rounded-sm border border-base-300"
      :style="{ display: isLoading || error ? 'none' : 'block' }"
    />
  </div>
</template>
