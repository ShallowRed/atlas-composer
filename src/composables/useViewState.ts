import type { ViewState } from '@/services/view/view-orchestration-service'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAtlasPresets } from '@/core/atlases/registry'
import { ViewOrchestrationService } from '@/services/view/view-orchestration-service'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useViewStore } from '@/stores/view'
import { getViewModeIcon } from '@/utils/view-mode-icons'

/**
 * Provides view state flags, card UI helpers, and service-based visibility logic
 * Integrates ViewOrchestrationService for centralized conditional rendering decisions
 *
 * Returns:
 * - Simple view mode flags (isCompositeMode, isSplitMode, etc.)
 * - Card UI helpers (cardTitle, cardIcon)
 * - viewOrchestration object with reactive visibility properties from service
 */
export function useViewState() {
  const { t } = useI18n()
  const atlasStore = useAtlasStore()
  const geoDataStore = useGeoDataStore()
  const viewStore = useViewStore()

  // View Mode Flags - Simple boolean wrappers for readability
  const isCompositeMode = computed(() =>
    viewStore.viewMode === 'composite-custom' || viewStore.viewMode === 'built-in-composite',
  )

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

  // Card UI Helpers
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

  /**
   * Build ViewState snapshot for service calls
   * Aggregates all state needed for orchestration decisions
   */
  const viewState = computed<ViewState | null>(() => {
    const atlasConfig = atlasStore.currentAtlasConfig
    if (!atlasConfig)
      return null

    const atlasId = atlasStore.selectedAtlasId
    const presets = getAtlasPresets(atlasId)
    const hasPresets = presets.length > 0

    return {
      viewMode: viewStore.viewMode,
      atlasConfig,
      hasPresets,
      hasTerritories: geoDataStore.allActiveTerritories.length > 0,
      isPresetLoading: false,
      showProjectionSelector: viewStore.showProjectionSelector,
      showIndividualProjectionSelectors: viewStore.showIndividualProjectionSelectors,
    }
  })

  /**
   * View Orchestration - Service-based visibility logic
   * All methods are wrapped in computed refs for reactivity
   * Returns safe defaults when atlas config is still loading
   */
  const viewOrchestration = {
    // Main layout visibility
    shouldShowRightSidebar: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowRightSidebar(viewState.value) : false,
    ),
    shouldShowBottomBar: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowBottomBar(viewState.value) : false,
    ),

    // Sidebar content visibility
    shouldShowProjectionParams: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowProjectionParams(viewState.value) : false,
    ),
    shouldShowTerritoryControls: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowTerritoryControls(viewState.value) : false,
    ),

    // Territory controls sub-components
    shouldShowPresetSelector: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowPresetSelector(viewState.value) : false,
    ),
    shouldShowImportControls: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowImportControls(viewState.value) : false,
    ),
    shouldShowGlobalProjectionControls: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowGlobalProjectionControls(viewState.value) : false,
    ),
    shouldShowTerritoryParameterControls: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowTerritoryParameterControls(viewState.value) : false,
    ),
    shouldShowProjectionDropdown: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowProjectionDropdown(viewState.value) : false,
    ),

    // Empty states
    shouldShowEmptyState: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowEmptyState(viewState.value) : true,
    ),
    getEmptyStateMessage: computed(() =>
      viewState.value ? ViewOrchestrationService.getEmptyStateMessage(viewState.value) : 'Loading atlas...',
    ),

    // Control states
    shouldShowTerritorySelector: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowTerritorySelector(viewState.value) : false,
    ),
    isViewModeDisabled: computed(() =>
      viewState.value ? ViewOrchestrationService.isViewModeDisabled(viewState.value) : true,
    ),

    // Layout variants
    shouldShowCompositeRenderer: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowCompositeRenderer(viewState.value) : false,
    ),
    shouldShowSplitView: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowSplitView(viewState.value) : false,
    ),
    shouldShowUnifiedView: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowUnifiedView(viewState.value) : false,
    ),

    // Display options visibility
    shouldShowCompositionBordersToggle: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowCompositionBordersToggle(viewState.value) : false,
    ),
    shouldShowScalePreservationToggle: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowScalePreservationToggle(viewState.value) : false,
    ),
  }

  return {
    // View mode flags
    isCompositeMode,
    isCompositeCustomMode,
    isCompositeExistingMode,
    isSplitMode,
    isUnifiedMode,

    // Card UI helpers
    cardTitle,
    cardIcon,

    // Service-based orchestration (replaces compound conditions)
    viewOrchestration,
  }
}
