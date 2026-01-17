import type { TerritoryCode } from '@/types'
import { computed, watch } from 'vue'

import { useRoute, useRouter } from 'vue-router'
import { TerritoryDefaultsService } from '@/services/atlas/territory-defaults-service'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'
import { createProjectionId } from '@/types/branded'
import { logger } from '@/utils/logger'

const debug = logger.vue.composable

/**
 * Composable for managing application state in URL parameters
 * Enables shareable links with full configuration state
 */
export function useUrlState() {
  const route = useRoute()
  const router = useRouter()
  const atlasStore = useAtlasStore()
  const parameterStore = useParameterStore()
  const projectionStore = useProjectionStore()
  const viewStore = useViewStore()
  const geoDataStore = useGeoDataStore()

  /**
   * Serialize current state to URL-safe string
   * Only includes territory settings that differ from atlas-specific defaults
   */
  function serializeState() {
    debug('Serializing state...')

    const state: Record<string, string> = {
      atlas: atlasStore.selectedAtlasId,
      view: viewStore.viewMode,
      projection: projectionStore.selectedProjection ?? 'mercator', // Fallback for URL only
      territory: viewStore.territoryMode,
    }

    // Add projection parameters if customized

    if (projectionStore.customRotateLongitude !== null)
      state.rlon = String(projectionStore.customRotateLongitude)
    if (projectionStore.customRotateLatitude !== null)
      state.rlat = String(projectionStore.customRotateLatitude)
    if (projectionStore.customCenterLongitude !== null)
      state.clon = String(projectionStore.customCenterLongitude)
    if (projectionStore.customCenterLatitude !== null)
      state.clat = String(projectionStore.customCenterLatitude)
    if (projectionStore.customParallel1 !== null)
      state.p1 = String(projectionStore.customParallel1)
    if (projectionStore.customParallel2 !== null)
      state.p2 = String(projectionStore.customParallel2)

    // Add composite projection if in composite mode
    if (viewStore.viewMode === 'built-in-composite' && projectionStore.compositeProjection) {
      state.composite = projectionStore.compositeProjection
    }

    // Get atlas-specific defaults to compare against
    const atlasService = atlasStore.atlasService
    const territories = atlasService.getAllTerritories()
    const defaults = TerritoryDefaultsService.initializeAll(
      territories,
      // Convert: Fallback string to ProjectionId for defaults calculation
      projectionStore.selectedProjection ?? createProjectionId('mercator'),
    )

    // Encode territory-specific settings (scale multipliers, translations)
    // Only include if different from atlas-specific defaults
    const territorySettings: Record<string, number> = {}
    let hasSettings = false

    // Get scale multipliers from parameter store
    for (const territory of geoDataStore.allActiveTerritories) {
      // Convert: Territory.code from GeoJSON
      const code = territory.code as TerritoryCode
      const params = parameterStore.getTerritoryParameters(code)
      const scale = params.scaleMultiplier ?? 1.0
      const defaultScale = defaults.scales[code] ?? 1
      if (scale !== defaultScale) {
        territorySettings[`s_${territory.code}`] = scale
        hasSettings = true
      }
    }

    // Get translations from parameter store
    for (const territory of geoDataStore.allActiveTerritories) {
      // Convert: Territory.code from GeoJSON
      const code = territory.code as TerritoryCode
      const translation = parameterStore.getTerritoryTranslation(code)
      const defaultTranslation = defaults.translations[code] ?? { x: 0, y: 0 }
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
      atlasStore.selectedAtlasId = params.atlas
    if (params.view)
      viewStore.setViewMode(params.view)
    if (params.projection)
      projectionStore.setSelectedProjection(params.projection)
    if (params.territory)
      viewStore.setTerritoryMode(params.territory)

    // Projection parameters
    if (params.rlon !== undefined)
      projectionStore.setCustomRotateLongitude(Number(params.rlon))
    if (params.rlat !== undefined)
      projectionStore.setCustomRotateLatitude(Number(params.rlat))
    if (params.clon !== undefined)
      projectionStore.setCustomCenterLongitude(Number(params.clon))
    if (params.clat !== undefined)
      projectionStore.setCustomCenterLatitude(Number(params.clat))
    if (params.p1 !== undefined)
      projectionStore.setCustomParallel1(Number(params.p1))
    if (params.p2 !== undefined)
      projectionStore.setCustomParallel2(Number(params.p2))

    // Composite projection
    if (params.composite)
      projectionStore.setCompositeProjection(params.composite)

    // Territory settings
    if (params.t) {
      try {
        const settings = JSON.parse(params.t)
        for (const [key, value] of Object.entries(settings)) {
          if (key.startsWith('s_')) {
            const code = key.substring(2)
            // Convert: Territory code from URL parameter
            parameterStore.setTerritoryParameter(code as TerritoryCode, 'scaleMultiplier', Number(value))
          }
          else if (key.startsWith('tx_')) {
            const code = key.substring(3)
            // Convert: Territory code from URL parameter
            parameterStore.setTerritoryTranslation(code as TerritoryCode, 'x', Number(value))
          }
          else if (key.startsWith('ty_')) {
            const code = key.substring(3)
            // Convert: Territory code from URL parameter
            parameterStore.setTerritoryTranslation(code as TerritoryCode, 'y', Number(value))
          }
        }
      }
      catch (error) {
        debug('Failed to parse territory settings from URL: %o', error)
      }
    }
  }

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
        atlas: atlasStore.selectedAtlasId,
        view: viewStore.viewMode,
        projection: projectionStore.selectedProjection,
        territory: viewStore.territoryMode,
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
