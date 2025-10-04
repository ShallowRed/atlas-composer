<script setup lang="ts">
import type { Territory } from '@/stores/geoData'
import TerritoryMap from '@/components/TerritoryMap.vue'

interface Props {
  regionName: string
  territories: Territory[]
}

defineProps<Props>()
</script>

<template>
  <div class="bg-base-200 border border-base-300 p-4 rounded-lg">
    <h3 class="text-lg font-semibold mb-4 text-gray-700">
      {{ regionName }}
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <TerritoryMap
        v-for="territory in territories"
        :key="territory.code"
        :territory="territory"
      />
    </div>
  </div>
</template>
