import type { ProjectionParameterProvider } from '@/services/projection/composite-projection'
import type { TerritoryCode } from '@/types'
import { useParameterStore } from '@/stores/parameters'

/**
 * Composable for creating parameter provider adapters
 *
 * Provides a consistent parameter provider interface that connects
 * the parameter store to services that need projection parameters
 * (e.g., Cartographer, export services).
 *
 * @returns Parameter provider adapter
 *
 * @example
 * ```ts
 * const { parameterProvider } = useParameterProvider()
 *
 * // Use with Cartographer
 * const cartographer = new Cartographer({
 *   parameterProvider,
 *   // ... other options
 * })
 *
 * // Use with export
 * const exportedConfig = CompositeExportService.exportToJSON(
 *   compositeProjection,
 *   parameterProvider,
 *   atlasId
 * )
 * ```
 */
export function useParameterProvider() {
  const parameterStore = useParameterStore()

  /**
   * Parameter provider adapter
   * Implements ProjectionParameterProvider interface
   */
  const parameterProvider: ProjectionParameterProvider = {
    getEffectiveParameters: (territoryCode: TerritoryCode) => {
      return parameterStore.getEffectiveParameters(territoryCode)
    },

    getExportableParameters: (territoryCode: TerritoryCode) => {
      return parameterStore.getExportableParameters(territoryCode)
    },
  }

  return {
    parameterProvider,
  }
}
