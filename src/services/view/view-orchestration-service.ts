import type { AtlasConfig, ViewMode } from '@/types'

/**
 * View state snapshot for orchestration decisions
 * Aggregates all state needed to determine component visibility
 */
export interface ViewState {
  /** Current view mode */
  viewMode: ViewMode
  /** Current atlas configuration */
  atlasConfig: AtlasConfig
  /** Whether the current atlas has presets available */
  hasPresets: boolean
  /** Whether the current atlas has overseas territories */
  hasOverseasTerritories: boolean
  /** Whether a preset is currently loading */
  isPresetLoading: boolean
  /** Whether projection selector should be shown (from ProjectionUIService) */
  showProjectionSelector: boolean
  /** Whether individual projection selectors should be shown (from ProjectionUIService) */
  showIndividualProjectionSelectors: boolean
  /** Whether mainland is in filtered territories */
  isMainlandInTerritories: boolean
  /** Whether to show mainland section (for single-focus patterns) */
  showMainland: boolean
}

/**
 * ViewOrchestrationService
 *
 * Centralized service for determining component visibility and layout behavior
 * across all view modes. Consolidates complex conditional logic that was previously
 * scattered across components and composables.
 *
 * Responsibilities:
 * - Determine which UI components should be visible/hidden
 * - Calculate enabled/disabled states for controls
 * - Provide empty state messages
 * - Define layout variants
 *
 * Design Principles:
 * - Pure functions: All methods take ViewState and return deterministic results
 * - Single source of truth: All visibility logic in one place
 * - Type-safe: Explicit return types for all methods
 * - Testable: Can be tested independently of Vue components
 */
export class ViewOrchestrationService {
  // ============================================================================
  // Main Layout Visibility
  // ============================================================================

  /**
   * Determine if right sidebar should be shown
   *
   * Right sidebar contains:
   * - Projection parameters (unified/built-in-composite modes)
   * - Territory controls (split/composite-custom modes)
   *
   * Visibility Rules:
   * - unified: Always show (projection params)
   * - built-in-composite: Always show (projection params)
   * - split: Show if NOT showing individual projection selectors
   * - composite-custom: Show if showing individual projection selectors
   * - Also show if projection selector or individual selectors are enabled
   */
  static shouldShowRightSidebar(state: ViewState): boolean {
    return (
      state.viewMode === 'unified'
      || state.viewMode === 'built-in-composite'
      || (state.viewMode === 'split' && !state.showIndividualProjectionSelectors)
      || state.showProjectionSelector
      || state.showIndividualProjectionSelectors
    )
  }

  /**
   * Determine if bottom bar should be shown
   * Currently always shown (contains display options)
   */
  static shouldShowBottomBar(_state: ViewState): boolean {
    return true
  }

  // ============================================================================
  // Sidebar Content Visibility
  // ============================================================================

  /**
   * Determine if projection parameters should be shown in right sidebar
   *
   * Projection params are shown for:
   * - unified mode (single projection for entire map)
   * - built-in-composite mode (read-only composite)
   * - When projection selector is explicitly enabled
   */
  static shouldShowProjectionParams(state: ViewState): boolean {
    return (
      state.viewMode === 'unified'
      || state.viewMode === 'built-in-composite'
      || (state.viewMode === 'split' && !state.showIndividualProjectionSelectors)
      || state.showProjectionSelector
    )
  }

  /**
   * Determine if territory controls should be shown in right sidebar
   *
   * Territory controls are shown for:
   * - composite-custom mode (always - main use case)
   * - When individual projection selectors are enabled
   */
  static shouldShowTerritoryControls(state: ViewState): boolean {
    return (
      state.showIndividualProjectionSelectors
      || state.viewMode === 'composite-custom'
    )
  }

  // ============================================================================
  // Territory Controls Sub-Components
  // ============================================================================

  /**
   * Determine if preset selector should be shown
   *
   * Only shown in composite-custom mode when presets are available
   */
  static shouldShowPresetSelector(state: ViewState): boolean {
    return state.hasPresets && state.viewMode === 'composite-custom'
  }

  /**
   * Determine if import controls should be shown
   *
   * Only shown in composite-custom mode
   */
  static shouldShowImportControls(state: ViewState): boolean {
    return state.viewMode === 'composite-custom'
  }

  /**
   * Determine if global projection controls should be shown
   *
   * Global controls (canvas dimensions, reference scale) only in composite-custom mode
   */
  static shouldShowGlobalProjectionControls(state: ViewState): boolean {
    return state.viewMode === 'composite-custom'
  }

  /**
   * Determine if territory parameter controls should be shown
   *
   * Territory parameters (projection params per territory) only in composite-custom mode
   */
  static shouldShowTerritoryParameterControls(state: ViewState): boolean {
    return state.viewMode === 'composite-custom'
  }

