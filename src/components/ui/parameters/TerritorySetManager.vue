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

// Get all territories that were loaded from the preset
const loadedTerritories = computed(() => {
  return geoDataStore.territoriesData
})

// Get territories that are currently active (included in composite)
const activeTerritories = computed(() => {
  return geoDataStore.filteredTerritories
})

// Get the active territory codes as a Set for quick lookup
const activeCodes = computed(() => {
  return new Set(activeTerritories.value.map(t => t.code))
})

// Get atlas territory collections configuration
const atlasCollections = computed(() => {
  const atlasId = atlasStore.selectedAtlasId
  if (!isAtlasLoaded(atlasId)) {
    return undefined
  }

  const atlasSpecificConfig = getAtlasSpecificConfig(atlasId)
  return atlasSpecificConfig.territoryCollections
})

// Get available collection sets (only mutually-exclusive ones for territoryManager)
const availableCollectionSets = computed(() => {
  const collections = atlasCollections.value
  if (!collections) {
    return []
  }

  // Filter to only show mutually-exclusive collection sets
  const allowedKeys = filterCollectionSetsByType(collections, 'mutually-exclusive')

  return Object.entries(collections)
    .filter(([key]) => allowedKeys.includes(key))
    .map(([key, value]) => ({
      id: key,
      label: value.label,
    }))
})

// Get the default collection set from registry behavior
const defaultCollectionSet = useCollectionSet('territoryManager', 'mutually-exclusive')

// Local state for selected collection set (initialized reactively with default from registry)
const selectedCollectionSet = ref<string | undefined>(defaultCollectionSet.value)

// Watch for changes to default (e.g., when switching atlases)
watch(() => defaultCollectionSet.value, (newDefault) => {
  selectedCollectionSet.value = newDefault
}, { immediate: true })

// Get which collection set to display - use local state or fallback to default
const collectionSetToDisplay = computed(() => {
  // If user has manually selected a collection set, use that
  if (selectedCollectionSet.value && atlasCollections.value?.[selectedCollectionSet.value]) {
    return selectedCollectionSet.value
  }

  // Otherwise use the default from registry
  return defaultCollectionSet.value
})

// Group territories according to atlas configuration
const territoryGroups = computed((): TerritoryGroup[] => {
  const collections = atlasCollections.value

  // Guard: Ensure atlas is fully loaded before accessing data
  const currentAtlasId = atlasStore.selectedAtlasId
  if (!isAtlasLoaded(currentAtlasId)) {
    return []
  }

  if (!collections) {
    return []
  }

  const collectionSetKey = collectionSetToDisplay.value
  if (!collectionSetKey) {
    // Fallback: create single group with all territories
    const allTerritories = loadedTerritories.value
      .map(territory => ({
        code: territory.code,
        name: territory.name,
        isActive: activeCodes.value.has(territory.code),
      }))

    if (allTerritories.length === 0) {
      return []
    }

    return [{
      id: 'all-territories',
      label: '', // Empty label so no group title is shown
      territories: allTerritories,
    }]
  }

  const collectionSet = collections[collectionSetKey]
  if (!collectionSet) {
    return []
  }

  const territoriesByCode = new Map(loadedTerritories.value.map(t => [t.code, t]))

  // Convert territory collections to TerritoryGroup[]
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
            isActive: activeCodes.value.has(code as TerritoryCode),
          }
        }),
    }))
    .filter(group => group.territories.length > 0)
})

function toggleTerritory(code: string, isActive: boolean) {
  // Convert: code from template is string, store expects TerritoryCode
  if (isActive) {
    viewStore.removeTerritoryFromComposite(code as TerritoryCode)
  }
  else {
    viewStore.addTerritoryToComposite(code as TerritoryCode)
  }
  // Trigger re-render
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
