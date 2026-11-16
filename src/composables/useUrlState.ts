import type { SharedLinkTerritory } from '@/core/view'
import type { TerritoryCode } from '@/types'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { parameterRegistry } from '@/core/parameters'
import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { parseSharedLink, serializeSharedLink } from '@/core/view'
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

    const defaultScale = parameterRegistry.getDefaultValue('scaleMultiplier')
    const [defaultX, defaultY] = parameterRegistry.getDefaultValue('translateOffset')
    // The preset of the composite-custom view gives values that differ from the default values of the registry
    const writesEveryTerritory = viewStore.viewMode === 'composite-custom'

    const territories = new Map<string, SharedLinkTerritory>()
    for (const territory of geoDataStore.allActiveTerritories) {
      const code = territory.code as TerritoryCode
      const scale = parameterStore.getTerritoryParameters(code).scaleMultiplier ?? defaultScale
      const { x, y } = parameterStore.getTerritoryTranslation(code)
      territories.set(code, {
        scale: writesEveryTerritory || scale !== defaultScale ? scale : undefined,
        translation: writesEveryTerritory || x !== defaultX || y !== defaultY ? [x, y] : undefined,
      })
    }

    const { customParallel1, customParallel2 } = projectionStore
    return serializeSharedLink({
      atlas: atlasStore.selectedAtlasId,
      view: viewStore.viewMode,
      projection: projectionStore.selectedProjection ?? FALLBACK_PROJECTION_ID,
      territoryMode: viewStore.territoryMode,
      rotate: projectionStore.customRotate ?? undefined,
      parallels: customParallel1 !== null && customParallel2 !== null ? [customParallel1, customParallel2] : undefined,
      territories,
    })
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
