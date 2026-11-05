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

export function useUrlState() {
  const route = useRoute()
  const router = useRouter()
  const atlasStore = useAtlasStore()
  const parameterStore = useParameterStore()
  const projectionStore = useProjectionStore()
  const viewStore = useViewStore()
  const geoDataStore = useGeoDataStore()

  function serializeState() {
    debug('Serializing state...')

    const state: Record<string, string> = {
      atlas: atlasStore.selectedAtlasId,
      view: viewStore.viewMode,
      projection: projectionStore.selectedProjection ?? 'mercator', // Fallback for URL only
      territory: viewStore.territoryMode,
    }

    if (projectionStore.customRotate) {
      const [longitude, latitude, gamma] = projectionStore.customRotate
      state.rlon = String(longitude)
      state.rlat = String(latitude)
      state.rgam = String(gamma)
    }
    if (projectionStore.customParallel1 !== null)
      state.p1 = String(projectionStore.customParallel1)
    if (projectionStore.customParallel2 !== null)
      state.p2 = String(projectionStore.customParallel2)

    if (viewStore.viewMode === 'built-in-composite' && projectionStore.compositeProjection) {
      state.composite = projectionStore.compositeProjection
    }

    const atlasService = atlasStore.atlasService
    const territories = atlasService.getAllTerritories()
    const defaults = TerritoryDefaultsService.initializeAll(
      territories,
      createProjectionId('mercator'),
    )

    const territorySettings: Record<string, number> = {}
    let hasSettings = false

    for (const territory of geoDataStore.allActiveTerritories) {
      const code = territory.code as TerritoryCode
      const params = parameterStore.getTerritoryParameters(code)
      const scale = params.scaleMultiplier ?? 1.0
      const defaultScale = defaults.scales[code] ?? 1
      if (scale !== defaultScale) {
        territorySettings[`s_${territory.code}`] = scale
        hasSettings = true
      }
    }

    for (const territory of geoDataStore.allActiveTerritories) {
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

  function deserializeState(params: Record<string, any>) {
    if (params.atlas)
      atlasStore.selectedAtlasId = params.atlas
    if (params.view)
      viewStore.setViewMode(params.view)
    if (params.projection)
      projectionStore.setSelectedProjection(params.projection)
    if (params.territory)
      viewStore.setTerritoryMode(params.territory)

    if (params.composite)
      projectionStore.setCompositeProjection(params.composite)
    if (params.t) {
      try {
        const settings = JSON.parse(params.t)
        for (const [key, value] of Object.entries(settings)) {
          if (key.startsWith('s_')) {
            const code = key.substring(2)
            parameterStore.setTerritoryParameter(code as TerritoryCode, 'scaleMultiplier', Number(value))
          }
          else if (key.startsWith('tx_')) {
            const code = key.substring(3)
            parameterStore.setTerritoryTranslation(code as TerritoryCode, 'x', Number(value))
          }
          else if (key.startsWith('ty_')) {
            const code = key.substring(3)
            parameterStore.setTerritoryTranslation(code as TerritoryCode, 'y', Number(value))
          }
        }
      }
      catch (error) {
        debug('Failed to parse territory settings from URL: %o', error)
      }
    }
  }

  // The initialization and the view mode watcher clear the global projection parameters, so they are read afterwards
  function deserializeProjectionParameters(params: Record<string, any>) {
    if (params.rlon !== undefined || params.rlat !== undefined || params.rgam !== undefined) {
      projectionStore.setCustomRotate({
        longitude: params.rlon !== undefined ? Number(params.rlon) : undefined,
        latitude: params.rlat !== undefined ? Number(params.rlat) : undefined,
        gamma: params.rgam !== undefined ? Number(params.rgam) : undefined,
      })
    }
    if (params.p1 !== undefined)
      projectionStore.setCustomParallel1(Number(params.p1))
    if (params.p2 !== undefined)
      projectionStore.setCustomParallel2(Number(params.p2))
  }

  async function updateUrl() {
    const state = serializeState()
    await router.replace({
      query: state,
    })
  }

  function restoreFromUrl() {
    if (route.query && Object.keys(route.query).length > 0) {
      deserializeState(route.query)
      return true
    }
    return false
  }

  function restoreProjectionParametersFromUrl() {
    deserializeProjectionParameters(route.query)
  }

  const shareableUrl = computed(() => {
    const state = serializeState()
    const url = new URL(window.location.origin + window.location.pathname)
    url.search = new URLSearchParams(state).toString()
    return url.toString()
  })

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

  function enableAutoSync() {
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
    restoreProjectionParametersFromUrl,
    shareableUrl,
    copyShareableUrl,
    enableAutoSync,
  }
}
