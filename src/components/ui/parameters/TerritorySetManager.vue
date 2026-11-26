<script setup lang="ts">
import type { TerritoryGroup } from '@/composables/useTerritoryGroups'
import type { TerritoryCode } from '@/types/branded'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { filterCollectionSetsByType, useCollectionSet } from '@/composables/useCollectionSet'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useTerritoryGroups } from '@/composables/useTerritoryGroups'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import { useGeoDataStore } from '@/stores/geoData'
import { useViewStore } from '@/stores/view'

const { t } = useI18n()
const { localize } = useLocalizedName()
const atlasStore = useAtlasStore()
const compositionStore = useCompositionStore()
const viewStore = useViewStore()
const geoDataStore = useGeoDataStore()

type ToggledGroup = Omit<TerritoryGroup, 'territories'> & {
  territories: Array<TerritoryGroup['territories'][number] & { isActive: boolean }>
}

const activeTerritories = computed(() => {
  return geoDataStore.filteredTerritories
})

const activeTerritoryCodesSet = computed(() => {
  return new Set(activeTerritories.value.map(t => t.code))
})

const atlasCollections = computed(() => atlasStore.territoryCollections)

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
      label: localize(value.label),
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

const groupsOfCollectionSet = useTerritoryGroups(collectionSetToDisplay)

// An atlas without territory collections lists no territory to toggle
const territoryGroups = computed((): ToggledGroup[] => {
  if (!atlasCollections.value) {
    return []
  }
  return groupsOfCollectionSet.value.map(group => ({
    ...group,
    territories: group.territories.map(territory => ({ ...territory, isActive: activeTerritoryCodesSet.value.has(territory.code) })),
  }))
})

function toggleTerritory(code: TerritoryCode, isActive: boolean) {
  if (isActive) {
    viewStore.removeTerritoryFromComposite(code)
  }
  else {
    compositionStore.addTerritoryToComposite(code)
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
