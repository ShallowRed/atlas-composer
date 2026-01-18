import type { ProjectionParameterProvider } from '@/services/projection/composite-projection'
import type { TerritoryCode } from '@/types'
import { useParameterStore } from '@/stores/parameters'

export function useParameterProvider() {
  const parameterStore = useParameterStore()

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
