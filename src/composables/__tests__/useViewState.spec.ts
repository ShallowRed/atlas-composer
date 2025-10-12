import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConfigStore } from '@/stores/config'
import { useViewState } from '../useViewState'

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'en' },
  }),
  createI18n: () => ({}),
}))

// Mock view-mode-icons utility
vi.mock('@/utils/view-mode-icons', () => ({
  getViewModeIcon: (viewMode: string) => `icon-${viewMode}`,
}))

describe('useViewState', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('view mode flags', () => {
    it('should detect composite modes correctly', () => {
      const configStore = useConfigStore()
      const { isCompositeMode, isCompositeCustomMode, isCompositeExistingMode } = useViewState()

      // Test composite-custom
      configStore.viewMode = 'composite-custom'
      expect(isCompositeMode.value).toBe(true)
      expect(isCompositeCustomMode.value).toBe(true)
      expect(isCompositeExistingMode.value).toBe(false)

      // Test composite-existing
      configStore.viewMode = 'composite-existing'
      expect(isCompositeMode.value).toBe(true)
      expect(isCompositeCustomMode.value).toBe(false)
      expect(isCompositeExistingMode.value).toBe(true)
    })

    it('should detect split mode correctly', () => {
      const configStore = useConfigStore()
      const { isSplitMode, isCompositeMode } = useViewState()

      configStore.viewMode = 'split'
      expect(isSplitMode.value).toBe(true)
      expect(isCompositeMode.value).toBe(false)
    })

    it('should detect unified mode correctly', () => {
      const configStore = useConfigStore()
      const { isUnifiedMode, isCompositeMode } = useViewState()

      configStore.viewMode = 'unified'
      expect(isUnifiedMode.value).toBe(true)
      expect(isCompositeMode.value).toBe(false)
    })
  })

  describe('card UI helpers', () => {
    it('should return correct card title for each view mode', () => {
      const configStore = useConfigStore()
      const { cardTitle } = useViewState()

      configStore.viewMode = 'split'
      expect(cardTitle.value).toBe('mode.split')

      configStore.viewMode = 'composite-existing'
      expect(cardTitle.value).toBe('mode.compositeExisting')

      configStore.viewMode = 'composite-custom'
      expect(cardTitle.value).toBe('mode.compositeCustom')

      configStore.viewMode = 'unified'
      expect(cardTitle.value).toBe('mode.unified')
    })

    it('should return correct card icon for each view mode', () => {
      const configStore = useConfigStore()
      const { cardIcon } = useViewState()

      configStore.viewMode = 'split'
      expect(cardIcon.value).toBe('icon-split')

      configStore.viewMode = 'unified'
      expect(cardIcon.value).toBe('icon-unified')
    })
  })

  describe('compound conditions', () => {
    it('should show right sidebar for unified mode', () => {
      const configStore = useConfigStore()
      const { shouldShowRightSidebar } = useViewState()

      configStore.viewMode = 'unified'
      expect(shouldShowRightSidebar.value).toBe(true)
    })

    it('should show right sidebar for composite-existing mode', () => {
      const configStore = useConfigStore()
      const { shouldShowRightSidebar } = useViewState()

      configStore.viewMode = 'composite-existing'
      expect(shouldShowRightSidebar.value).toBe(true)
    })

    it('should show right sidebar in split mode without individual selectors', () => {
      const configStore = useConfigStore()
      const { shouldShowRightSidebar } = useViewState()

      configStore.viewMode = 'split'
      configStore.projectionMode = 'uniform'
      expect(shouldShowRightSidebar.value).toBe(true)
    })

    it('should show right sidebar when projection selector is enabled', () => {
      const configStore = useConfigStore()
      const { shouldShowRightSidebar } = useViewState()

      configStore.viewMode = 'composite-custom'
      configStore.projectionMode = 'uniform'
      expect(shouldShowRightSidebar.value).toBe(true)
    })

    it('should show projection params for unified mode', () => {
      const configStore = useConfigStore()
      const { shouldShowProjectionParams } = useViewState()

      configStore.viewMode = 'unified'
      expect(shouldShowProjectionParams.value).toBe(true)
    })

    it('should show projection params for composite-existing mode', () => {
      const configStore = useConfigStore()
      const { shouldShowProjectionParams } = useViewState()

      configStore.viewMode = 'composite-existing'
      expect(shouldShowProjectionParams.value).toBe(true)
    })

    it('should show territory controls when individual selectors are enabled', () => {
      const configStore = useConfigStore()
      const { shouldShowTerritoryControls } = useViewState()

      configStore.viewMode = 'composite-custom'
      configStore.projectionMode = 'individual'
      expect(shouldShowTerritoryControls.value).toBe(true)
    })

    it('should not show territory controls when individual selectors are disabled', () => {
      const configStore = useConfigStore()
      const { shouldShowTerritoryControls } = useViewState()

      configStore.viewMode = 'unified'
      configStore.projectionMode = 'uniform'
      expect(shouldShowTerritoryControls.value).toBe(false)
    })
  })
})
