import type { TerritoryCode } from '@/types/branded'
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

  return {
    getTerritoryProjection,
  }
}
