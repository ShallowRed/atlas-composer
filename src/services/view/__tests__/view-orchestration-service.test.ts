import type { ViewState } from '../view-orchestration-service'
import type { AtlasConfig, ViewMode } from '@/types'
import { describe, expect, it, vi } from 'vitest'
import { ViewOrchestrationService } from '../view-orchestration-service'

// Mock the registry
vi.mock('@/core/atlases/registry', () => ({
  getAvailableViewModes: vi.fn((_atlasId: string) => {
    // Default mock returns all modes
    return ['composite-custom', 'built-in-composite', 'split', 'unified']
  }),
}))

/**
 * Helper to create a default ViewState for testing
 */
function createViewState(overrides: Partial<ViewState> = {}): ViewState {
  const defaultAtlasConfig: AtlasConfig = {
    id: 'test',
    name: 'Test Atlas',
    pattern: 'single-focus',
    hasTerritorySelector: true,
    geoDataConfig: {
      dataPath: '/data/test.json',
      metadataPath: '/data/test-metadata.json',
      topologyObjectName: 'territories',
      mainlandCode: 'TEST-MAIN',
      overseasTerritories: [],
    },
  }

  return {
    viewMode: 'composite-custom',
    atlasConfig: defaultAtlasConfig,
    hasPresets: true,
    hasOverseasTerritories: true,
    isPresetLoading: false,
    showProjectionSelector: false,
    showIndividualProjectionSelectors: true,
    isMainlandInTerritories: false,
    showMainland: true,
    ...overrides,
  }
}

