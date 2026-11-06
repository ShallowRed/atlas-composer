import type { ViewState } from '@/services/view/view-orchestration-service'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ViewOrchestrationService } from '@/services/view/view-orchestration-service'
import { useAtlasStore } from '@/stores/atlas'
import { useViewStore } from '@/stores/view'
import { getViewModeIcon } from '@/utils/view-mode-icons'

export function useViewState() {
  const { t } = useI18n()
  const atlasStore = useAtlasStore()
  const viewStore = useViewStore()

  const isCompositeCustomMode = computed(() =>
    viewStore.viewMode === 'composite-custom',
  )

  const isCompositeExistingMode = computed(() =>
    viewStore.viewMode === 'built-in-composite',
  )

  const isSplitMode = computed(() =>
    viewStore.viewMode === 'split',
  )

  const isUnifiedMode = computed(() =>
    viewStore.viewMode === 'unified',
  )

  const cardTitle = computed(() => {
    switch (viewStore.viewMode) {
      case 'split':
        return t('mode.split')
      case 'built-in-composite':
        return t('mode.compositeExisting')
      case 'composite-custom':
        return t('mode.compositeCustom')
      case 'unified':
        return t('mode.unified')
      default:
        return t('mode.compositeCustom')
    }
  })

  const cardIcon = computed(() =>
    getViewModeIcon(viewStore.viewMode),
  )

  const viewState = computed<ViewState | null>(() => {
    const atlasConfig = atlasStore.currentAtlasConfig
    if (!atlasConfig)
      return null

    return {
      viewMode: viewStore.viewMode,
      atlasConfig,
      showProjectionSelector: viewStore.showProjectionSelector,
      showIndividualProjectionSelectors: viewStore.showIndividualProjectionSelectors,
    }
  })

  const viewOrchestration = {
    shouldShowRightSidebar: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowRightSidebar(viewState.value) : false,
    ),
    shouldShowTerritorySelector: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowTerritorySelector(viewState.value) : false,
    ),
    isViewModeDisabled: computed(() =>
      viewState.value ? ViewOrchestrationService.isViewModeDisabled(viewState.value) : true,
    ),

    shouldShowCompositeRenderer: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowCompositeRenderer(viewState.value) : false,
    ),
    shouldShowSplitView: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowSplitView(viewState.value) : false,
    ),
    shouldShowUnifiedView: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowUnifiedView(viewState.value) : false,
    ),

    shouldShowCompositionBordersToggle: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowCompositionBordersToggle(viewState.value) : false,
    ),
    shouldShowScalePreservationToggle: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowScalePreservationToggle(viewState.value) : false,
    ),
  }

  return {
    isCompositeCustomMode,
    isCompositeExistingMode,
    isSplitMode,
    isUnifiedMode,

    cardTitle,
    cardIcon,

    viewOrchestration,
  }
}
