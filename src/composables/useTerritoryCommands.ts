import type { ProjectionId, TerritoryCode } from '@/types/branded'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'

export function useTerritoryCommands() {
  const parameterStore = useParameterStore()
  const viewStore = useViewStore()

  function changeTerritoryProjection(territoryCode: TerritoryCode, projectionId: ProjectionId) {
    parameterStore.changeTerritoryProjection(territoryCode, projectionId, viewStore.positioningView)
  }

  return {
    changeTerritoryProjection,
  }
}