  /**
   * Determine if mainland accordion section should be shown
   *
   * Mainland section is shown when:
   * - Atlas has mainland configuration (showMainland = true), OR
   * - Mainland is present in filtered territories list
   *
   * Always uses individual projections in split/composite-custom modes
   */
  static shouldShowMainlandAccordion(state: ViewState): boolean {
    return state.showMainland || state.isMainlandInTerritories
  }

  /**
   * Determine if projection dropdown should be shown in mainland/territory accordions
   *
   * Projection dropdown is shown when NOT in composite-custom mode
   * (In composite-custom, we show parameter controls instead)
   */
  static shouldShowProjectionDropdown(state: ViewState): boolean {
    return state.viewMode !== 'composite-custom'
  }

  // ============================================================================
  // Empty States
  // ============================================================================

  /**
   * Determine if empty state should be shown in territory controls
   *
   * Empty state is shown when:
   * - No overseas territories AND
   * - No mainland available to show
   *
   * This indicates there's nothing to configure
   */
  static shouldShowEmptyState(state: ViewState): boolean {
    const noOverseas = !state.hasOverseasTerritories
    const hasMainlandToShow = state.showMainland || state.isMainlandInTerritories
    return noOverseas && !hasMainlandToShow
  }

  /**
   * Get appropriate empty state message
   */
  static getEmptyStateMessage(state: ViewState): string {
    if (!state.hasOverseasTerritories) {
      return 'territory.noOverseas'
    }
    return 'territory.noTerritories'
  }

  // ============================================================================
  // Control States (Enabled/Disabled)
  // ============================================================================

  /**
   * Determine if territory selector should be disabled
   *
   * Disabled when:
   * - Atlas doesn't have territory selector capability, OR
   * - Territory selector should not be shown (from ProjectionUIService)
   */
  static isTerritorySelectDisabled(state: ViewState): boolean {
    if (!state.atlasConfig.hasTerritorySelector) {
      return true
    }
    // Disabled for composite modes - territory selection is managed via Territory Set Manager
    return state.viewMode === 'built-in-composite' || state.viewMode === 'composite-custom'
  }

  /**
   * Determine if view mode selector should be disabled
   *
   * Disabled when:
   * - Atlas only supports one view mode
   */
  static isViewModeDisabled(state: ViewState): boolean {
    return state.atlasConfig.supportedViewModes.length === 1
  }

  // ============================================================================
  // Layout Variants
  // ============================================================================

  /**
   * Get the appropriate map renderer mode based on view mode
   */
  static getMapRendererMode(state: ViewState): 'composite' | 'split' | 'unified' {
    switch (state.viewMode) {
      case 'composite-custom':
      case 'built-in-composite':
        return 'composite'
      case 'split':
        return 'split'
      case 'unified':
        return 'unified'
      default:
        return 'composite'
    }
  }

  /**
   * Get split view pattern based on atlas configuration
   *
   * single-focus: One primary territory + N secondary territories (France, Portugal, USA)
   * multi-mainland: All territories in a grid (EU, ASEAN, etc.)
   */
  static getSplitViewPattern(state: ViewState): 'single-focus' | 'multi-mainland' {
    // Pattern is determined by atlas configuration
    return state.atlasConfig.pattern === 'single-focus'
      ? 'single-focus'
      : 'multi-mainland'
  }

  /**
   * Determine if the current view should show composite mode MapRenderer
   */
  static shouldShowCompositeRenderer(state: ViewState): boolean {
    return (
      state.viewMode === 'built-in-composite'
      || state.viewMode === 'composite-custom'
    )
  }

  /**
   * Determine if the current view should show split view
   */
  static shouldShowSplitView(state: ViewState): boolean {
    return state.viewMode === 'split'
  }

  /**
   * Determine if the current view should show unified view
   */
  static shouldShowUnifiedView(state: ViewState): boolean {
    return state.viewMode === 'unified'
  }

  // ============================================================================
  // Display Options Visibility
  // ============================================================================

  /**
   * Determine if composition borders toggle should be shown
   *
   * Only shown in composite modes
   */
  static shouldShowCompositionBordersToggle(state: ViewState): boolean {
    return (
      state.viewMode === 'composite-custom'
      || state.viewMode === 'built-in-composite'
    )
  }

  /**
   * Determine if scale preservation toggle should be shown
   *
   * Shown based on atlas config and ProjectionUIService
   */
  static shouldShowScalePreservationToggle(state: ViewState): boolean {
    // Delegated to atlas config check
    // This is primarily used in split view
    return state.viewMode === 'split'
  }
}
