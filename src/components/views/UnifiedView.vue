<script setup lang="ts">
import { watch } from 'vue'
import MapRenderer from '@/components/MapRenderer.vue'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

// Watch territory mode changes and reload unified data
watch(() => configStore.territoryMode, async (newMode) => {
  await geoDataStore.reloadUnifiedData(newMode)
}, { immediate: true })
</script>

<template>
  <MapRenderer
    :geo-data="geoDataStore.rawUnifiedData"
    :projection="configStore.selectedProjection"
    :width="800"
    :height="600"
  />
</template>
