import type { ProjectionId, TerritoryCode } from '@/types/branded'
import { useParameterStore } from '@/stores/parameters'

/**
 * Territory Commands Composable
 *
 * Single responsibility: Provide write operations for territory parameters.
 * Thin wrapper around parameterStore for territory mutations.
 *
 * Returns:
 * - setTerritoryTranslation: Update territory translation
 * - setTerritoryScale: Update territory scale multiplier
 * - setTerritoryProjection: Update territory projection
 */
export function useTerritoryCommands() {
  const parameterStore = useParameterStore()

  function setTerritoryTranslation(territoryCode: TerritoryCode, axis: 'x' | 'y', value: number) {
    parameterStore.setTerritoryTranslation(territoryCode, axis, value)
  }

  function setTerritoryScale(territoryCode: TerritoryCode, value: number) {
    parameterStore.setTerritoryParameter(territoryCode, 'scaleMultiplier', value)
  }

  function setTerritoryProjection(territoryCode: TerritoryCode, projectionId: ProjectionId) {
    parameterStore.setTerritoryProjection(territoryCode, projectionId)
  }

  return {
    setTerritoryTranslation,
    setTerritoryScale,
    setTerritoryProjection,
  }
}
