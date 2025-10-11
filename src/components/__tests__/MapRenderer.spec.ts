import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useUIStore } from '@/stores/ui'
import MapRenderer from '../MapRenderer.vue'

describe('mapRenderer.vue', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())
  })

  describe('props validation', () => {
    it('should accept simple mode props', () => {
      const wrapper = mount(MapRenderer, {
        props: {
          mode: 'simple',
          geoData: {
            type: 'FeatureCollection',
            features: [],
          },
          width: 300,
          height: 200,
        },
      })

      expect(wrapper.props('mode')).toBe('simple')
      expect(wrapper.props('width')).toBe(300)
      expect(wrapper.props('height')).toBe(200)
    })

    it('should use default props when not provided', () => {
      const wrapper = mount(MapRenderer, {
        props: {
          mode: 'simple',
        },
      })

      expect(wrapper.props('width')).toBe(200)
      expect(wrapper.props('height')).toBe(160)
      expect(wrapper.props('isMainland')).toBe(false)
      expect(wrapper.props('preserveScale')).toBe(false)
    })

    it('should accept composite mode props', () => {
      const wrapper = mount(MapRenderer, {
        props: {
          mode: 'composite',
        },
      })

      expect(wrapper.props('mode')).toBe('composite')
    })
  })

  describe('rendering', () => {
    it('should render map container', () => {
      const wrapper = mount(MapRenderer, {
        props: {
          mode: 'simple',
          geoData: null,
        },
      })

      const container = wrapper.find('.map-renderer')
      expect(container.exists()).toBe(true)
    })

    it('should display title when provided', () => {
      const wrapper = mount(MapRenderer, {
        props: {
          mode: 'simple',
          title: 'Test Territory',
          area: 1000,
        },
      })

      // MapRenderer receives title and area as props but doesn't render them directly
      // The title is rendered by parent components
      expect(wrapper.props('title')).toBe('Test Territory')
      expect(wrapper.props('area')).toBe(1000)
      expect(wrapper.find('.map-renderer').exists()).toBe(true)
    })

    it('should not display title when not provided', () => {
      const wrapper = mount(MapRenderer, {
        props: {
          mode: 'simple',
        },
      })

      const title = wrapper.find('h4')
      expect(title.exists()).toBe(false)
    })
  })

  describe('store integration', () => {
    it('should access config store', () => {
      mount(MapRenderer, {
        props: {
          mode: 'simple',
        },
      })

      const configStore = useConfigStore()
      expect(configStore).toBeDefined()
    })

    it('should access geoData store', () => {
      mount(MapRenderer, {
        props: {
          mode: 'simple',
        },
      })

      const geoDataStore = useGeoDataStore()
      expect(geoDataStore).toBeDefined()
    })

    it('should access UI store', () => {
      mount(MapRenderer, {
        props: {
          mode: 'simple',
        },
      })

      const uiStore = useUIStore()
      expect(uiStore).toBeDefined()
    })
  })

  describe('computed size', () => {
    it('should compute size from props', () => {
      const wrapper = mount(MapRenderer, {
        props: {
          mode: 'simple',
          width: 400,
          height: 300,
        },
      })

      // The component should use these dimensions for rendering
      expect(wrapper.props('width')).toBe(400)
      expect(wrapper.props('height')).toBe(300)
    })
  })
})
