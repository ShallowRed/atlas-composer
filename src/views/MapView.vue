<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AtlasConfigSection from '@/components/configuration/AtlasConfigSection.vue'
import DisplayOptionsSection from '@/components/configuration/DisplayOptionsSection.vue'
import TerritoryControls from '@/components/TerritoryControls.vue'
import CardContainer from '@/components/ui/CardContainer.vue'
import ProjectionParamsControls from '@/components/ui/ProjectionParamsControls.vue'
import CompositeCustomView from '@/components/views/CompositeCustomView.vue'
import CompositeExistingView from '@/components/views/CompositeExistingView.vue'
import SplitView from '@/components/views/SplitView.vue'
import UnifiedView from '@/components/views/UnifiedView.vue'
import { useAtlasData } from '@/composables/useAtlasData'
import { useProjectionConfig } from '@/composables/useProjectionConfig'
import { useTerritoryConfig } from '@/composables/useTerritoryConfig'
import { useViewMode } from '@/composables/useViewMode'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'

const { t } = useI18n()
const allowThemeSelection = false

// Stores
const configStore = useConfigStore()
const geoDataStore = useGeoDataStore()

// Composables
const { showSkeleton, initialize, setupWatchers } = useAtlasData()
const { viewModeOptions } = useViewMode()
const { compositeProjectionOptions, getMainlandProjection, getTerritoryProjection } = useProjectionConfig()
const { hasTerritoriesForProjectionConfig } = useTerritoryConfig()

// Lifecycle
onMounted(async () => {
  await initialize()
  setupWatchers()
})
</script>

<template>
  <div class="flex-1 flex flex-col lg:flex-row gap-6">
    <section
      class="lg:w-1/4 max-h-[calc(100vh-8rem)] flex flex-col gap-6"
    >
      <!-- Atlas Configuration -->
      <CardContainer
        :title="t('settings.atlasConfigTitle')"
        icon="ri-settings-4-line"
        class="h-full"
        has-overflow
      >
        <AtlasConfigSection
          :allow-theme-selection="allowThemeSelection"
          :view-mode-options="viewModeOptions"
          :composite-projection-options="compositeProjectionOptions"
        />
      </CardContainer>
    </section>
    <section
      class="lg:w-1/2 max-h-[calc(100vh-8rem)] flex flex-col gap-6"
    >
      <!-- Main Content Area (Single Tab) -->
      <CardContainer
        :title="configStore.viewMode === 'split' ? 'Territoires séparés' : configStore.viewMode === 'composite-existing' ? 'Projection composite existante' : configStore.viewMode === 'unified' ? 'Projection unifiée' : 'Projection composite personnalisée'"
        icon="ri-map-line"
        has-overflow
        class="min-h-0 flex-1"
      >
        <!-- Loading state for main content -->
        <template v-if="showSkeleton || geoDataStore.isLoading">
          <!-- Skeleton for main map area -->
          <div class="h-full rounded-sm border border-base-300">
            <div class="skeleton rounded-none h-full w-full opacity-50" />
          </div>
        </template>

        <!-- Content when loaded -->
        <template v-else>
          <!-- Split Territories Mode -->
          <template
            v-if="configStore.viewMode === 'split'"
          >
            <SplitView
              :get-mainland-projection="getMainlandProjection"
              :get-territory-projection="getTerritoryProjection"
            />
          </template>

          <!-- Composite Existing Mode -->
          <CompositeExistingView v-if="configStore.viewMode === 'composite-existing'" />

          <!-- Composite Custom Mode -->
          <CompositeCustomView v-if="configStore.viewMode === 'composite-custom'" />

          <!-- Unified Mode -->
          <UnifiedView v-if="configStore.viewMode === 'unified'" />
        </template>
      </CardContainer>
      <!-- View Configuration -->
      <CardContainer
        :title="t('settings.displayOptionsTitle')"
        icon="ri-map-line"
        has-overflow
      >
        <!-- Display Options -->
        <DisplayOptionsSection />
      </CardContainer>
    </section>
    <section
      class="lg:w-1/4  max-h-[calc(100vh-8rem)] flex flex-col gap-6"
    >
      <!-- Projection Parameters (only for unified view mode) -->
      <CardContainer
        v-if="configStore.viewMode === 'unified' || (configStore.viewMode === 'split' && !configStore.showIndividualProjectionSelectors)"
        :title="t('settings.projectionConfigTitle')"
        icon="ri-settings-4-line"
        has-overflow
        class="h-full"
      >
        <ProjectionParamsControls />
      </CardContainer>
      <!-- Territory Parameters (projections, translations, scales) -->
      <CardContainer
        v-show="configStore.showIndividualProjectionSelectors && hasTerritoriesForProjectionConfig"
        :title="t('settings.territoryConfigTitle')"
        icon="ri-settings-4-line"
        class="h-full"
        has-overflow
      >
        <!-- Loading state -->
        <div
          v-if="showSkeleton || geoDataStore.isLoading"
          class="h-full rounded-sm border border-base-300"
        >
          <div class="skeleton rounded-none h-full w-full opacity-50" />
        </div>

        <div v-else class="flex flex-col gap-4">
          <!-- Territory controls -->
          <TerritoryControls
            :show-transform-controls="configStore.viewMode === 'composite-custom'"
          />
        </div>
      </CardContainer>
    </section>
  </div>
</template>
