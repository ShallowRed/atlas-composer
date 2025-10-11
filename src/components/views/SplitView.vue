<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import MapRenderer from '@/components/MapRenderer.vue'
import { AtlasPatternService } from '@/services/atlas/atlas-pattern-service'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

const props = defineProps<Props>()
const { t } = useI18n()
const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

interface Props {
  getMainlandProjection: () => string | undefined
  getTerritoryProjection: (code: string) => string | undefined
}

const isSingleFocusPattern = computed(() => {
  const patternService = AtlasPatternService.fromPattern(configStore.currentAtlasConfig.pattern)
  return patternService.isSingleFocus()
})
</script>

<template>
  <!-- Single-focus pattern: Primary + Secondary split layout (France, Portugal, USA) -->
  <div
    v-if="isSingleFocusPattern"
    class="flex flex-row flex flex-wrap gap-4"
  >
    <!-- Primary territory -->
    <div :class="{ 'flex-1': !configStore.scalePreservation }">
      <h3 class="text-base font-semibold mb-4">
        <i class="ri-map-pin-range-line" />
        {{ t(configStore.currentAtlasConfig.splitModeConfig?.mainlandTitle ?? 'territory.mainland') }}
      </h3>
      <MapRenderer
        :geo-data="geoDataStore.mainlandData"
        is-mainland
        :projection="props.getMainlandProjection()"
        :full-height="false"
        :width="500"
        :height="400"
      />
    </div>

    <div :class="{ 'flex-1': !configStore.scalePreservation }">
      <h3 class="text-base font-semibold mb-4">
        <i class="ri-map-pin-add-line" />
        {{ t(configStore.currentAtlasConfig.splitModeConfig?.territoriesTitle || 'territory.overseas') }}
      </h3>

      <div class="join join-vertical">
        <!-- Region Groups -->
        <div
          v-for="[regionName, territories] in geoDataStore.territoryGroups"
          :key="regionName"
          class="join-item border border-base-300 p-3 bg-base-200/25"
        >
          <h4 class="text-sm font-semibold mb-2">
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
                :projection="props.getTerritoryProjection(territory.code)"
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
          v-if="geoDataStore.filteredTerritories.length === 0"
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
      {{ t(configStore.currentAtlasConfig.splitModeConfig?.territoriesTitle || 'territory.territories') }}
    </h3>

    <!-- Territories Grid -->
    <div class="flex flex-col gap-4">
      <!-- Region Groups -->
      <div
        v-for="[regionName, territories] in geoDataStore.territoryGroups"
        :key="regionName"
        class="bg-base-200 border border-base-300 p-4 rounded-lg"
      >
        <h3 class="text-lg font-semibold mb-4 text-gray-700">
          {{ regionName }}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="territory in territories"
            :key="territory.code"
            class="bg-base-100 border border-base-300 p-4 rounded-md"
          >
            <MapRenderer
              :geo-data="territory.data"
              :title="territory.name"
              :area="territory.area"
              :region="territory.region"
              :preserve-scale="configStore.scalePreservation"
              :projection="props.getTerritoryProjection(territory.code)"
              :width="200"
              :height="160"
            />
          </div>
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
