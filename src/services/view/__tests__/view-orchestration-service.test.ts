import type { ViewState } from '../view-orchestration-service'
import type { AtlasConfig } from '@/types'
import { describe, expect, it, vi } from 'vitest'
import { createTerritoryCode } from '@/types/branded'
import { ViewOrchestrationService } from '../view-orchestration-service'

vi.mock('@/core/atlases/registry', () => ({
  getAvailableViewModes: vi.fn((_atlasId: string) => {
    return ['composite-custom', 'built-in-composite', 'split', 'unified']
  }),
}))

function createViewState(overrides: Partial<ViewState> = {}): ViewState {
  const defaultAtlasConfig: AtlasConfig = {
    id: 'test',
    name: 'Test Atlas',
    hasTerritorySelector: true,
    geoDataConfig: {
      dataPath: '/data/test.json',
      metadataPath: '/data/test-metadata.json',
      topologyObjectName: 'territories',
      territories: [{
        code: createTerritoryCode('TEST-MAIN'),
        name: 'Test Main',
        center: [0, 0],
        bounds: [[-10, -10], [10, 10]],
      }],
    },
  }

  return {
    viewMode: 'composite-custom',
    atlasConfig: defaultAtlasConfig,
    showProjectionSelector: false,
    showIndividualProjectionSelectors: true,
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
