<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AtlasConfigSection from '@/components/configuration/AtlasConfigSection.vue'
import DisplayOptionsSection from '@/components/configuration/DisplayOptionsSection.vue'
import TerritoryControls from '@/components/TerritoryControls.vue'
import CardContainer from '@/components/ui/CardContainer.vue'
import ProjectionParamsControls from '@/components/ui/ProjectionParamsControls.vue'
import ViewModeSection from '@/components/ui/ViewModeSection.vue'
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
        class="max-h-[65vh]"
      >
        <!-- Loading state for main content -->
        <div v-if="showSkeleton || geoDataStore.isLoading" class="space-y-6">
          <!-- Skeleton for main map area -->
          <div class="skeleton h-96 w-full rounded-sm opacity-50" />

          <!-- Skeleton for grid of territories (split mode) -->
          <div v-if="configStore.viewMode === 'split'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="i in 6" :key="i" class="skeleton h-48 rounded-sm opacity-50" />
          </div>
        </div>

        <!-- Content when loaded -->
        <template v-else>
          <!-- Split Territories Mode -->
          <ViewModeSection
            :view-mode="configStore.viewMode"
            active-mode="split"
          >
            <SplitView
              :get-mainland-projection="getMainlandProjection"
              :get-territory-projection="getTerritoryProjection"
            />
          </ViewModeSection>

          <!-- Composite Existing Mode -->
          <ViewModeSection
            :view-mode="configStore.viewMode"
            active-mode="composite-existing"
          >
            <CompositeExistingView />
          </ViewModeSection>

          <!-- Composite Custom Mode -->
          <ViewModeSection
            :view-mode="configStore.viewMode"
            active-mode="composite-custom"
          >
            <CompositeCustomView />
          </ViewModeSection>

          <!-- Unified Mode -->
          <ViewModeSection
            :view-mode="configStore.viewMode"
            active-mode="unified"
          >
            <UnifiedView />
          </ViewModeSection>
        </template>
      </CardContainer>
      <!-- View Configuration -->
      <CardContainer
        :title="t('settings.displayOptionsTitle')"
        icon="ri-map-line"
        has-overflow
        class="flex-1"
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
          class="skeleton h-64 rounded-sm opacity-50"
        />

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
