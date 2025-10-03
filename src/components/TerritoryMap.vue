<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as Plot from '@observablehq/plot'
import { GeoProjectionService } from '../services/GeoProjectionService'
import { useConfigStore } from '../stores/config'
import type { Territory } from '../stores/geoData'

interface Props {
  territory: Territory
}

const props = defineProps<Props>()
const configStore = useConfigStore()
const mapContainer = ref<HTMLElement>()
const projectionService = new GeoProjectionService()

const getRegionColor = (region: string): string => {
  const regionColors = {
    'North America': '#f8e8ff',
    'Caribbean': '#e8ffe8', 
    'Pacific Ocean': '#fff8e8',
    'Indian Ocean': '#e8e8ff',
    'Other': '#f0f0f0'
  }
  return regionColors[region as keyof typeof regionColors] || '#f0f0f0'
}

const getTerritorySize = (territory: Territory, preserveScale: boolean): { width: number; height: number } => {
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
    height: Math.round(proportionalHeight) 
  }
}

const renderMap = () => {
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
      projection,
      marks: [
        Plot.geo(props.territory.data, {
          fill: getRegionColor(props.territory.region),
          stroke: '#2d4a2d',
          strokeWidth: 0.8
        }),
        Plot.frame({ opacity: 0.2 })
      ]
    })

    mapContainer.value.appendChild(plot)
  } catch (error) {
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
    <div ref="mapContainer" class="territory-map"></div>
  </div>
</template>