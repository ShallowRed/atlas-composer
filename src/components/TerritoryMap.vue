<script setup lang="ts">
import type { Territory } from '@/stores/geoData'
import * as Plot from '@observablehq/plot'
import { onMounted, ref, watch } from 'vue'
import { GeoProjectionService } from '@/services/GeoProjectionService'
import { useConfigStore } from '@/stores/config'
import { getDefaultStrokeColor, getRegionColor } from '@/utils/colorUtils'

interface Props {
  territory: Territory
}

const props = defineProps<Props>()
const configStore = useConfigStore()
const mapContainer = ref<HTMLElement>()
const projectionService = new GeoProjectionService()

function getTerritorySize(territory: Territory, preserveScale: boolean): { width: number, height: number } {
  if (!preserveScale) {
    return { width: 200, height: 160 }
  }

  const franceMetropoleArea = 550000
  const territoryArea = territory.area || 1000
  const scaleFactor = Math.sqrt(territoryArea / franceMetropoleArea)

  const baseWidth = 500
  const baseHeight = 400

  const proportionalWidth = Math.max(50, Math.min(300, baseWidth * scaleFactor))
  const proportionalHeight = Math.max(40, Math.min(240, baseHeight * scaleFactor))

  return {
    width: Math.round(proportionalWidth),
    height: Math.round(proportionalHeight),
  }
}

function renderMap() {
  if (!mapContainer.value) {
    console.warn('Territory map container not available yet')
    return
  }

  if (!props.territory?.data) {
    console.warn('Territory data not available yet')
    return
  }

  try {
    mapContainer.value.innerHTML = ''

    const projection = projectionService.getProjection(configStore.selectedProjection, props.territory.data)
    const { width, height } = getTerritorySize(props.territory, configStore.scalePreservation)

    const plot = Plot.plot({
      width,
      height,
      inset: 5,
      projection,
      marks: [
        Plot.geo(props.territory.data, {
          fill: getRegionColor(props.territory.region),
          stroke: getDefaultStrokeColor(),
        }),
        Plot.frame({ opacity: 0.2 }),
      ],
    })

    mapContainer.value.appendChild(plot)
  }
  catch (error) {
    console.error('Error rendering territory map:', error)
  }
}

onMounted(() => {
  renderMap()
})

watch(() => [configStore.selectedProjection, configStore.scalePreservation], () => {
  renderMap()
}, { deep: true })
</script>

<template>
  <div class="territory-container bg-base-100 border border-base-300 p-4 rounded-md">
    <h4 class="font-medium mb-2 text-sm text-gray-600">
      {{ territory.name }} ({{ territory.area.toLocaleString() }} km²)
    </h4>
    <div ref="mapContainer" class="territory-map map-plot bg-base-200 w-fit" />
  </div>
</template>
