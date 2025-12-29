<script setup lang="ts">
import { watch } from 'vue'
import MapRenderer from '@/components/MapRenderer.vue'
import { useGeoDataStore } from '@/stores/geoData'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

const projectionStore = useProjectionStore()
const viewStore = useViewStore()
const geoDataStore = useGeoDataStore()

// Watch territory mode changes and reload unified data
watch(() => viewStore.territoryMode, async (newMode) => {
  await geoDataStore.reloadUnifiedData(newMode)
}, { immediate: true })
</script>

<template>
  <MapRenderer
    :geo-data="geoDataStore.rawUnifiedData"
    :projection="projectionStore.selectedProjection"
    :width="800"
    :height="600"
  />
</template>
