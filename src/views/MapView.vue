<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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

const { t } = useI18n()

// Composables
const { showSkeleton, initialize } = useAtlasData()
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

// Track if this is the first load
const hasLoadedOnce = ref(false)

// Use instant transition only on first load, fade afterwards
const skeletonTransition = computed(() => hasLoadedOnce.value ? 'fade' : 'fade-instant')

// Lifecycle
onMounted(async () => {
  // Restore state from URL first (before initialization)
  restoreFromUrl()

  await initialize()
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
              <SplitView v-if="viewOrchestration.shouldShowSplitView.value" />

              <!-- Composite Modes (Existing & Custom) -->
              <MapRenderer
                v-if="viewOrchestration.shouldShowCompositeRenderer.value"
                mode="composite"
              />

              <!-- Unified Mode -->
              <UnifiedView v-if="viewOrchestration.shouldShowUnifiedView.value" />
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
        <Transition
          name="fade"
          mode="out-in"
        >
          <!-- Composite Custom Mode Controls -->
          <CompositeCustomControls
            v-if="isCompositeCustomMode"
            key="composite-custom"
          />
          <!-- Unified Mode Controls -->
          <UnifiedControls
            v-else-if="isUnifiedMode"
            key="unified"
          />
          <!-- Split Mode Controls -->
          <SplitControls
            v-else-if="isSplitMode"
            key="split"
          />
          <!-- Composite Existing Mode Controls -->
          <BuiltInCompositeControls
            v-else-if="isCompositeExistingMode"
            key="built-in-composite"
          />
        </Transition>
      </CardContainer>
    </template>
  </MainLayout>
</template>
