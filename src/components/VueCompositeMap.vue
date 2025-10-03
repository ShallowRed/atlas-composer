<template>
  <div class="vue-composite-map">
    <div v-if="isLoading" class="text-center p-8">
      <div class="loading loading-spinner loading-lg text-primary"></div>
      <p>Chargement de la vue composite...</p>
    </div>
    <div v-if="error" class="alert alert-error">
      <span>{{ error }}</span>
    </div>
    <div ref="mapContainer" class="map-plot" :style="{ display: isLoading || error ? 'none' : 'block' }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useGeoDataStore } from '../stores/geoData'
import { useConfigStore } from '../stores/config'

const mapContainer = ref<HTMLElement>()
const geoDataStore = useGeoDataStore()
const configStore = useConfigStore()

const isLoading = ref(false)
const error = ref<string | null>(null)

const renderMap = async () => {
  if (!mapContainer.value) {
    console.warn('Vue composite map container not available yet')
    return
  }
  
  try {
    isLoading.value = true
    error.value = null
    
    // Ensure the cartographer is initialized
    if (!geoDataStore.cartographer) {
      await geoDataStore.initialize()
    }
    
    await geoDataStore.updateCartographerSettings()
    await geoDataStore.renderVueComposite(mapContainer.value)
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error rendering composite map'
    console.error('Vue composite render error:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await nextTick() // Ensure DOM is ready
  await renderMap()
})

// Watch for changes in configuration
watch(
  () => [
    configStore.selectedProjection,
    configStore.territoryMode,
    configStore.scalePreservation,
    configStore.territoryTranslations,
    configStore.territoryScales
  ],
  async () => {
    await renderMap()
  },
  { deep: true }
)
</script>