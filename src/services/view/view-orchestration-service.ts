import type { AtlasConfig, AtlasId, ViewMode } from '@/types'

import { getAvailableViewModes } from '@/core/atlases/registry'

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
  /** Whether the current atlas has any active territories */
  hasTerritories: boolean
  /** Whether a preset is currently loading */
  isPresetLoading: boolean
  /** Whether projection selector should be shown (from ProjectionUIService) */
  showProjectionSelector: boolean
  /** Whether individual projection selectors should be shown (from ProjectionUIService) */
  showIndividualProjectionSelectors: boolean
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
  // Main Layout Visibility

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

  // Sidebar Content Visibility

  /**
   * Determine if projection parameters should be shown in right sidebar
   *
   * Projection params are shown for:
   * - unified mode (single projection for entire map)
   * - split mode (when not showing individual projection selectors)
   * - When projection selector is explicitly enabled
   *
   * NOT shown for built-in-composite - projections are fixed by d3-composite-projections library
   */
  static shouldShowProjectionParams(state: ViewState): boolean {
    return (
      state.viewMode === 'unified'
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

  // Territory Controls Sub-Components

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
   * Determine if projection dropdown should be shown in territory accordions
   *
   * Projection dropdown is shown when NOT in composite-custom mode
   * (In composite-custom, we show parameter controls instead)
   */
  static shouldShowProjectionDropdown(state: ViewState): boolean {
    return state.viewMode !== 'composite-custom'
  }

  // Empty States

  /**
   * Determine if empty state should be shown in territory controls
   *
   * Empty state is shown when no territories are active
   */
  static shouldShowEmptyState(state: ViewState): boolean {
    return !state.hasTerritories
  }

  /**
   * Get appropriate empty state message
   */
  static getEmptyStateMessage(_state: ViewState): string {
    return 'territory.noTerritories'
  }

  // Control States (Enabled/Disabled)

  /**
   * Determine if territory selector dropdown should be shown
   *
   * Shown when:
   * - Atlas has territory selector capability, AND
   * - NOT in composite modes (territory selection is managed via Territory Set Manager)
   */
  static shouldShowTerritorySelector(state: ViewState): boolean {
    if (!state.atlasConfig.hasTerritorySelector) {
      return false
    }
    // Hide for composite modes - territory selection is managed via Territory Set Manager
    return state.viewMode !== 'built-in-composite' && state.viewMode !== 'composite-custom'
  }

  /**
   * Determine if view mode selector should be disabled
   *
   * Disabled when:
   * - Atlas only supports one view mode
   */
  static isViewModeDisabled(state: ViewState): boolean {
    // Convert: atlasConfig.id from ViewState
    const availableViewModes = getAvailableViewModes(state.atlasConfig.id as AtlasId)
    return availableViewModes.length === 1
  }

  // Layout Variants

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

  // Display Options Visibility

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

  /**
   * Determine if globe outline (sphere) should be shown
   *
   * Automatically shown in unified mode only to provide geographic context
   * and help users understand projection distortions
   */
  static shouldShowSphere(state: ViewState): boolean {
    return state.viewMode === 'unified'
  }
}
