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
import { useViewState } from '@/composables/useViewState'

const { t } = useI18n()

// Composables
const { getMainlandProjection, getTerritoryProjection } = useProjectionConfig()
const { showSkeleton, initialize, setupWatchers } = useAtlasData()
const { viewModeOptions } = useViewMode()
const {
  isSplitMode,
  isCompositeExistingMode,
  isCompositeCustomMode,
  isUnifiedMode,
  cardTitle,
  cardIcon,
  shouldShowRightSidebar,
  shouldShowProjectionParams,
  shouldShowTerritoryControls,
} = useViewState()

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
          :view-mode-options="viewModeOptions"
        />
      </CardContainer>
    </template>
    <template #main-content>
      <!-- Main Content Area (Single Tab) -->
      <CardContainer
        class="flex-1"
        :title="cardTitle"
        :icon="cardIcon"
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
              <template v-if="isSplitMode">
                <SplitView
                  :get-mainland-projection="getMainlandProjection"
                  :get-territory-projection="getTerritoryProjection"
                />
              </template>

              <!-- Composite Existing Mode -->
              <MapRenderer
                v-if="isCompositeExistingMode"
                mode="composite"
              />

              <!-- Composite Custom Mode -->
              <MapRenderer
                v-if="isCompositeCustomMode"
                mode="composite"
              />
              <!-- Unified Mode -->
              <UnifiedView v-if="isUnifiedMode" />
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
        v-show="shouldShowRightSidebar"
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
            v-if="shouldShowProjectionParams"
            key="projection-params"
          />
          <!-- Territory Parameters (projections, translations, scales) -->
          <TerritoryControls
            v-else-if="shouldShowTerritoryControls"
            key="territory-controls"
            :show-transform-controls="isCompositeCustomMode"
          />
        </Transition>
      </CardContainer>
    </template>
  </MainLayout>
</template>
