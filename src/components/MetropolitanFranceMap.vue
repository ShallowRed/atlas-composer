<template>
  <div class="metropolitan-france-map">
    <div ref="mapContainer" class="map-plot"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as Plot from '@observablehq/plot'
import { GeoProjectionService } from '../services/GeoProjectionService'

interface Props {
  geoData: GeoJSON.FeatureCollection
  projectionType: string
}

const props = defineProps<Props>()
const mapContainer = ref<HTMLElement>()
const projectionService = new GeoProjectionService()

const renderMap = () => {
  if (!mapContainer.value || !props.geoData) return

  try {
    mapContainer.value.innerHTML = ''
    
    // Use specialized projection for metropolitan France (like original)
    const projection = props.projectionType === 'albers' 
      ? {
          type: 'conic-conformal' as const,
          parallels: [45.898889, 47.696014] as [number, number],
          rotate: [-3, 0] as [number, number],
          domain: props.geoData
        }
      : projectionService.getProjection(props.projectionType, props.geoData)

    const plot = Plot.plot({
      width: 500,
      height: 400,
      projection,
      marks: [
        Plot.geo(props.geoData, {
          fill: '#e8f5e8',
          stroke: '#2d5a2d',
          strokeWidth: 1.2
        }),
        Plot.frame({ stroke: '#333', strokeWidth: 1 })
      ]
    })
    
    mapContainer.value.appendChild(plot)
  } catch (error) {
    console.error('Error rendering metropolitan France map:', error)
  }
}

onMounted(() => {
  renderMap()
})

watch(() => [props.geoData, props.projectionType], () => {
  renderMap()
}, { deep: true })
</script>