<template>
  <div class="territory-container text-center mb-4">
    <h4 class="font-medium mb-2 text-sm text-gray-600">
      {{ territory.name }} ({{ territory.area.toLocaleString() }} km²)
    </h4>
    <div ref="mapContainer" class="territory-map"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as Plot from '@observablehq/plot'
import { GeoProjectionService } from '../services/GeoProjectionService'

interface Territory {
  name: string
  code: string
  area: number
  region: string
  data: GeoJSON.FeatureCollection
}

interface Props {
  territory: Territory
  projectionType: string
  preserveScale: boolean
}

const props = defineProps<Props>()
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
  if (!mapContainer.value) return

  try {
    mapContainer.value.innerHTML = ''
    
    const projection = projectionService.getProjection(props.projectionType, props.territory.data)
    const { width, height } = getTerritorySize(props.territory, props.preserveScale)
    
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
        Plot.frame({ stroke: '#333' })
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

watch(() => [props.projectionType, props.preserveScale], () => {
  renderMap()
}, { deep: true })
</script>