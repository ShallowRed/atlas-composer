<template>
  <div class="region-container mb-6">
    <h3 class="text-lg font-semibold mb-4 text-gray-700">{{ regionName }}</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <TerritoryMapComponent
        v-for="territory in territories"
        :key="territory.code"
        :territory="territory"
        :projection-type="projectionType"
        :preserve-scale="preserveScale"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TerritoryMapComponent from './TerritoryMapComponent.vue'

interface Territory {
  name: string
  code: string
  area: number
  region: string
  data: GeoJSON.FeatureCollection
}

interface Props {
  regionName: string
  territories: Territory[]
  projectionType: string
  preserveScale: boolean
}

defineProps<Props>()
</script>