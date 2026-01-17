<script setup lang="ts">
import type { Territory } from '@/stores/geoData'
import type { TerritoryCode } from '@/types/branded'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MapRenderer from '@/components/MapRenderer.vue'
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { filterCollectionSetsByType, useCollectionSet } from '@/composables/useCollectionSet'
import { useProjectionConfig } from '@/composables/useProjectionConfig'
import { getAtlasSpecificConfig, isAtlasLoaded } from '@/core/atlases/registry'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useProjectionStore } from '@/stores/projection'
import { createTerritoryCode } from '@/types/branded'

const { t } = useI18n()
const atlasStore = useAtlasStore()
const projectionStore = useProjectionStore()
const geoDataStore = useGeoDataStore()

const { getTerritoryProjection } = useProjectionConfig()

// Safe accessor for territories title with fallback
const territoriesTitle = computed(() =>
  atlasStore.currentAtlasConfig?.splitModeConfig?.territoriesTitle ?? 'territory.territories',
)

/**
 * Get atlas territory collections configuration
 */
const atlasCollections = computed(() => {
  const atlasId = atlasStore.selectedAtlasId
  if (!isAtlasLoaded(atlasId)) {
    return undefined
  }

  const atlasSpecificConfig = getAtlasSpecificConfig(atlasId)
  return atlasSpecificConfig.territoryCollections
})

/**
 * Get the default grouping from registry behavior
 * Uses territoryGroups config for split/unified views visual grouping
 */
const defaultGrouping = useCollectionSet('territoryGroups', 'mutually-exclusive')

/**
 * Local state for selected grouping strategy
 * Initialized with default from registry, can be changed by user
 */
const selectedGrouping = ref<string | undefined>(defaultGrouping.value)

// Watch for atlas changes to reset grouping to default
watch(() => atlasStore.selectedAtlasId, () => {
  selectedGrouping.value = defaultGrouping.value
}, { immediate: true })

// Watch default grouping changes (e.g., when atlas loads)
watch(defaultGrouping, (newDefault) => {
  selectedGrouping.value = newDefault
}, { immediate: true })

/**
 * Grouping options for dropdown
 * Only show mutually-exclusive collection sets (filter out incremental ones)
 */
const groupingOptions = computed(() => {
  if (!atlasCollections.value) {
    return []
  }

  // Filter to only show mutually-exclusive collection sets
  const allowedKeys = filterCollectionSetsByType(atlasCollections.value, 'mutually-exclusive')

  return Object.entries(atlasCollections.value)
    .filter(([key]) => allowedKeys.includes(key))
    .map(([key, collectionSet]) => ({
      value: key,
      label: collectionSet.label,
      translated: false, // Will be translated by i18n
    }))
})

/**
 * Group territories by collection
 * Uses atlas territoryCollections configuration for grouping
 * Since we only use mutually-exclusive collection sets, territories won't appear in multiple groups
 */
const territoryGroups = computed<Map<string, Territory[]>>(() => {
  const collections = atlasCollections.value
  const territories = geoDataStore.filteredTerritories

  // Guard: Ensure we're looking at the right atlas's data
  // If atlas is loading, territories might be stale from previous atlas
  const currentAtlasId = atlasStore.selectedAtlasId
  if (!isAtlasLoaded(currentAtlasId)) {
    return new Map()
  }

  if (!collections || !territories || territories.length === 0) {
    return new Map()
  }

  const collectionSetKey = selectedGrouping.value
  if (!collectionSetKey) {
    // No collection set defined - show all territories without grouping
    if (territories.length === 0) {
      return new Map()
    }

    // Use empty string as key so no group title is rendered
    return new Map([['', territories]])
  }

  const collectionSet = collections[collectionSetKey]
  if (!collectionSet) {
    return new Map()
  }

  const territoriesByCode = new Map(territories.map(t => [t.code, t]))

  // Convert territory collections to Map<label, Territory[]>
  const groups = new Map<string, Territory[]>()

  for (const collection of collectionSet.collections) {
    const groupTerritories = collection.codes
      .filter(code => code !== '*' && territoriesByCode.has(code as TerritoryCode))
      .map(code => territoriesByCode.get(code as TerritoryCode)!)
      .filter(t => t !== undefined)

    if (groupTerritories.length > 0) {
      groups.set(collection.label, groupTerritories)
    }
  }

  return groups
})

/**
 * Check if we should use grouped display (has groups defined)
 */
const hasGroups = computed(() => territoryGroups.value.size > 0)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Grouping dropdown -->
    <DropdownControl
      v-if="groupingOptions.length > 1"
      v-model="selectedGrouping"
      :label="t('territory.groupBy')"
      icon="ri-group-line"
      :options="groupingOptions"
      class="max-w-xs"
    />

    <div>
      <h3 class="text-base font-semibold mb-4">
        <i class="ri-map-pin-line" />
        {{ t(territoriesTitle) }}
      </h3>

      <!-- Grouped display -->
      <div
        v-if="hasGroups"
        class="join join-vertical w-full"
      >
        <div
          v-for="[regionName, territories] in territoryGroups"
          :key="regionName || 'ungrouped'"
          class="join-item border border-base-300 p-3 bg-base-200/25"
        >
          <h4
            v-if="regionName"
            class="text-sm font-semibold mb-2"
          >
            {{ regionName }}
          </h4>
          <div class="flex flex-wrap gap-4">
            <div
              v-for="territory in territories"
              :key="territory.code"
            >
              <h5 class="text-xs font-medium mb-1">
                {{ territory.name }} <span class="text-base-content/50">({{ territory.code }})</span>
              </h5>
              <MapRenderer
                :geo-data="territory.data"
                :title="territory.name"
                :area="territory.area"
                :region="territory.region"
                :preserve-scale="projectionStore.scalePreservation"
                :projection="getTerritoryProjection(territory.code)"
                :territory-code="createTerritoryCode(territory.code)"
                :full-height="false"
                :h-level="4"
                :width="200"
                :height="160"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Flat grid display (fallback when no groups) -->
      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div
          v-for="territory in geoDataStore.filteredTerritories"
          :key="territory.code"
          class="flex flex-col"
        >
          <h4 class="text-sm font-medium mb-1">
            {{ territory.name }} <span class="text-base-content/50">({{ territory.code }})</span>
          </h4>
          <MapRenderer
            :geo-data="territory.data"
            :title="territory.name"
            :area="territory.area"
            :region="territory.region"
            :preserve-scale="projectionStore.scalePreservation"
            :projection="getTerritoryProjection(territory.code)"
            :territory-code="createTerritoryCode(territory.code)"
            :width="200"
            :height="160"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="geoDataStore.filteredTerritories.length === 0"
        class="text-gray-500"
      >
        <p>{{ t('territory.noTerritories') }}</p>
        <p class="text-sm mt-2">
          {{ t('territory.checkData') }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Stabilize title heights to prevent layout shift during transitions */
h3 {
  min-height: 1.5rem;
  line-height: 1.5rem;
}

h4 {
  min-height: 1.25rem;
  line-height: 1.25rem;
}

h5 {
  min-height: 1rem;
  line-height: 1rem;
}
</style>
