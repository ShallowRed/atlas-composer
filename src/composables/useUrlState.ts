import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { TerritoryDefaultsService } from '@/services/atlas/territory-defaults-service'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { logger } from '@/utils/logger'

const debug = logger.vue.composable

/**
 * Composable for managing application state in URL parameters
 * Enables shareable links with full configuration state
 */
export function useUrlState() {
  const route = useRoute()
  const router = useRouter()
  const configStore = useConfigStore()
  const parameterStore = useParameterStore()
  const geoDataStore = useGeoDataStore()

  /**
   * Serialize current state to URL-safe string
   * Only includes territory settings that differ from atlas-specific defaults
   */
  function serializeState() {
    debug('Serializing state...')

    const state: Record<string, string> = {
      atlas: configStore.selectedAtlas,
      view: configStore.viewMode,
      projection: configStore.selectedProjection ?? 'mercator', // Fallback for URL only
      territory: configStore.territoryMode,
    }

    // Add projection parameters if customized

    if (configStore.customRotateLongitude !== null)
      state.rlon = String(configStore.customRotateLongitude)
    if (configStore.customRotateLatitude !== null)
      state.rlat = String(configStore.customRotateLatitude)
    if (configStore.customCenterLongitude !== null)
      state.clon = String(configStore.customCenterLongitude)
    if (configStore.customCenterLatitude !== null)
      state.clat = String(configStore.customCenterLatitude)
    if (configStore.customParallel1 !== null)
      state.p1 = String(configStore.customParallel1)
    if (configStore.customParallel2 !== null)
      state.p2 = String(configStore.customParallel2)

    // Add composite projection if in composite mode
    if (configStore.viewMode === 'built-in-composite' && configStore.compositeProjection) {
      state.composite = configStore.compositeProjection
    }

    // Get atlas-specific defaults to compare against
    const atlasService = configStore.atlasService
    const territories = atlasService.getAllTerritories()
    const defaults = TerritoryDefaultsService.initializeAll(
      territories,
      configStore.selectedProjection ?? 'mercator', // Fallback for defaults calculation
    )

    // Encode territory-specific settings (scale multipliers, translations)
    // Only include if different from atlas-specific defaults
    // Include both mainland and overseas territories
    const territorySettings: Record<string, number> = {}
    let hasSettings = false

    // Get scale multipliers from parameter store
    for (const territory of geoDataStore.allActiveTerritories) {
      const params = parameterStore.getTerritoryParameters(territory.code)
      const scale = params.scaleMultiplier ?? 1.0
      const defaultScale = defaults.scales[territory.code] ?? 1
      if (scale !== defaultScale) {
        territorySettings[`s_${territory.code}`] = scale
        hasSettings = true
      }
    }

    // Get translations from parameter store
    for (const territory of geoDataStore.allActiveTerritories) {
      const translation = parameterStore.getTerritoryTranslation(territory.code)
      const defaultTranslation = defaults.translations[territory.code] ?? { x: 0, y: 0 }
      if (translation.x !== defaultTranslation.x || translation.y !== defaultTranslation.y) {
        territorySettings[`tx_${territory.code}`] = translation.x
        territorySettings[`ty_${territory.code}`] = translation.y
        hasSettings = true
      }
    }

    if (hasSettings) {
      state.t = JSON.stringify(territorySettings)
    }

    return state
  }

  /**
   * Deserialize state from URL parameters
   */
  function deserializeState(params: Record<string, any>) {
    // Basic configuration
    if (params.atlas)
      configStore.selectedAtlas = params.atlas
    if (params.view)
      configStore.viewMode = params.view
    if (params.projection)
      configStore.selectedProjection = params.projection
    if (params.territory)
      configStore.territoryMode = params.territory

    // Projection parameters
    if (params.rlon !== undefined)
      configStore.setCustomRotateLongitude(Number(params.rlon))
    if (params.rlat !== undefined)
      configStore.setCustomRotateLatitude(Number(params.rlat))
    if (params.clon !== undefined)
      configStore.setCustomCenterLongitude(Number(params.clon))
    if (params.clat !== undefined)
      configStore.setCustomCenterLatitude(Number(params.clat))
    if (params.p1 !== undefined)
      configStore.setCustomParallel1(Number(params.p1))
    if (params.p2 !== undefined)
      configStore.setCustomParallel2(Number(params.p2))

    // Composite projection
    if (params.composite)
      configStore.compositeProjection = params.composite

    // Territory settings
    if (params.t) {
      try {
        const settings = JSON.parse(params.t)
        for (const [key, value] of Object.entries(settings)) {
          if (key.startsWith('s_')) {
            const code = key.substring(2)
            parameterStore.setTerritoryParameter(code, 'scaleMultiplier', Number(value))
          }
          else if (key.startsWith('tx_')) {
            const code = key.substring(3)
            parameterStore.setTerritoryTranslation(code, 'x', Number(value))
          }
          else if (key.startsWith('ty_')) {
            const code = key.substring(3)
            parameterStore.setTerritoryTranslation(code, 'y', Number(value))
          }
        }
      }
      catch (error) {
        debug('Failed to parse territory settings from URL: %o', error)
      }
    }
  }

  /**
   * Update URL with current state
   */
  async function updateUrl() {
    const state = serializeState()
    await router.replace({
      query: state,
    })
  }

  /**
   * Restore state from URL on load
   */
  function restoreFromUrl() {
    if (route.query && Object.keys(route.query).length > 0) {
      deserializeState(route.query)
      return true
    }
    return false
  }

  /**
   * Generate shareable URL
   */
  const shareableUrl = computed(() => {
    const state = serializeState()
    const url = new URL(window.location.origin + window.location.pathname)
    url.search = new URLSearchParams(state).toString()
    return url.toString()
  })

  /**
   * Copy shareable URL to clipboard
   */
  async function copyShareableUrl() {
    try {
      await navigator.clipboard.writeText(shareableUrl.value)
      return true
    }
    catch (error) {
      debug('Failed to copy URL: %o', error)
      return false
    }
  }

  /**
   * Setup automatic URL syncing (optional)
   */
  function enableAutoSync() {
    // Watch for config changes and update URL
    watch(
      () => ({
        atlas: configStore.selectedAtlas,
        view: configStore.viewMode,
        projection: configStore.selectedProjection,
        territory: configStore.territoryMode,
      }),
      () => {
        updateUrl()
      },
      { deep: true },
    )
  }

  return {
    serializeState,
    deserializeState,
    updateUrl,
    restoreFromUrl,
    shareableUrl,
    copyShareableUrl,
    enableAutoSync,
  }
}
