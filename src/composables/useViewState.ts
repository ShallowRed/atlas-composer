import type { ViewState } from '@/services/view/view-orchestration-service'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { AtlasPatternService } from '@/services/atlas/atlas-pattern-service'
import { ViewOrchestrationService } from '@/services/view/view-orchestration-service'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
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
  const configStore = useConfigStore()
  const geoDataStore = useGeoDataStore()

  // View Mode Flags - Simple boolean wrappers for readability
  const isCompositeMode = computed(() =>
    configStore.viewMode === 'composite-custom' || configStore.viewMode === 'composite-existing',
  )

  const isCompositeCustomMode = computed(() =>
    configStore.viewMode === 'composite-custom',
  )

  const isCompositeExistingMode = computed(() =>
    configStore.viewMode === 'composite-existing',
  )

  const isSplitMode = computed(() =>
    configStore.viewMode === 'split',
  )

  const isUnifiedMode = computed(() =>
    configStore.viewMode === 'unified',
  )

  // Card UI Helpers
  /**
   * Get card title based on current view mode
   */
  const cardTitle = computed(() => {
    switch (configStore.viewMode) {
      case 'split':
        return t('mode.split')
      case 'composite-existing':
        return t('mode.compositeExisting')
      case 'composite-custom':
        return t('mode.compositeCustom')
      case 'unified':
        return t('mode.unified')
      default:
        return t('mode.compositeCustom')
    }
  })

  /**
   * Get card icon based on current view mode
   */
  const cardIcon = computed(() =>
    getViewModeIcon(configStore.viewMode),
  )

  // Helper computed properties for ViewState
  const showMainland = computed(() => {
    const patternService = AtlasPatternService.fromPattern(configStore.currentAtlasConfig.pattern)
    return patternService.isSingleFocus()
  })

  const mainlandCode = computed(() => {
    return configStore.currentAtlasConfig.splitModeConfig?.mainlandCode || 'MAINLAND'
  })

  const isMainlandInTerritories = computed(() => {
    return geoDataStore.filteredTerritories.some(t => t.code === mainlandCode.value)
  })

  /**
   * Build ViewState snapshot for service calls
   * Aggregates all state needed for orchestration decisions
   */
  const viewState = computed<ViewState>(() => ({
    viewMode: configStore.viewMode,
    projectionMode: configStore.projectionMode,
    atlasConfig: configStore.currentAtlasConfig,
    hasPresets: (configStore.currentAtlasConfig.availablePresets?.length ?? 0) > 0,
    hasOverseasTerritories: geoDataStore.filteredTerritories.length > 0,
    isPresetLoading: false, // TODO: Track preset loading state
    showProjectionSelector: configStore.showProjectionSelector,
    showIndividualProjectionSelectors: configStore.showIndividualProjectionSelectors,
    isMainlandInTerritories: isMainlandInTerritories.value,
    showMainland: showMainland.value,
  }))

  /**
   * View Orchestration - Service-based visibility logic
   * All methods are wrapped in computed refs for reactivity
   */
  const viewOrchestration = {
    // Main layout visibility
    shouldShowRightSidebar: computed(() =>
      ViewOrchestrationService.shouldShowRightSidebar(viewState.value),
    ),
    shouldShowBottomBar: computed(() =>
      ViewOrchestrationService.shouldShowBottomBar(viewState.value),
    ),

    // Sidebar content visibility
    shouldShowProjectionParams: computed(() =>
      ViewOrchestrationService.shouldShowProjectionParams(viewState.value),
    ),
    shouldShowTerritoryControls: computed(() =>
      ViewOrchestrationService.shouldShowTerritoryControls(viewState.value),
    ),

    // Territory controls sub-components
    shouldShowPresetSelector: computed(() =>
      ViewOrchestrationService.shouldShowPresetSelector(viewState.value),
    ),
    shouldShowImportControls: computed(() =>
      ViewOrchestrationService.shouldShowImportControls(viewState.value),
    ),
    shouldShowGlobalProjectionControls: computed(() =>
      ViewOrchestrationService.shouldShowGlobalProjectionControls(viewState.value),
    ),
    shouldShowTerritoryParameterControls: computed(() =>
      ViewOrchestrationService.shouldShowTerritoryParameterControls(viewState.value),
    ),
    shouldShowMainlandAccordion: computed(() =>
      ViewOrchestrationService.shouldShowMainlandAccordion(viewState.value),
    ),
    shouldShowProjectionDropdown: computed(() =>
      ViewOrchestrationService.shouldShowProjectionDropdown(viewState.value),
    ),

    // Empty states
    shouldShowEmptyState: computed(() =>
      ViewOrchestrationService.shouldShowEmptyState(viewState.value),
    ),
    getEmptyStateMessage: computed(() =>
      ViewOrchestrationService.getEmptyStateMessage(viewState.value),
    ),

    // Control states
    isTerritorySelectDisabled: computed(() =>
      ViewOrchestrationService.isTerritorySelectDisabled(viewState.value),
    ),
    isProjectionModeDisabled: computed(() =>
      ViewOrchestrationService.isProjectionModeDisabled(viewState.value),
    ),
    isViewModeDisabled: computed(() =>
      ViewOrchestrationService.isViewModeDisabled(viewState.value),
    ),

    // Layout variants
    shouldShowCompositeRenderer: computed(() =>
      ViewOrchestrationService.shouldShowCompositeRenderer(viewState.value),
    ),
    shouldShowSplitView: computed(() =>
      ViewOrchestrationService.shouldShowSplitView(viewState.value),
    ),
    shouldShowUnifiedView: computed(() =>
      ViewOrchestrationService.shouldShowUnifiedView(viewState.value),
    ),

    // Display options visibility
    shouldShowCompositionBordersToggle: computed(() =>
      ViewOrchestrationService.shouldShowCompositionBordersToggle(viewState.value),
    ),
    shouldShowScalePreservationToggle: computed(() =>
      ViewOrchestrationService.shouldShowScalePreservationToggle(viewState.value),
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

    // Deprecated: kept for backwards compatibility during migration
    // TODO: Remove these after components are migrated to viewOrchestration
    shouldShowRightSidebar: viewOrchestration.shouldShowRightSidebar,
    shouldShowProjectionParams: viewOrchestration.shouldShowProjectionParams,
    shouldShowTerritoryControls: viewOrchestration.shouldShowTerritoryControls,
  }
}
