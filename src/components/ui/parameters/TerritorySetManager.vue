<script setup lang="ts">
import type { TerritoryCode } from '@/types/branded'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { filterCollectionSetsByType, useCollectionSet } from '@/composables/useCollectionSet'
import { getAtlasSpecificConfig, isAtlasLoaded } from '@/core/atlases/registry'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useViewStore } from '@/stores/view'

const { t } = useI18n()
const atlasStore = useAtlasStore()
const viewStore = useViewStore()
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

const loadedTerritories = computed(() => {
  return geoDataStore.territoriesData
})

const activeTerritories = computed(() => {
  return geoDataStore.filteredTerritories
})

const activeTerritoryCodesSet = computed(() => {
  return new Set(activeTerritories.value.map(t => t.code))
})

const atlasCollections = computed(() => {
  const atlasId = atlasStore.selectedAtlasId
  if (!isAtlasLoaded(atlasId)) {
    return undefined
  }

  const atlasSpecificConfig = getAtlasSpecificConfig(atlasId)
  return atlasSpecificConfig.territoryCollections
})

const availableCollectionSets = computed(() => {
  const collections = atlasCollections.value
  if (!collections) {
    return []
  }

  const allowedKeys = filterCollectionSetsByType(collections, 'mutually-exclusive')

  return Object.entries(collections)
    .filter(([key]) => allowedKeys.includes(key))
    .map(([key, value]) => ({
      id: key,
      label: value.label,
    }))
})

const defaultCollectionSet = useCollectionSet('territoryManager', 'mutually-exclusive')

const selectedCollectionSet = ref<string | undefined>(defaultCollectionSet.value)

watch(() => defaultCollectionSet.value, (newDefault) => {
  selectedCollectionSet.value = newDefault
}, { immediate: true })

const collectionSetToDisplay = computed(() => {
  if (selectedCollectionSet.value && atlasCollections.value?.[selectedCollectionSet.value]) {
    return selectedCollectionSet.value
  }

  return defaultCollectionSet.value
})

const territoryGroups = computed((): TerritoryGroup[] => {
  const collections = atlasCollections.value

  const currentAtlasId = atlasStore.selectedAtlasId
  if (!isAtlasLoaded(currentAtlasId)) {
    return []
  }

  if (!collections) {
    return []
  }

  const collectionSetKey = collectionSetToDisplay.value
  if (!collectionSetKey) {
    const allTerritories = loadedTerritories.value
      .map(territory => ({
        code: territory.code,
        name: territory.name,
        isActive: activeTerritoryCodesSet.value.has(territory.code),
      }))

    if (allTerritories.length === 0) {
      return []
    }

    return [{
      id: 'all-territories',
      label: '',
      territories: allTerritories,
    }]
  }

  const collectionSet = collections[collectionSetKey]
  if (!collectionSet) {
    return []
  }

  const territoriesByCode = new Map(loadedTerritories.value.map(t => [t.code, t]))

  return collectionSet.collections
    .map(collection => ({
      id: collection.id,
      label: collection.label,
      territories: collection.codes
        .filter(code => code !== '*' && territoriesByCode.has(code as TerritoryCode))
        .map((code) => {
          const territory = territoriesByCode.get(code as TerritoryCode)!
          return {
            code,
            name: territory.name,
            isActive: activeTerritoryCodesSet.value.has(code as TerritoryCode),
          }
        }),
    }))
    .filter(group => group.territories.length > 0)
})

function toggleTerritory(code: string, isActive: boolean) {
  if (isActive) {
    viewStore.removeTerritoryFromComposite(code as TerritoryCode)
  }
  else {
    viewStore.addTerritoryToComposite(code as TerritoryCode)
  }
  geoDataStore.triggerRender()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Collection Set Selector -->
    <div
      v-if="availableCollectionSets.length > 1"
      class="space-y-2"
    >
      <label class="label">
        <span class="label-text text-xs font-medium">
          {{ t('territory.setManager.groupingLogic') }}
        </span>
      </label>
      <select
        v-model="selectedCollectionSet"
        class="select select-sm w-full"
      >
        <option
          v-for="collectionSet in availableCollectionSets"
          :key="collectionSet.id"
          :value="collectionSet.id"
        >
          {{ collectionSet.label }}
        </option>
      </select>
    </div>

    <!-- Territory Groups -->
    <div
      v-for="group in territoryGroups"
      :key="group.id"
      class="space-y-2"
    >
      <!-- Group Label (only show if label is not empty) -->
      <div
        v-if="group.label"
        class="text-xs font-medium text-base-content/70"
      >
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
