import type { TerritoryCode } from '@/types/branded'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

/**
 * Provides view-mode-aware projection resolution for territories.
 * Handles the logic of when to use per-territory projections vs uniform projection.
 */
export function useProjectionConfig() {
  const parameterStore = useParameterStore()
  const projectionStore = useProjectionStore()
  const viewStore = useViewStore()

  function getTerritoryProjection(territoryCode: string) {
    // In split or composite-custom mode, use per-territory projections
    if (viewStore.viewMode === 'split' || viewStore.viewMode === 'composite-custom') {
      // Convert: territoryCode parameter is string from various sources
      return parameterStore.getTerritoryProjection(territoryCode as TerritoryCode) || projectionStore.selectedProjection
    }
    // Use uniform projection for unified and built-in-composite modes
    return projectionStore.selectedProjection
  }

  return {
    getTerritoryProjection,
  }
}
