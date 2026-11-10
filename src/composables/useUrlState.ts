import type { TerritoryCode } from '@/types'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { parameterRegistry } from '@/core/parameters'
import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { parseSharedLink } from '@/core/view'
import { useAtlasStore } from '@/stores/atlas'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'
import { logger } from '@/utils/logger'

const debug = logger.vue.composable

export function useUrlState() {
  const route = useRoute()
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
      projection: projectionStore.selectedProjection ?? FALLBACK_PROJECTION_ID, // Fallback for URL only
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

    const defaultScale = parameterRegistry.getDefaultValue('scaleMultiplier')
    const [defaultX, defaultY] = parameterRegistry.getDefaultValue('translateOffset')

    // The preset of the composite-custom view gives values that differ from the default values of the registry
    const writesEveryTerritory = viewStore.viewMode === 'composite-custom'

    const territorySettings: Record<string, number> = {}
    let hasSettings = false

    for (const territory of geoDataStore.allActiveTerritories) {
      const code = territory.code as TerritoryCode
      const params = parameterStore.getTerritoryParameters(code)
      const scale = params.scaleMultiplier ?? 1.0
      if (writesEveryTerritory || scale !== defaultScale) {
        territorySettings[`s_${territory.code}`] = scale
        hasSettings = true
      }
    }

    for (const territory of geoDataStore.allActiveTerritories) {
      const code = territory.code as TerritoryCode
      const translation = parameterStore.getTerritoryTranslation(code)
      if (writesEveryTerritory || translation.x !== defaultX || translation.y !== defaultY) {
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

  function readSharedLink() {
    return parseSharedLink(route.query)
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

  return {
    serializeState,
    readSharedLink,
    copyShareableUrl,
  }
}
