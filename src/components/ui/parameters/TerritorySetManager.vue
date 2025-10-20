<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAtlasBehavior, getAtlasSpecificConfig, isAtlasLoaded } from '@/core/atlases/registry'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

const { t } = useI18n()
const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

interface TerritoryItem {
  code: string
  name: string
  isActive: boolean
}

interface TerritoryGroup {
  id: string
  label: string
  territories: TerritoryItem[]
}

// Get all territories that were loaded from the preset
const loadedTerritories = computed(() => {
  return geoDataStore.overseasTerritoriesData
})

// Get territories that are currently active (included in composite)
const activeTerritories = computed(() => {
  return geoDataStore.overseasTerritories
})

// Get the active territory codes as a Set for quick lookup
const activeCodes = computed(() => {
  return new Set(activeTerritories.value.map(t => t.code))
})

// Get atlas territory collections configuration
const atlasCollections = computed(() => {
  const atlasId = configStore.selectedAtlas
  if (!isAtlasLoaded(atlasId)) {
    return undefined
  }

  const atlasSpecificConfig = getAtlasSpecificConfig(atlasId)
  return atlasSpecificConfig.territoryCollections
})

// Get which collection set to display from registry behavior
const collectionSetToDisplay = computed(() => {
  const atlasId = configStore.selectedAtlas
  const behavior = getAtlasBehavior(atlasId)
  return behavior?.ui?.territoryManager?.collectionSet ?? 'geographic'
})

// Group territories according to atlas configuration
const territoryGroups = computed((): TerritoryGroup[] => {
  const collections = atlasCollections.value
  if (!collections) {
    return []
  }

  const collectionSet = collections[collectionSetToDisplay.value]
  if (!collectionSet) {
    return []
  }

  const mainlandCode = configStore.currentAtlasConfig?.splitModeConfig?.mainlandCode
  const territoriesByCode = new Map(loadedTerritories.value.map(t => [t.code, t]))

  // Convert territory collections to TerritoryGroup[]
  return collectionSet.collections
    .map(collection => ({
      id: collection.id,
      label: collection.label,
      territories: collection.codes
        .filter(code => code !== mainlandCode && code !== '*' && territoriesByCode.has(code))
        .map((code) => {
          const territory = territoriesByCode.get(code)!
          return {
            code,
            name: territory.name,
            isActive: activeCodes.value.has(code),
          }
        }),
    }))
    .filter(group => group.territories.length > 0)
})

function toggleTerritory(code: string, isActive: boolean) {
  if (isActive) {
    configStore.removeTerritoryFromComposite(code)
  }
  else {
    configStore.addTerritoryToComposite(code)
  }
  // Trigger re-render
  geoDataStore.triggerRender()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Territory Groups -->
    <div
      v-for="group in territoryGroups"
      :key="group.id"
      class="space-y-2"
    >
      <!-- Group Label -->
      <div class="text-xs font-medium text-base-content/70">
        {{ group.label }}
      </div>

      <!-- Territory Tags -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="territory in group.territories"
          :key="territory.code"
          class="btn btn-xs transition-all"
          :class="territory.isActive ? 'btn-soft' : 'btn-ghost'"
          :title="territory.isActive
            ? t('territory.setManager.remove', 'Click to remove')
            : t('territory.setManager.add', 'Click to add')"
          @click="toggleTerritory(territory.code, territory.isActive)"
        >
          <i
            v-if="territory.isActive"
            class="ri-close-line text-error"
          />
          <i
            v-else
            class="ri-add-line text-success"
          />
          {{ territory.name }}
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="territoryGroups.length === 0"
      class="text-xs text-base-content/40 italic text-center py-4"
    >
      {{ t('territory.setManager.noCollections', 'No territory collections available') }}
    </div>
  </div>
</template>
