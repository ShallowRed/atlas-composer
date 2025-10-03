<template>
  <div class="domtom-grid">
    <RegionContainer
      v-for="[regionName, territories] in territoryGroups"
      :key="regionName"
      :region-name="regionName"
      :territories="territories"
      :projection-type="projectionType"
      :preserve-scale="preserveScale"
    />
    <div v-if="filteredTerritories.length === 0" class="text-center p-4 text-gray-500">
      <p>Aucun territoire d'outre-mer disponible.</p>
      <p class="text-sm mt-2">Mode: {{ territoryMode }}</p>
      <p class="text-sm">Vérifiez les données ou changez le mode de sélection des territoires.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RegionContainer from './RegionContainer.vue'

interface Territory {
  name: string
  code: string
  area: number
  region: string
  data: GeoJSON.FeatureCollection
}

interface Props {
  territories: Territory[]
  projectionType: string
  preserveScale: boolean
  territoryMode: string
}

const props = defineProps<Props>()

const filteredTerritories = computed(() => {
  if (!props.territories) return []
  
  switch (props.territoryMode) {
    case 'metropole-only':
      return []
    case 'metropole-major':
      return props.territories.filter(territory => 
        territory && territory.code && ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT'].includes(territory.code)
      )
    case 'metropole-uncommon':
      return props.territories.filter(territory => 
        territory && territory.code && ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT', 'FR-MF', 'FR-PF', 'FR-NC'].includes(territory.code)
      )
    case 'all-territories':
    default:
      return props.territories.filter(territory => 
        territory && territory.code && ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT', 'FR-MF', 'FR-PF', 'FR-NC', 'FR-TF', 'FR-WF', 'FR-PM'].includes(territory.code)
      )
  }
})

const territoryGroups = computed(() => {
  const groups = new Map<string, Territory[]>()
  
  for (const territory of filteredTerritories.value) {
    const region = territory.region || 'Other'
    if (!groups.has(region)) {
      groups.set(region, [])
    }
    groups.get(region)!.push(territory)
  }
  
  return groups
})
</script>