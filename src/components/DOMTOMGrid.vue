<script setup lang="ts">
import { onMounted } from 'vue'
import RegionContainer from '@/components/RegionContainer.vue'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

const geoDataStore = useGeoDataStore()
const configStore = useConfigStore()

onMounted(async () => {
  // Ensure territory data is loaded
  if (!geoDataStore.domtomTerritoriesData.length) {
    console.log('Loading territory data...')
    await geoDataStore.loadTerritoryData()
  }
})
</script>

<template>
  <div class="domtom-grid flex flex-col gap-4">
    <RegionContainer
      v-for="[regionName, territories] in geoDataStore.territoryGroups"
      :key="regionName"
      :region-name="regionName"
      :territories="territories"
    />
    <div v-if="geoDataStore.filteredTerritories.length === 0" class="text-center p-4 text-gray-500">
      <p>Aucun territoire d'outre-mer disponible.</p>
      <p class="text-sm mt-2">
        Mode: {{ configStore.territoryMode }}
      </p>
      <p class="text-sm">
        Vérifiez les données ou changez le mode de sélection des territoires.
      </p>
    </div>
  </div>
</template>
