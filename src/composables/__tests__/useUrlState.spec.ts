import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRoute, useRouter } from 'vue-router'
import { useConfigStore } from '@/stores/config'
import { useParameterStore } from '@/stores/parameters'
import { useTerritoryStore } from '@/stores/territory'
import { useUrlState } from '../useUrlState'

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
  useRoute: vi.fn(),
}))

describe('useUrlState', () => {
  let mockRouter: any
  let mockRoute: any

  beforeEach(() => {
    // Create fresh pinia instance
    setActivePinia(createPinia())

    // Setup mock router and route
    mockRouter = {
      replace: vi.fn(),
    }
    mockRoute = {
      query: {},
    }

    vi.mocked(useRouter).mockReturnValue(mockRouter)
    vi.mocked(useRoute).mockReturnValue(mockRoute)
  })

  describe('serializeState', () => {
    it('should serialize basic configuration without default territory settings', () => {
      const configStore = useConfigStore()
      const territoryStore = useTerritoryStore()

      configStore.selectedAtlas = 'france'
      configStore.viewMode = 'composite-custom'
      configStore.selectedProjection = 'azimuthal-equal-area'
      configStore.projectionMode = 'individual'
      configStore.territoryMode = 'all'

      // Initialize with defaults (this happens in the app)
      const atlasService = configStore.atlasService
      const territories = atlasService.getAllTerritories()
      territoryStore.initializeDefaults(territories, 'azimuthal-equal-area')

      const { serializeState } = useUrlState()
      const state = serializeState()

      // Should not include 't' parameter when all territory settings are at defaults
      expect(state).toEqual({
        atlas: 'france',
        view: 'composite-custom',
        projection: 'azimuthal-equal-area',
        projMode: 'individual',
        territory: 'all',
      })
    })

    it('should include custom projection parameters when set', () => {
      const configStore = useConfigStore()
      configStore.selectedAtlas = 'france'
      configStore.setCustomRotateLongitude(10)
      configStore.setCustomRotateLatitude(20)
      configStore.setCustomCenterLongitude(30)
      configStore.setCustomCenterLatitude(40)

      const { serializeState } = useUrlState()
      const state = serializeState()

      expect(state.rlon).toBe('10')
      expect(state.rlat).toBe('20')
      expect(state.clon).toBe('30')
      expect(state.clat).toBe('40')
    })

    it('should include composite projection in composite-existing mode', () => {
      const configStore = useConfigStore()
      configStore.viewMode = 'composite-existing'
      configStore.compositeProjection = 'conic-conformal-france'

      const { serializeState } = useUrlState()
      const state = serializeState()

      expect(state.composite).toBe('conic-conformal-france')
    })

    it('should include territory scales when different from atlas defaults', () => {
      const configStore = useConfigStore()
      const territoryStore = useTerritoryStore()

      configStore.selectedAtlas = 'france'

      // Initialize with defaults first
      const atlasService = configStore.atlasService
      const territories = atlasService.getAllTerritories()
      territoryStore.initializeDefaults(territories, configStore.selectedProjection || 'mercator')

      // Now change some values to be different from defaults
      const parameterStore = useParameterStore()
      const currentParams = parameterStore.getTerritoryParameters('FR-GP')
      const currentScale = currentParams.scaleMultiplier ?? 1
      parameterStore.setTerritoryParameter('FR-GP', 'scaleMultiplier', currentScale * 1.5)
      parameterStore.setTerritoryParameter('FR-MTQ', 'scaleMultiplier', 3.0) // Different from default

      const { serializeState } = useUrlState()
      const state = serializeState()

      expect(state.t).toBeDefined()
      const territorySettings = JSON.parse(state.t!)
      // Should include the modified scales
      expect(territorySettings['s_FR-GP']).toBeDefined()
      expect(territorySettings['s_FR-MTQ']).toBe(3.0)
    })

    it('should include territory translations when different from atlas defaults', () => {
      const configStore = useConfigStore()
      const territoryStore = useTerritoryStore()

      configStore.selectedAtlas = 'france'

      // Initialize with defaults first
      const atlasService = configStore.atlasService
      const territories = atlasService.getAllTerritories()
      territoryStore.initializeDefaults(territories, configStore.selectedProjection || 'mercator')

      // Now change translation to be different from defaults
      const currentTranslation = territoryStore.territoryTranslations['FR-GP'] ?? { x: 0, y: 0 }
      territoryStore.setTerritoryTranslation('FR-GP', 'x', currentTranslation.x + 100)
      territoryStore.setTerritoryTranslation('FR-GP', 'y', currentTranslation.y - 50)

      const { serializeState } = useUrlState()
      const state = serializeState()

      expect(state.t).toBeDefined()
      const territorySettings = JSON.parse(state.t!)
      // Should include the modified translations
      expect(territorySettings['tx_FR-GP']).toBeDefined()
      expect(territorySettings['ty_FR-GP']).toBeDefined()
    })

    it('should not include territory settings when all match atlas defaults', () => {
      const configStore = useConfigStore()
      const territoryStore = useTerritoryStore()

      configStore.selectedAtlas = 'france'

      // Initialize with atlas defaults
      const atlasService = configStore.atlasService
      const territories = atlasService.getAllTerritories()
      territoryStore.initializeDefaults(territories, configStore.selectedProjection || 'mercator')

      const { serializeState } = useUrlState()
      const state = serializeState()

      // Should not include territory settings when they match atlas defaults
      expect(state.t).toBeUndefined()
    })
  })

  describe('deserializeState', () => {
    it('should restore basic configuration from URL params', () => {
      const configStore = useConfigStore()
      const { deserializeState } = useUrlState()

      const params = {
        atlas: 'portugal',
        view: 'split',
        projection: 'mercator',
        projMode: 'uniform',
        territory: 'mainland',
      }

      deserializeState(params)

      expect(configStore.selectedAtlas).toBe('portugal')
      expect(configStore.viewMode).toBe('split')
      expect(configStore.selectedProjection).toBe('mercator')
      expect(configStore.projectionMode).toBe('uniform')
      expect(configStore.territoryMode).toBe('mainland')
    })

    it('should restore custom projection parameters', () => {
      const configStore = useConfigStore()
      const { deserializeState } = useUrlState()

      const params = {
        atlas: 'france',
        rlon: '15',
        rlat: '25',
        clon: '35',
        clat: '45',
        p1: '30',
        p2: '60',
      }

      deserializeState(params)

      expect(configStore.customRotateLongitude).toBe(15)
      expect(configStore.customRotateLatitude).toBe(25)
      expect(configStore.customCenterLongitude).toBe(35)
      expect(configStore.customCenterLatitude).toBe(45)
      expect(configStore.customParallel1).toBe(30)
      expect(configStore.customParallel2).toBe(60)
    })

    it('should restore composite projection', () => {
      const configStore = useConfigStore()
      const { deserializeState } = useUrlState()

      const params = {
        atlas: 'france',
        composite: 'conic-conformal-france',
      }

      deserializeState(params)

      expect(configStore.compositeProjection).toBe('conic-conformal-france')
    })

    it('should restore territory settings', () => {
      const territoryStore = useTerritoryStore()
      const parameterStore = useParameterStore()
      const { deserializeState } = useUrlState()

      const territorySettings = {
        s_GLP: 1.5,
        s_MTQ: 2.0,
        tx_GLP: 100,
        ty_GLP: -50,
      }

      const params = {
        atlas: 'france',
        t: JSON.stringify(territorySettings),
      }

      deserializeState(params)

      expect(parameterStore.getTerritoryParameters('GLP').scaleMultiplier).toBe(1.5)
      expect(parameterStore.getTerritoryParameters('MTQ').scaleMultiplier).toBe(2.0)
      expect(territoryStore.territoryTranslations.GLP).toEqual({ x: 100, y: -50 })
    })

    it('should handle malformed territory settings gracefully', () => {
      const { deserializeState } = useUrlState()

      const params = {
        atlas: 'france',
        t: 'invalid json',
      }

      // Should not throw
      expect(() => deserializeState(params)).not.toThrow()
    })

    it('should handle partial configuration', () => {
      const configStore = useConfigStore()
      const initialAtlas = configStore.selectedAtlas
      const { deserializeState } = useUrlState()

      const params = {
        projection: 'mercator',
      }

      deserializeState(params)

      // Should update projection
      expect(configStore.selectedProjection).toBe('mercator')
      // Should not change atlas
      expect(configStore.selectedAtlas).toBe(initialAtlas)
    })
  })

  describe('shareableUrl', () => {
    it('should generate valid URL with current state', () => {
      const configStore = useConfigStore()
      configStore.selectedAtlas = 'france'
      configStore.viewMode = 'composite-custom'
      configStore.selectedProjection = 'azimuthal-equal-area'

      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'http://localhost:3000',
          pathname: '/',
        },
        writable: true,
      })

      const { shareableUrl } = useUrlState()
      const url = shareableUrl.value

      expect(url).toContain('http://localhost:3000/')
      expect(url).toContain('atlas=france')
      expect(url).toContain('view=composite-custom')
      expect(url).toContain('projection=azimuthal-equal-area')
    })
  })

  describe('restoreFromUrl', () => {
    it('should return true when URL has query parameters', () => {
      mockRoute.query = {
        atlas: 'france',
        view: 'split',
      }

      const { restoreFromUrl } = useUrlState()
      const restored = restoreFromUrl()

      expect(restored).toBe(true)
    })

    it('should return false when URL has no query parameters', () => {
      mockRoute.query = {}

      const { restoreFromUrl } = useUrlState()
      const restored = restoreFromUrl()

      expect(restored).toBe(false)
    })

    it('should restore state from URL query', () => {
      const configStore = useConfigStore()
      mockRoute.query = {
        atlas: 'spain',
        view: 'unified',
        projection: 'mercator',
      }

      const { restoreFromUrl } = useUrlState()
      restoreFromUrl()

      expect(configStore.selectedAtlas).toBe('spain')
      expect(configStore.viewMode).toBe('unified')
      expect(configStore.selectedProjection).toBe('mercator')
    })
  })

  describe('round-trip serialization', () => {
    it('should restore exact same state after serialize and deserialize', () => {
      const configStore = useConfigStore()
      const territoryStore = useTerritoryStore()
      const parameterStore = useParameterStore()

      // Set up complex state
      configStore.selectedAtlas = 'france'
      configStore.viewMode = 'composite-custom'
      configStore.selectedProjection = 'azimuthal-equal-area'
      configStore.projectionMode = 'individual'
      configStore.territoryMode = 'all'
      configStore.setCustomRotateLongitude(10)
      configStore.setCustomRotateLatitude(20)
      parameterStore.setTerritoryParameter('GLP', 'scaleMultiplier', 1.5)
      territoryStore.setTerritoryTranslation('MTQ', 'x', 100)

      const { serializeState, deserializeState } = useUrlState()

      // Serialize current state
      const serialized = serializeState()

      // Reset stores to defaults
      const configStore2 = useConfigStore()
      configStore2.selectedAtlas = 'world'
      configStore2.setCustomRotateLongitude(null)

      // Deserialize
      deserializeState(serialized)

      // Verify state is restored
      expect(configStore2.selectedAtlas).toBe('france')
      expect(configStore2.viewMode).toBe('composite-custom')
      expect(configStore2.selectedProjection).toBe('azimuthal-equal-area')
      expect(configStore2.customRotateLongitude).toBe(10)
      expect(configStore2.customRotateLatitude).toBe(20)
      expect(parameterStore.getTerritoryParameters('GLP').scaleMultiplier).toBe(1.5)
      expect(territoryStore.territoryTranslations.MTQ).toEqual({ x: 100, y: 0 })
    })
  })
})
