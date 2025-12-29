<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AtlasConfigSection from '@/components/configuration/AtlasConfigSection.vue'
import BuiltInCompositeControls from '@/components/configuration/BuiltInCompositeControls.vue'
import CompositeCustomControls from '@/components/configuration/CompositeCustomControls.vue'
import DisplayOptionsSection from '@/components/configuration/DisplayOptionsSection.vue'
import SplitControls from '@/components/configuration/SplitControls.vue'
import UnifiedControls from '@/components/configuration/UnifiedControls.vue'
import MapRenderer from '@/components/MapRenderer.vue'
import MainLayout from '@/components/ui/layout/MainLayout.vue'
import CardContainer from '@/components/ui/primitives/CardContainer.vue'
import ShareButton from '@/components/ui/settings/ShareButton.vue'
import SplitView from '@/components/views/SplitView.vue'
import UnifiedView from '@/components/views/UnifiedView.vue'
import { useAtlasData } from '@/composables/useAtlasData'
import { useUrlState } from '@/composables/useUrlState'
import { useViewState } from '@/composables/useViewState'
import { useAppStore } from '@/stores/app'
import { useAtlasStore } from '@/stores/atlas'
import { useViewStore } from '@/stores/view'

const { t } = useI18n()

// Stores
const appStore = useAppStore()
const atlasStore = useAtlasStore()
const viewStore = useViewStore()

// Composables
const { initialize } = useAtlasData()
const { restoreFromUrl } = useUrlState()
const {
  isCompositeCustomMode,
  isCompositeExistingMode,
  isSplitMode,
  isUnifiedMode,
  cardTitle,
  cardIcon,
  viewOrchestration,
} = useViewState()

// Transition configuration
const controlPanelTransition = { name: 'fade', mode: 'out-in' } as const

// Composite key for transitions - changes on atlas OR view mode change
const contentKey = computed(() => `${atlasStore.selectedAtlasId}-${viewStore.viewMode}`)

// Lifecycle
onMounted(async () => {
  // Restore state from URL first (before initialization)
  restoreFromUrl()

  await initialize()
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
        <AtlasConfigSection />
      </CardContainer>
    </template>
    <template #main-content>
      <!-- Main Content Area (Single Tab) -->
      <CardContainer
        class="flex-1"
        :title="cardTitle"
        :icon="cardIcon"
      >
        <template #actions>
          <ShareButton />
        </template>
        <!-- Main content container -->
        <div class="main-content-wrapper relative h-full w-full">
          <!-- Content layer -->
          <Transition
            name="fade"
            mode="out-in"
          >
            <div
              :key="contentKey"
              class="relative h-full"
            >
              <!-- Split Territories Mode -->
              <SplitView v-if="viewOrchestration.shouldShowSplitView.value" />

              <!-- Composite Modes (Existing & Custom) -->
              <MapRenderer
                v-else-if="viewOrchestration.shouldShowCompositeRenderer.value"
                mode="composite"
              />

              <!-- Unified Mode -->
              <UnifiedView v-else-if="viewOrchestration.shouldShowUnifiedView.value" />
            </div>
          </Transition>

          <!-- Skeleton overlay - ON TOP of content, fades out when ready -->
          <Transition name="fade">
            <div
              v-if="!isSplitMode && (appStore.showSkeleton || appStore.showSkeletonForViewSwitch)"
              class="absolute inset-0 z-20 rounded-sm border border-base-300 bg-base-100"
            >
              <div class="skeleton rounded-none h-full w-full opacity-50" />
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
        v-show="viewOrchestration.shouldShowRightSidebar.value"
        class="flex-1"
        :title="t('settings.projectionConfigTitle')"
        icon="ri-settings-4-line"
      >
        <div class="control-panel-container">
          <Transition v-bind="controlPanelTransition">
            <div :key="contentKey">
              <!-- Composite Custom Mode Controls -->
              <CompositeCustomControls
                v-if="isCompositeCustomMode"
              />
              <!-- Unified Mode Controls -->
              <UnifiedControls
                v-else-if="isUnifiedMode"
              />
              <!-- Split Mode Controls -->
              <SplitControls
                v-else-if="isSplitMode"
              />
              <!-- Composite Existing Mode Controls -->
              <BuiltInCompositeControls
                v-else-if="isCompositeExistingMode"
              />
            </div>
          </Transition>
        </div>
      </CardContainer>
    </template>
  </MainLayout>
</template>

<style scoped>
.control-panel-container {
  position: relative;
}

/* During leave transition, take the leaving element out of flow */
.control-panel-container :deep(.fade-leave-active) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

/* Main content leaving element should overlay during cross-fade */
.main-content-wrapper :deep(.fade-leave-active) {
  position: absolute;
  inset: 0;
  z-index: 20;
}
</style>
