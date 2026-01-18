import type { AtlasConfig, AtlasId, ViewMode } from '@/types'

import { getAvailableViewModes } from '@/core/atlases/registry'

export interface ViewState {
  viewMode: ViewMode
  atlasConfig: AtlasConfig
  hasPresets: boolean
  hasTerritories: boolean
  isPresetLoading: boolean
  showProjectionSelector: boolean
  showIndividualProjectionSelectors: boolean
}

export class ViewOrchestrationService {
  static shouldShowRightSidebar(state: ViewState): boolean {
    return (
      state.viewMode === 'unified'
      || state.viewMode === 'built-in-composite'
      || (state.viewMode === 'split' && !state.showIndividualProjectionSelectors)
      || state.showProjectionSelector
      || state.showIndividualProjectionSelectors
    )
  }

  static shouldShowBottomBar(_state: ViewState): boolean {
    return true
  }

  static shouldShowProjectionParams(state: ViewState): boolean {
    return (
      state.viewMode === 'unified'
      || (state.viewMode === 'split' && !state.showIndividualProjectionSelectors)
      || state.showProjectionSelector
    )
  }

  static shouldShowTerritoryControls(state: ViewState): boolean {
    return (
      state.showIndividualProjectionSelectors
      || state.viewMode === 'composite-custom'
    )
  }

  static shouldShowPresetSelector(state: ViewState): boolean {
    return state.hasPresets && state.viewMode === 'composite-custom'
  }

  static shouldShowImportControls(state: ViewState): boolean {
    return state.viewMode === 'composite-custom'
  }

  static shouldShowGlobalProjectionControls(state: ViewState): boolean {
    return state.viewMode === 'composite-custom'
  }

  static shouldShowTerritoryParameterControls(state: ViewState): boolean {
    return state.viewMode === 'composite-custom'
  }

  static shouldShowProjectionDropdown(state: ViewState): boolean {
    return state.viewMode !== 'composite-custom'
  }

  static shouldShowEmptyState(state: ViewState): boolean {
    return !state.hasTerritories
  }

  static getEmptyStateMessage(_state: ViewState): string {
    return 'territory.noTerritories'
  }

  static shouldShowTerritorySelector(state: ViewState): boolean {
    if (!state.atlasConfig.hasTerritorySelector) {
      return false
    }
    return state.viewMode !== 'built-in-composite' && state.viewMode !== 'composite-custom'
  }

  static isViewModeDisabled(state: ViewState): boolean {
    const availableViewModes = getAvailableViewModes(state.atlasConfig.id as AtlasId)
    return availableViewModes.length === 1
  }

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

  static shouldShowCompositeRenderer(state: ViewState): boolean {
    return (
      state.viewMode === 'built-in-composite'
      || state.viewMode === 'composite-custom'
    )
  }

  static shouldShowSplitView(state: ViewState): boolean {
    return state.viewMode === 'split'
  }

  static shouldShowUnifiedView(state: ViewState): boolean {
    return state.viewMode === 'unified'
  }

  static shouldShowCompositionBordersToggle(state: ViewState): boolean {
    return (
      state.viewMode === 'composite-custom'
      || state.viewMode === 'built-in-composite'
    )
  }

  static shouldShowScalePreservationToggle(state: ViewState): boolean {
    return state.viewMode === 'split'
  }

  static shouldShowSphere(state: ViewState): boolean {
    return state.viewMode === 'unified'
  }
}
