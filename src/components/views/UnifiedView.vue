<script setup lang="ts">
import MapRenderer from '@/components/MapRenderer.vue'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()
</script>

<template>
  <MapRenderer
    :geo-data="geoDataStore.rawUnifiedData"
    :projection="configStore.selectedProjection"
    :width="800"
    :height="600"
  />
</template>
