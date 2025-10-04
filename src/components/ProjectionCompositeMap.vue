<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

const mapContainer = ref<HTMLElement>()
const geoDataStore = useGeoDataStore()
const configStore = useConfigStore()

const isLoading = ref(false)
const error = ref<string | null>(null)

async function renderMap() {
  if (!mapContainer.value) {
    console.warn('Projection composite map container not available yet')
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
    await geoDataStore.renderProjectionComposite(mapContainer.value)
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Error rendering projection composite map'
    console.error('Projection composite render error:', err)
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await nextTick() // Ensure DOM is ready
  await renderMap()
})

// Watch for changes in configuration (projection and territory mode)
watch(
  () => [configStore.selectedProjection, configStore.territoryMode],
  async () => {
    await renderMap()
  },
  { deep: true },
)
</script>

<template>
  <div class="projection-composite-map">
    <div v-if="isLoading" class="text-center p-8">
      <div class="loading loading-spinner loading-lg text-primary" />
      <p>Chargement de la vue projection composite...</p>
    </div>
    <div v-if="error" class="alert alert-error">
      <span>{{ error }}</span>
    </div>
    <div ref="mapContainer" class="map-plot w-fit bg-base-200" :style="{ display: isLoading || error ? 'none' : 'block' }" />
  </div>
</template>
