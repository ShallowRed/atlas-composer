import type { ViewState } from '@/services/view/view-orchestration-service'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAtlasPresets } from '@/core/atlases/registry'
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
    configStore.viewMode === 'composite-custom' || configStore.viewMode === 'built-in-composite',
  )

  const isCompositeCustomMode = computed(() =>
    configStore.viewMode === 'composite-custom',
  )

  const isCompositeExistingMode = computed(() =>
    configStore.viewMode === 'built-in-composite',
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

  /**
   * Get card icon based on current view mode
   */
  const cardIcon = computed(() =>
    getViewModeIcon(configStore.viewMode),
  )

  // Helper computed properties for ViewState
  const showMainland = computed(() => {
    const atlasConfig = configStore.currentAtlasConfig
    if (!atlasConfig)
      return false
    const patternService = AtlasPatternService.fromPattern(atlasConfig.pattern)
    return patternService.isSingleFocus()
  })

  const mainlandCode = computed(() => {
    const atlasConfig = configStore.currentAtlasConfig
    return atlasConfig?.splitModeConfig?.mainlandCode || 'MAINLAND'
  })

  const isMainlandInTerritories = computed(() => {
    // Check if mainland is in the all active territories list
    return geoDataStore.allActiveTerritories.some(t => t.code === mainlandCode.value)
  })

  /**
   * Build ViewState snapshot for service calls
   * Aggregates all state needed for orchestration decisions
   */
  const viewState = computed<ViewState | null>(() => {
    const atlasConfig = configStore.currentAtlasConfig
    if (!atlasConfig)
      return null

    const atlasId = configStore.selectedAtlas
    const presets = getAtlasPresets(atlasId)
    const hasPresets = presets.length > 0

    return {
      viewMode: configStore.viewMode,
      atlasConfig,
      hasPresets,
      hasOverseasTerritories: geoDataStore.overseasTerritories.length > 0,
      isPresetLoading: false,
      showProjectionSelector: configStore.showProjectionSelector,
      showIndividualProjectionSelectors: configStore.showIndividualProjectionSelectors,
      isMainlandInTerritories: isMainlandInTerritories.value,
      showMainland: showMainland.value,
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
    shouldShowMainlandAccordion: computed(() =>
      viewState.value ? ViewOrchestrationService.shouldShowMainlandAccordion(viewState.value) : false,
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
    isTerritorySelectDisabled: computed(() =>
      viewState.value ? ViewOrchestrationService.isTerritorySelectDisabled(viewState.value) : true,
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
