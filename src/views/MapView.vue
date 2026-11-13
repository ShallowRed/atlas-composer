<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints, useElementSize } from '@vueuse/core'
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AtlasConfigSection from '@/components/configuration/AtlasConfigSection.vue'
import BuiltInCompositeControls from '@/components/configuration/BuiltInCompositeControls.vue'
import CompositeCustomControls from '@/components/configuration/CompositeCustomControls.vue'
import DisplayOptionsSection from '@/components/configuration/DisplayOptionsSection.vue'
import SplitControls from '@/components/configuration/SplitControls.vue'
import TerritorySelectionSection from '@/components/configuration/TerritorySelectionSection.vue'
import UnifiedControls from '@/components/configuration/UnifiedControls.vue'
import MapRenderer from '@/components/MapRenderer.vue'
import MainLayout from '@/components/ui/layout/MainLayout.vue'
import CardContainer from '@/components/ui/primitives/CardContainer.vue'
import ShareButton from '@/components/ui/settings/ShareButton.vue'
import SplitView from '@/components/views/SplitView.vue'
import UnifiedView from '@/components/views/UnifiedView.vue'
import { useSelectedTerritory } from '@/composables/useSelectedTerritory'
import { useUrlState } from '@/composables/useUrlState'
import { useViewState } from '@/composables/useViewState'
import { useAppStore } from '@/stores/app'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'
import { useViewStore } from '@/stores/view'

const { t } = useI18n()

const appStore = useAppStore()
const atlasStore = useAtlasStore()
const viewStore = useViewStore()
const compositionStore = useCompositionStore()

const { readSharedLink } = useUrlState()
const {
  isCompositeCustomMode,
  isCompositeExistingMode,
  isSplitMode,
  isUnifiedMode,
  viewOrchestration,
} = useViewState()

const controlPanelTransition = { name: 'fade', mode: 'out-in' } as const
const contentKey = computed(() => `${atlasStore.selectedAtlasId}-${viewStore.viewMode}`)

const { hasSelectedTerritory } = useSelectedTerritory()

const isBelowLg = useBreakpoints(breakpointsTailwind).smaller('lg')
const pinsMap = computed(() => !isSplitMode.value)
const mapCard = useTemplateRef<InstanceType<typeof CardContainer>>('mapCard')
const settingsCard = useTemplateRef<InstanceType<typeof CardContainer>>('settingsCard')
const { height: mapCardHeight } = useElementSize(mapCard, undefined, { box: 'border-box' })
const settingsCardStyle = computed(() => isBelowLg.value && pinsMap.value
  ? { scrollMarginTop: `${mapCardHeight.value}px` }
  : undefined)

watch(hasSelectedTerritory, async (selected) => {
  if (!selected || !isBelowLg.value || !pinsMap.value) {
    return
  }
  await nextTick()
  ;(settingsCard.value?.$el as HTMLElement | undefined)?.scrollIntoView({ behavior: 'smooth' })
})

onMounted(() => compositionStore.startMapView(readSharedLink()))
</script>

<template>
  <MainLayout :pin-main-content="pinsMap">
    <template #main-content>
      <CardContainer
        ref="mapCard"
        class="flex-1 min-w-0"
      >
        <template #header>
          <AtlasConfigSection>
            <template #actions>
              <ShareButton />
            </template>
          </AtlasConfigSection>
        </template>
        <template
          v-if="!isBelowLg"
          #footer
        >
          <DisplayOptionsSection />
        </template>
        <div class="main-content-wrapper relative h-full w-full max-lg:h-auto">
          <Transition
            name="fade"
            mode="out-in"
          >
            <div
              :key="contentKey"
              class="relative h-full"
            >
              <SplitView v-if="viewOrchestration.shouldShowSplitView.value" />

              <MapRenderer
                v-else-if="viewOrchestration.shouldShowCompositeRenderer.value"
                mode="composite"
              />

              <UnifiedView v-else-if="viewOrchestration.shouldShowUnifiedView.value" />
            </div>
          </Transition>

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
    <template #right-sidebar>
      <CardContainer
        v-show="viewOrchestration.shouldShowRightSidebar.value"
        ref="settingsCard"
        class="flex-1 min-w-0"
        :style="settingsCardStyle"
        :title="t('settings.projectionConfigTitle')"
        icon="ri-settings-4-line"
      >
        <DisplayOptionsSection
          v-if="isBelowLg"
          v-show="!hasSelectedTerritory"
          class="mb-6"
        />
        <TerritorySelectionSection
          v-if="viewOrchestration.shouldShowTerritorySelector.value || isCompositeCustomMode"
          v-show="!hasSelectedTerritory"
          class="mb-6"
        />
        <div class="control-panel-container">
          <Transition v-bind="controlPanelTransition">
            <div :key="contentKey">
              <CompositeCustomControls
                v-if="isCompositeCustomMode"
              />
              <UnifiedControls
                v-else-if="isUnifiedMode"
              />
              <SplitControls
                v-else-if="isSplitMode"
              />
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

.control-panel-container :deep(.fade-leave-active) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.main-content-wrapper :deep(.fade-leave-active) {
  position: absolute;
  inset: 0;
  z-index: 20;
}
</style>