describe('viewOrchestrationService', () => {
  describe('shouldShowRightSidebar', () => {
    it('should show right sidebar in unified mode', () => {
      const state = createViewState({ viewMode: 'unified' })
      expect(ViewOrchestrationService.shouldShowRightSidebar(state)).toBe(true)
    })

    it('should show right sidebar in built-in-composite mode', () => {
      const state = createViewState({ viewMode: 'built-in-composite' })
      expect(ViewOrchestrationService.shouldShowRightSidebar(state)).toBe(true)
    })

    it('should show right sidebar in split mode when NOT showing individual projection selectors', () => {
      const state = createViewState({
        viewMode: 'split',
        showIndividualProjectionSelectors: false,
      })
      expect(ViewOrchestrationService.shouldShowRightSidebar(state)).toBe(true)
    })

    it('should hide right sidebar in split mode when showing individual projection selectors', () => {
      const state = createViewState({
        viewMode: 'split',
        showIndividualProjectionSelectors: true,
        showProjectionSelector: false,
      })
      expect(ViewOrchestrationService.shouldShowRightSidebar(state)).toBe(true)
    })

    it('should show right sidebar when projection selector is enabled', () => {
      const state = createViewState({
        viewMode: 'split',
        showProjectionSelector: true,
        showIndividualProjectionSelectors: false,
      })
      expect(ViewOrchestrationService.shouldShowRightSidebar(state)).toBe(true)
    })

    it('should show right sidebar in composite-custom mode', () => {
      const state = createViewState({ viewMode: 'composite-custom' })
      expect(ViewOrchestrationService.shouldShowRightSidebar(state)).toBe(true)
    })
  })

  describe('shouldShowProjectionParams', () => {
    it('should show projection params in unified mode', () => {
      const state = createViewState({ viewMode: 'unified' })
      expect(ViewOrchestrationService.shouldShowProjectionParams(state)).toBe(true)
    })

    it('should NOT show projection params in built-in-composite mode (projections are fixed)', () => {
      const state = createViewState({ viewMode: 'built-in-composite' })
      expect(ViewOrchestrationService.shouldShowProjectionParams(state)).toBe(false)
    })

    it('should show projection params in split mode when NOT showing individual selectors', () => {
      const state = createViewState({
        viewMode: 'split',
        showIndividualProjectionSelectors: false,
      })
      expect(ViewOrchestrationService.shouldShowProjectionParams(state)).toBe(true)
    })

    it('should NOT show projection params in split mode with individual selectors', () => {
      const state = createViewState({
        viewMode: 'split',
        showIndividualProjectionSelectors: true,
        showProjectionSelector: false,
      })
      expect(ViewOrchestrationService.shouldShowProjectionParams(state)).toBe(false)
    })

    it('should NOT show projection params in composite-custom mode', () => {
      const state = createViewState({ viewMode: 'composite-custom' })
      expect(ViewOrchestrationService.shouldShowProjectionParams(state)).toBe(false)
    })
  })

  describe('shouldShowTerritoryControls', () => {
    it('should show territory controls in composite-custom mode', () => {
      const state = createViewState({ viewMode: 'composite-custom' })
      expect(ViewOrchestrationService.shouldShowTerritoryControls(state)).toBe(true)
    })

    it('should show territory controls when individual projection selectors are enabled', () => {
      const state = createViewState({
        viewMode: 'split',
        showIndividualProjectionSelectors: true,
      })
      expect(ViewOrchestrationService.shouldShowTerritoryControls(state)).toBe(true)
    })

    it('should NOT show territory controls in unified mode', () => {
      const state = createViewState({
        viewMode: 'unified',
        showIndividualProjectionSelectors: false,
      })
      expect(ViewOrchestrationService.shouldShowTerritoryControls(state)).toBe(false)
    })

    it('should NOT show territory controls in built-in-composite mode', () => {
      const state = createViewState({
        viewMode: 'built-in-composite',
        showIndividualProjectionSelectors: false,
      })
      expect(ViewOrchestrationService.shouldShowTerritoryControls(state)).toBe(false)
    })
  })

  describe('shouldShowPresetSelector', () => {
    it('should show preset selector in composite-custom mode with presets', () => {
      const state = createViewState({
        viewMode: 'composite-custom',
        hasPresets: true,
      })
      expect(ViewOrchestrationService.shouldShowPresetSelector(state)).toBe(true)
    })

    it('should NOT show preset selector in composite-custom mode without presets', () => {
      const state = createViewState({
        viewMode: 'composite-custom',
        hasPresets: false,
      })
      expect(ViewOrchestrationService.shouldShowPresetSelector(state)).toBe(false)
    })

    it('should NOT show preset selector in other modes even with presets', () => {
      const state = createViewState({
        viewMode: 'unified',
        hasPresets: true,
      })
      expect(ViewOrchestrationService.shouldShowPresetSelector(state)).toBe(false)
    })
  })

  describe('shouldShowImportControls', () => {
    it('should show import controls in composite-custom mode', () => {
      const state = createViewState({ viewMode: 'composite-custom' })
      expect(ViewOrchestrationService.shouldShowImportControls(state)).toBe(true)
    })

    it('should NOT show import controls in other modes', () => {
      const modes: ViewMode[] = ['unified', 'split', 'built-in-composite']
      modes.forEach((mode) => {
        const state = createViewState({ viewMode: mode })
        expect(ViewOrchestrationService.shouldShowImportControls(state)).toBe(false)
      })
    })
  })

  describe('shouldShowGlobalProjectionControls', () => {
    it('should show global projection controls in composite-custom mode', () => {
      const state = createViewState({ viewMode: 'composite-custom' })
      expect(ViewOrchestrationService.shouldShowGlobalProjectionControls(state)).toBe(true)
    })

    it('should NOT show global projection controls in other modes', () => {
      const modes: ViewMode[] = ['unified', 'split', 'built-in-composite']
      modes.forEach((mode) => {
        const state = createViewState({ viewMode: mode })
        expect(ViewOrchestrationService.shouldShowGlobalProjectionControls(state)).toBe(false)
      })
    })
  })

  describe('shouldShowTerritoryParameterControls', () => {
    it('should show territory parameter controls in composite-custom mode', () => {
      const state = createViewState({ viewMode: 'composite-custom' })
      expect(ViewOrchestrationService.shouldShowTerritoryParameterControls(state)).toBe(true)
    })

    it('should NOT show territory parameter controls in other modes', () => {
      const modes: ViewMode[] = ['unified', 'split', 'built-in-composite']
      modes.forEach((mode) => {
        const state = createViewState({ viewMode: mode })
        expect(ViewOrchestrationService.shouldShowTerritoryParameterControls(state)).toBe(false)
      })
    })
  })

  describe('shouldShowMainlandAccordion', () => {
    it('should show mainland accordion with showMainland true', () => {
      const state = createViewState({
        showMainland: true,
      })
      expect(ViewOrchestrationService.shouldShowMainlandAccordion(state)).toBe(true)
    })

    it('should show mainland accordion with mainland in territories', () => {
      const state = createViewState({
        showMainland: false,
        isMainlandInTerritories: true,
      })
      expect(ViewOrchestrationService.shouldShowMainlandAccordion(state)).toBe(true)
    })

    it('should NOT show mainland accordion when no mainland available', () => {
      const state = createViewState({
        showMainland: false,
        isMainlandInTerritories: false,
      })
      expect(ViewOrchestrationService.shouldShowMainlandAccordion(state)).toBe(false)
    })
  })

  describe('shouldShowProjectionDropdown', () => {
    it('should show projection dropdown in split mode', () => {
      const state = createViewState({ viewMode: 'split' })
      expect(ViewOrchestrationService.shouldShowProjectionDropdown(state)).toBe(true)
    })

    it('should show projection dropdown in unified mode', () => {
      const state = createViewState({ viewMode: 'unified' })
      expect(ViewOrchestrationService.shouldShowProjectionDropdown(state)).toBe(true)
    })

    it('should NOT show projection dropdown in composite-custom mode', () => {
      const state = createViewState({ viewMode: 'composite-custom' })
      expect(ViewOrchestrationService.shouldShowProjectionDropdown(state)).toBe(false)
    })
  })

  describe('shouldShowEmptyState', () => {
    it('should show empty state when no overseas territories and no mainland', () => {
      const state = createViewState({
        hasOverseasTerritories: false,
        showMainland: false,
        isMainlandInTerritories: false,
      })
      expect(ViewOrchestrationService.shouldShowEmptyState(state)).toBe(true)
    })

    it('should NOT show empty state when mainland is available', () => {
      const state = createViewState({
        hasOverseasTerritories: false,
        showMainland: true,
      })
      expect(ViewOrchestrationService.shouldShowEmptyState(state)).toBe(false)
    })

    it('should NOT show empty state when overseas territories exist', () => {
      const state = createViewState({
        hasOverseasTerritories: true,
      })
      expect(ViewOrchestrationService.shouldShowEmptyState(state)).toBe(false)
    })
  })

  describe('isViewModeDisabled', () => {
    it('should disable view mode when only one view mode is supported', async () => {
      const { getAvailableViewModes } = await import('@/core/atlases/registry')
      vi.mocked(getAvailableViewModes).mockReturnValueOnce(['unified'])

      const state = createViewState({
        atlasConfig: {
          ...createViewState().atlasConfig,
          id: 'test-single-mode',
        },
      })
      expect(ViewOrchestrationService.isViewModeDisabled(state)).toBe(true)
    })

    it('should NOT disable view mode when multiple view modes are supported', async () => {
      const { getAvailableViewModes } = await import('@/core/atlases/registry')
      vi.mocked(getAvailableViewModes).mockReturnValueOnce(['unified', 'split', 'composite-custom'])

      const state = createViewState({
        atlasConfig: {
          ...createViewState().atlasConfig,
          id: 'test-multi-mode',
        },
      })
      expect(ViewOrchestrationService.isViewModeDisabled(state)).toBe(false)
    })
  })

  describe('getMapRendererMode', () => {
    it('should return composite for composite-custom mode', () => {
      const state = createViewState({ viewMode: 'composite-custom' })
      expect(ViewOrchestrationService.getMapRendererMode(state)).toBe('composite')
    })

    it('should return composite for built-in-composite mode', () => {
      const state = createViewState({ viewMode: 'built-in-composite' })
      expect(ViewOrchestrationService.getMapRendererMode(state)).toBe('composite')
    })

    it('should return split for split mode', () => {
      const state = createViewState({ viewMode: 'split' })
      expect(ViewOrchestrationService.getMapRendererMode(state)).toBe('split')
    })

    it('should return unified for unified mode', () => {
      const state = createViewState({ viewMode: 'unified' })
      expect(ViewOrchestrationService.getMapRendererMode(state)).toBe('unified')
    })
  })

  describe('getSplitViewPattern', () => {
    it('should return single-focus for single-focus pattern', () => {
      const state = createViewState({
        atlasConfig: {
          ...createViewState().atlasConfig,
          pattern: 'single-focus',
        },
      })
      expect(ViewOrchestrationService.getSplitViewPattern(state)).toBe('single-focus')
    })

    it('should return multi-mainland for equal-members pattern', () => {
      const state = createViewState({
        atlasConfig: {
          ...createViewState().atlasConfig,
          pattern: 'equal-members',
        },
      })
      expect(ViewOrchestrationService.getSplitViewPattern(state)).toBe('multi-mainland')
    })
  })

  describe('shouldShowCompositeRenderer', () => {
    it('should show composite renderer in composite-custom mode', () => {
      const state = createViewState({ viewMode: 'composite-custom' })
      expect(ViewOrchestrationService.shouldShowCompositeRenderer(state)).toBe(true)
    })

    it('should show composite renderer in built-in-composite mode', () => {
      const state = createViewState({ viewMode: 'built-in-composite' })
      expect(ViewOrchestrationService.shouldShowCompositeRenderer(state)).toBe(true)
    })

    it('should NOT show composite renderer in split mode', () => {
      const state = createViewState({ viewMode: 'split' })
      expect(ViewOrchestrationService.shouldShowCompositeRenderer(state)).toBe(false)
    })

    it('should NOT show composite renderer in unified mode', () => {
      const state = createViewState({ viewMode: 'unified' })
      expect(ViewOrchestrationService.shouldShowCompositeRenderer(state)).toBe(false)
    })
  })

  describe('shouldShowCompositionBordersToggle', () => {
    it('should show composition borders toggle in composite-custom mode', () => {
      const state = createViewState({ viewMode: 'composite-custom' })
      expect(ViewOrchestrationService.shouldShowCompositionBordersToggle(state)).toBe(true)
    })

    it('should show composition borders toggle in built-in-composite mode', () => {
      const state = createViewState({ viewMode: 'built-in-composite' })
      expect(ViewOrchestrationService.shouldShowCompositionBordersToggle(state)).toBe(true)
    })

    it('should NOT show composition borders toggle in split mode', () => {
      const state = createViewState({ viewMode: 'split' })
      expect(ViewOrchestrationService.shouldShowCompositionBordersToggle(state)).toBe(false)
    })

    it('should NOT show composition borders toggle in unified mode', () => {
      const state = createViewState({ viewMode: 'unified' })
      expect(ViewOrchestrationService.shouldShowCompositionBordersToggle(state)).toBe(false)
    })
  })

  describe('shouldShowScalePreservationToggle', () => {
    it('should show scale preservation toggle in split mode', () => {
      const state = createViewState({ viewMode: 'split' })
      expect(ViewOrchestrationService.shouldShowScalePreservationToggle(state)).toBe(true)
    })

    it('should NOT show scale preservation toggle in composite-custom mode', () => {
      const state = createViewState({ viewMode: 'composite-custom' })
      expect(ViewOrchestrationService.shouldShowScalePreservationToggle(state)).toBe(false)
    })

    it('should NOT show scale preservation toggle in unified mode', () => {
      const state = createViewState({ viewMode: 'unified' })
      expect(ViewOrchestrationService.shouldShowScalePreservationToggle(state)).toBe(false)
    })
  })
})
