<script setup lang="ts">
import type { GeoProjection } from 'd3-geo'
import { computed, ref, watch } from 'vue'
import { useGeoDataStore } from '../stores/geoData'
import { plotCartography } from '../utils/plotHelper'

const props = defineProps<{
  projection: () => GeoProjection
  title?: string
}>()

const geoDataStore = useGeoDataStore()
const plotContainer = ref<HTMLDivElement>()
const isLoading = ref(true)

// Récupérer les données géographiques
const geoData = computed(() => geoDataStore.rawUnifiedData)

// Régions simplifiées pour les tooltips
const regions = [
  { name: 'Île-de-France', code: '11' },
  { name: 'Provence-Alpes-Côte d\'Azur', code: '93' },
  { name: 'Auvergne-Rhône-Alpes', code: '84' },
  { name: 'Guyane', code: '03' },
  { name: 'Martinique', code: '02' },
  { name: 'Guadeloupe', code: '01' },
  { name: 'Mayotte', code: '06' },
  { name: 'La Réunion', code: '04' },
]

// Générer le plot quand les données ou la projection changent
watch(
  [geoData, () => props.projection],
  () => {
    if (!plotContainer.value || !geoData.value)
      return

    isLoading.value = true

    try {
      const plot = plotCartography(
        geoData.value,
        regions,
        props.projection(),
      )
      plotContainer.value.innerHTML = ''
      plotContainer.value.appendChild(plot)
    }
    catch (error) {
      console.error('Erreur lors du rendu de la projection:', error)
    }
    finally {
      isLoading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="projection-preview">
    <h3
      v-if="title"
      class="preview-title"
    >
      {{ title }}
    </h3>

    <div
      v-if="isLoading"
      class="preview-loading"
    >
      <span class="loading loading-spinner loading-lg" />
      <p>Chargement de la projection...</p>
    </div>

    <div
      ref="plotContainer"
      class="preview-plot"
    />
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.projection-preview {
  @apply w-full;
}

.preview-title {
  @apply text-lg font-semibold mb-4;
}

.preview-loading {
  @apply flex flex-col items-center justify-center py-12 gap-4;
}

.preview-plot {
  @apply w-full flex items-center justify-center;
}
</style>
