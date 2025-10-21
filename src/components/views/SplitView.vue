<script setup lang="ts">
import type { Territory } from '@/stores/geoData'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MapRenderer from '@/components/MapRenderer.vue'
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { filterCollectionSetsByType, useCollectionSet } from '@/composables/useCollectionSet'
import { useProjectionConfig } from '@/composables/useProjectionConfig'
import { getAtlasSpecificConfig, isAtlasLoaded } from '@/core/atlases/registry'
import { AtlasPatternService } from '@/services/atlas/atlas-pattern-service'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

const { t } = useI18n()
const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

const { getMainlandProjection, getTerritoryProjection } = useProjectionConfig()

/**
 * Pattern detection - kept local to this component
 * This computed property determines if the atlas uses a single-focus pattern
 * (one primary + N secondary territories) to render appropriate layout.
 * Not extracted to composable as it's only used here.
 */
const isSingleFocusPattern = computed(() => {
  const atlasConfig = configStore.currentAtlasConfig
  if (!atlasConfig)
    return false
  const patternService = AtlasPatternService.fromPattern(atlasConfig.pattern)
  return patternService.isSingleFocus()
})

// Safe accessors for atlas config with fallbacks
const mainlandTitle = computed(() =>
  configStore.currentAtlasConfig?.splitModeConfig?.mainlandTitle ?? 'territory.mainland',
)
const territoriesTitle = computed(() =>
  configStore.currentAtlasConfig?.splitModeConfig?.territoriesTitle ?? 'territory.territories',
)

/**
 * Get atlas territory collections configuration
 */
const atlasCollections = computed(() => {
  const atlasId = configStore.selectedAtlas
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
watch(() => configStore.selectedAtlas, () => {
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
 * Group territories by collection (same logic as TerritorySetManager)
 * Uses atlas territoryCollections configuration for grouping
 * Since we only use mutually-exclusive collection sets, territories won't appear in multiple groups
 */
const territoryGroups = computed<Map<string, Territory[]>>(() => {
  const collections = atlasCollections.value
  const territories = geoDataStore.overseasTerritories

  // Guard: Ensure we're looking at the right atlas's data
  // If atlas is loading, territories might be stale from previous atlas
  const currentAtlasId = configStore.selectedAtlas
  if (!isAtlasLoaded(currentAtlasId)) {
    return new Map()
  }

  if (!collections || !territories || territories.length === 0) {
    return new Map()
  }

  const collectionSetKey = selectedGrouping.value
  if (!collectionSetKey) {
    // No collection set defined - show all territories without grouping
    // Create a single anonymous group with all territories
    const mainlandCode = configStore.currentAtlasConfig?.splitModeConfig?.mainlandCode
    const allTerritories = territories.filter(t => t.code !== mainlandCode)

    if (allTerritories.length === 0) {
      return new Map()
    }

    // Use empty string as key so no group title is rendered
    return new Map([['', allTerritories]])
  }

  const collectionSet = collections[collectionSetKey]
  if (!collectionSet) {
    return new Map()
  }

  const mainlandCode = configStore.currentAtlasConfig?.splitModeConfig?.mainlandCode
  const territoriesByCode = new Map(territories.map(t => [t.code, t]))

  // Convert territory collections to Map<label, Territory[]>
  // No need to track duplicates since mutually-exclusive sets guarantee no overlap
  const groups = new Map<string, Territory[]>()

  for (const collection of collectionSet.collections) {
    const groupTerritories = collection.codes
      .filter(code => code !== mainlandCode && code !== '*' && territoriesByCode.has(code))
      .map(code => territoriesByCode.get(code)!)
      .filter(t => t !== undefined)

    if (groupTerritories.length > 0) {
      groups.set(collection.label, groupTerritories)
    }
  }

  return groups
})
</script>

<template>
  <!-- Single-focus pattern: Primary + Secondary split layout (France, Portugal, USA) -->
  <div
    v-if="isSingleFocusPattern"
    class="flex flex-row flex flex-wrap gap-4"
  >
    <!-- Grouping dropdown -->
    <DropdownControl
      v-if="groupingOptions.length > 1"
      v-model="selectedGrouping"
      :label="t('territory.groupBy')"
      icon="ri-group-line"
      :options="groupingOptions"
      class="max-w-xs"
    />
    <!-- Primary territory -->
    <div :class="{ 'flex-1': !configStore.scalePreservation }">
      <h3 class="text-base font-semibold mb-4">
        <i class="ri-map-pin-range-line" />
        {{ t(mainlandTitle) }}
      </h3>
      <MapRenderer
        :geo-data="geoDataStore.mainlandData"
        is-mainland
        :projection="getMainlandProjection()"
        :territory-code="configStore.currentAtlasConfig?.splitModeConfig?.mainlandCode"
        :full-height="false"
        :width="500"
        :height="400"
      />
    </div>

    <div :class="{ 'flex-1': !configStore.scalePreservation }">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold">
          <i class="ri-map-pin-add-line" />
          {{ t(territoriesTitle) }}
        </h3>
      </div>

      <div class="join join-vertical">
        <!-- Region Groups -->
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
                :preserve-scale="configStore.scalePreservation"
                :projection="getTerritoryProjection(territory.code)"
                :territory-code="territory.code"
                :full-height="false"
                :h-level="4"
                :width="200"
                :height="160"
              />
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="geoDataStore.overseasTerritories.length === 0"
          class="text-gray-500"
        >
          <p>{{ t('territory.noTerritories') }}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Multi-mainland pattern: All territories in a single grid (EU, ASEAN, etc.) -->
  <div v-else>
    <h3 class="text-base font-semibold mb-4">
      <i class="ri-map-pin-line" />
      {{ t(territoriesTitle) }}
    </h3>

    <!-- Territories Grid (flat, no region grouping) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="territory in geoDataStore.overseasTerritories"
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
          :preserve-scale="configStore.scalePreservation"
          :projection="getTerritoryProjection(territory.code)"
          :territory-code="territory.code"
          :width="200"
          :height="160"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="geoDataStore.overseasTerritories.length === 0"
      class="text-gray-500"
    >
      <p>{{ t('territory.noTerritories') }}</p>
      <p class="text-sm mt-2">
        {{ t('territory.checkData') }}
      </p>
    </div>
  </div>
</template>
