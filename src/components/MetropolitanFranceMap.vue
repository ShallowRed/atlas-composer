<script setup lang="ts">
import * as Plot from '@observablehq/plot'
import { nextTick, onMounted, ref, watch } from 'vue'
import { GeoProjectionService } from '@/services/GeoProjectionService'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { getDefaultStrokeColor, getMetropolitanFranceColor } from '@/utils/colorUtils'

const geoDataStore = useGeoDataStore()
const configStore = useConfigStore()
const mapContainer = ref<HTMLElement>()
const projectionService = new GeoProjectionService()

async function renderMap() {
  if (!mapContainer.value) {
    console.warn('Map container not available yet')
    return
  }

  // Ensure data is loaded
  if (!geoDataStore.metropolitanFranceData) {
    console.log('Loading metropolitan France data...')
    await geoDataStore.loadTerritoryData()
  }

  const geoData = geoDataStore.metropolitanFranceData
  if (!geoData) {
    console.warn('No metropolitan France data available')
    return
  }

  try {
    mapContainer.value.innerHTML = ''

    // Use specialized projection for metropolitan France (like original)
    const projection = configStore.selectedProjection === 'albers'
      ? {
          type: 'conic-conformal' as const,
          parallels: [45.898889, 47.696014] as [number, number],
          rotate: [-3, 0] as [number, number],
          domain: geoData,
        }
      : projectionService.getProjection(configStore.selectedProjection, geoData)

    const plot = Plot.plot({
      width: 500,
      height: 400,
      inset: 20,
      projection,
      marks: [
        Plot.geo(geoData, {
          fill: getMetropolitanFranceColor(),
          stroke: getDefaultStrokeColor(),
          strokeWidth: 1.2,
        }),
        Plot.frame({ opacity: 0.2 }),
      ],
    })

    mapContainer.value.appendChild(plot)
  }
  catch (error) {
    console.error('Error rendering metropolitan France map:', error)
  }
}

onMounted(async () => {
  await nextTick() // Ensure DOM is ready

  // Add a small delay to ensure the container is fully initialized
  setTimeout(async () => {
    await renderMap()
  }, 100)
})

watch(() => [geoDataStore.metropolitanFranceData, configStore.selectedProjection], async () => {
  await renderMap()
}, { deep: true })
</script>

<template>
  <div class="metropolitan-france-map">
    <div ref="mapContainer" class="map-plot bg-base-200 w-fit" />
  </div>
</template>
