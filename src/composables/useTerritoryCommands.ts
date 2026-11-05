import type { ProjectionId, TerritoryCode } from '@/types/branded'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'

export function useTerritoryCommands() {
  const parameterStore = useParameterStore()
  const viewStore = useViewStore()

  function setTerritoryTranslation(territoryCode: TerritoryCode, axis: 'x' | 'y', value: number) {
    parameterStore.setTerritoryTranslation(territoryCode, axis, value)
  }

  function setTerritoryScale(territoryCode: TerritoryCode, value: number) {
    parameterStore.setTerritoryParameter(territoryCode, 'scaleMultiplier', value)
  }

  function changeTerritoryProjection(territoryCode: TerritoryCode, projectionId: ProjectionId) {
    parameterStore.changeTerritoryProjection(territoryCode, projectionId, viewStore.positioningView)
  }

  return {
    setTerritoryTranslation,
    setTerritoryScale,
    changeTerritoryProjection,
  }
}
