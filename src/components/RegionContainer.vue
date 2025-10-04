<script setup lang="ts">
import type { Territory } from '@/stores/geoData'
import MapRenderer from '@/components/MapRenderer.vue'
import { useConfigStore } from '@/stores/config'

interface Props {
  regionName: string
  territories: Territory[]
}

defineProps<Props>()

const configStore = useConfigStore()
</script>

<template>
  <div class="bg-base-200 border border-base-300 p-4 rounded-lg">
    <h3 class="text-lg font-semibold mb-4 text-gray-700">
      {{ regionName }}
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="territory in territories"
        :key="territory.code"
        class="bg-base-100 border border-base-300 p-4 rounded-md"
      >
        <MapRenderer
          :geo-data="territory.data"
          :title="territory.name"
          :area="territory.area"
          :region="territory.region"
          :preserve-scale="configStore.scalePreservation"
          :width="200"
          :height="160"
        />
      </div>
    </div>
  </div>
</template>
