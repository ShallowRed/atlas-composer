<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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

// Track if this is the first load
const hasLoadedOnce = ref(false)

// Use instant transition only on first load, fade afterwards
const skeletonTransition = computed(() => hasLoadedOnce.value ? 'fade' : 'fade-instant')

// Lifecycle
onMounted(async () => {
  await initialize()
  setupWatchers()
  hasLoadedOnce.value = true
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
        <div class="relative h-full">
          <Transition :name="skeletonTransition">
            <div
              v-if="showSkeleton || geoDataStore.isLoading"
              key="skeleton"
              class="absolute inset-0 rounded-sm border border-base-300"
            >
              <div class="skeleton rounded-none h-full w-full opacity-50" />
            </div>
          </Transition>

          <!-- Content when loaded -->
          <Transition name="fade">
            <div
              v-if="!showSkeleton && !geoDataStore.isLoading"
              key="content"
              class="h-full"
            >
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
            </div>
          </Transition>
        </div>
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
        <!-- Loading state with transition -->
        <div class="relative h-full">
          <Transition :name="skeletonTransition">
            <div
              v-if="showSkeleton || geoDataStore.isLoading"
              key="skeleton"
              class="absolute inset-0 rounded-sm border border-base-300"
            >
              <div class="skeleton rounded-none h-full w-full opacity-50" />
            </div>
          </Transition>

          <Transition name="fade">
            <div
              v-if="!showSkeleton && !geoDataStore.isLoading"
              key="content"
              class="flex flex-col gap-4"
            >
              <!-- Territory controls -->
              <TerritoryControls
                :show-transform-controls="configStore.viewMode === 'composite-custom'"
              />
            </div>
          </Transition>
        </div>
      </CardContainer>
    </section>
  </div>
</template>
