import type { AtlasConfig, AtlasId, ViewMode } from '@/types'

import { getAvailableViewModes } from '@/core/atlases/registry'

export interface ViewState {
  viewMode: ViewMode
  atlasConfig: AtlasConfig
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
