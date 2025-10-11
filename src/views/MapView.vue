<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AtlasConfigSection from '@/components/configuration/AtlasConfigSection.vue'
import DisplayOptionsSection from '@/components/configuration/DisplayOptionsSection.vue'
import MapRenderer from '@/components/MapRenderer.vue'
import TerritoryControls from '@/components/TerritoryControls.vue'
import MainLayout from '@/components/ui/layout/MainLayout.vue'
import CardContainer from '@/components/ui/primitives/CardContainer.vue'
import ProjectionParamsControls from '@/components/ui/projections/ProjectionParamsControls.vue'
import SplitView from '@/components/views/SplitView.vue'
import UnifiedView from '@/components/views/UnifiedView.vue'
import { useAtlasData } from '@/composables/useAtlasData'
import { useProjectionConfig } from '@/composables/useProjectionConfig'
import { useViewMode } from '@/composables/useViewMode'
import { useConfigStore } from '@/stores/config'
import { getViewModeIcon } from '@/utils/view-mode-icons'

const { t } = useI18n()
const allowThemeSelection = false

// Stores
const configStore = useConfigStore()

// Composables
const { showSkeleton, initialize, setupWatchers } = useAtlasData()
const { viewModeOptions } = useViewMode()
const { compositeProjectionOptions, getMainlandProjection, getTerritoryProjection } = useProjectionConfig()

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
  <MainLayout>
    <template #left-sidebar>
      <!-- Atlas Configuration -->
      <CardContainer
        :title="t('settings.atlasConfigTitle')"
        icon="ri-settings-4-line"
        class="flex-1"
      >
        <AtlasConfigSection
          :allow-theme-selection="allowThemeSelection"
          :view-mode-options="viewModeOptions"
          :composite-projection-options="compositeProjectionOptions"
        />
      </CardContainer>
    </template>
    <template #main-content>
      <!-- Main Content Area (Single Tab) -->
      <CardContainer
        class="flex-1"
        :title="configStore.viewMode === 'split' ? 'Territoires séparés' : configStore.viewMode === 'composite-existing' ? 'Projection composite existante' : configStore.viewMode === 'unified' ? 'Projection unifiée' : 'Projection composite personnalisée'"
        :icon="getViewModeIcon(configStore.viewMode)"
      >
        <!-- Loading state for main content -->
        <div class="relative h-full w-full">
          <Transition :name="skeletonTransition">
            <div
              v-if="showSkeleton"
              key="skeleton"
              class="absolute inset-0 rounded-sm border border-base-300"
            >
              <div class="skeleton rounded-none h-full w-full opacity-50" />
            </div>
          </Transition>

          <!-- Content when loaded -->
          <Transition name="fade">
            <div
              v-if="!showSkeleton"
              key="content"
              class="h-full"
            >
              <!-- Split Territories Mode -->
              <template v-if="configStore.viewMode === 'split'">
                <SplitView
                  :get-mainland-projection="getMainlandProjection"
                  :get-territory-projection="getTerritoryProjection"
                />
              </template>

              <!-- Composite Existing Mode -->
              <MapRenderer
                v-if="configStore.viewMode === 'composite-existing'"
                mode="composite"
              />

              <!-- Composite Custom Mode -->
              <MapRenderer
                v-if="configStore.viewMode === 'composite-custom'"
                mode="composite"
              />
              <!-- Unified Mode -->
              <UnifiedView v-if="configStore.viewMode === 'unified'" />
            </div>
          </Transition>
        </div>
      </CardContainer>
    </template>
    <template #bottom-bar>
      <!-- Display Options -->
      <CardContainer
        :title="t('settings.displayOptionsTitle')"
        icon="ri-eye-line"
        class="flex-1"
      >
        <DisplayOptionsSection />
      </CardContainer>
    </template>
    <template #right-sidebar>
      <!-- Projection Configuration -->
      <CardContainer
        v-show="(
          configStore.viewMode === 'unified'
          || (configStore.viewMode === 'split' && !configStore.showIndividualProjectionSelectors)
          || configStore.showProjectionSelector
          || configStore.showIndividualProjectionSelectors
        )"
        class="flex-1"
        :title="t('settings.projectionConfigTitle')"
        icon="ri-settings-4-line"
      >
        <Transition
          name="fade"
          mode="out-in"
        >
          <!-- Projection Parameters (only for unified view mode) -->
          <ProjectionParamsControls
            v-if="(
              configStore.viewMode === 'unified'
              || (configStore.viewMode === 'split' && !configStore.showIndividualProjectionSelectors)
              || configStore.showProjectionSelector
            )"
            key="projection-params"
          />
          <!-- Territory Parameters (projections, translations, scales) -->
          <TerritoryControls
            v-else-if="configStore.showIndividualProjectionSelectors"
            key="territory-controls"
            :show-transform-controls="configStore.viewMode === 'composite-custom'"
          />
        </Transition>
      </CardContainer>
    </template>
  </MainLayout>
</template>
