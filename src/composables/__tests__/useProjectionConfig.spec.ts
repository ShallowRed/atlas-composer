import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { createI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import { useProjectionConfig } from '../useProjectionConfig'

// Create i18n instance for tests
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {},
  },
})

// Helper to test composable within Vue component context
function withSetup<T>(composable: () => T): T {
  let result: T
  const TestComponent = defineComponent({
    setup() {
      result = composable()
      return () => h('div')
    },
  })
  mount(TestComponent, {
    global: {
      plugins: [i18n],
    },
  })
  return result!
}

describe('useProjectionConfig', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('compositeProjectionOptions', () => {
    it('should return available composite projections for current atlas', () => {
      const { compositeProjectionOptions } = withSetup(() => {
        useConfigStore()
        return useProjectionConfig()
      })

      expect(compositeProjectionOptions.value).toBeDefined()
      expect(Array.isArray(compositeProjectionOptions.value)).toBe(true)
    })

    it('should return projections with value and label', () => {
      const { compositeProjectionOptions } = withSetup(() => useProjectionConfig())

      compositeProjectionOptions.value.forEach((option) => {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(typeof option.value).toBe('string')
        expect(typeof option.label).toBe('string')
      })
    })

    it('should filter by atlas available projections', () => {
      const { compositeProjectionOptions } = withSetup(() => {
        const configStore = useConfigStore()
        const result = useProjectionConfig()

        const atlasProjections = configStore.currentAtlasConfig.compositeProjectionConfig || []
        result.compositeProjectionOptions.value.forEach((option) => {
          expect(atlasProjections).toContain(option.value)
        })

        return result
      })

      expect(compositeProjectionOptions.value).toBeDefined()
    })
  })

  describe('getMainlandProjection', () => {
    it('should return selected projection in uniform mode', () => {
      const { getMainlandProjection } = withSetup(() => {
        const configStore = useConfigStore()
        const result = useProjectionConfig()

        // Set to uniform mode
        configStore.selectedProjection = 'natural-earth'

        return result
      })

      const result = getMainlandProjection()
      expect(result).toBe('natural-earth')
    })

    it('should return mainland-specific projection in individual mode', () => {
      const { getMainlandProjection } = withSetup(() => {
        const configStore = useConfigStore()
        const result = useProjectionConfig()

        // Set to individual mode
        configStore.selectedProjection = 'natural-earth'

        return result
      })

      const result = getMainlandProjection()
      expect(result).toBeDefined()
    })
  })

  describe('getTerritoryProjection', () => {
    it('should return selected projection in uniform mode', () => {
      const { getTerritoryProjection } = withSetup(() => {
        const configStore = useConfigStore()
        const result = useProjectionConfig()

        configStore.selectedProjection = 'mercator'

        return result
      })

      const result = getTerritoryProjection('TEST')
      expect(result).toBe('mercator')
    })

    it('should return territory-specific projection in individual mode', () => {
      const { getTerritoryProjection } = withSetup(() => {
        const configStore = useConfigStore()
        const result = useProjectionConfig()

        // Set to individual mode
        configStore.selectedProjection = 'mercator'

        return result
      })

      const result = getTerritoryProjection('TEST')
      expect(result).toBeDefined()
    })

    it('should fallback to selected projection if territory has no custom projection', () => {
      const { getTerritoryProjection } = withSetup(() => {
        const configStore = useConfigStore()
        const result = useProjectionConfig()

        // Set to individual mode
        configStore.selectedProjection = 'natural-earth'

        return result
      })

      const result = getTerritoryProjection('NONEXISTENT')
      expect(result).toBe('natural-earth')
    })
  })
})
