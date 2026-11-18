import type { ProjectionFamilyType } from '@/core/projections/types'
import type { TerritoryCode } from '@/types/branded'
import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionFamily } from '@/core/projections/types'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

export function useProjectionConfig() {
  const parameterStore = useParameterStore()
  const projectionStore = useProjectionStore()
  const viewStore = useViewStore()

  function getTerritoryProjection(territoryCode: string) {
    if (viewStore.viewMode === 'split' || viewStore.viewMode === 'composite-custom') {
      return parameterStore.getTerritoryProjection(territoryCode as TerritoryCode) || projectionStore.selectedProjection
    }
    return projectionStore.selectedProjection
  }

  // The family of the projection of a territory gives the domains of its parameters
  function getTerritoryFamily(territoryCode: string): ProjectionFamilyType {
    return projectionRegistry.get(getTerritoryProjection(territoryCode) || FALLBACK_PROJECTION_ID)?.family ?? ProjectionFamily.AZIMUTHAL
  }

  return {
    getTerritoryProjection,
    getTerritoryFamily,
  }
}
