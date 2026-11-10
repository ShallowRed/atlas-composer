import type { TerritoryCode } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { areParametersEqual, parameterRegistry } from '@/core/parameters'
import { referenceParameters, RESET_KEYS } from '@/core/territories/territory-reset-service'

export const usePresetDefaultsStore = defineStore('presetDefaults', () => {
  const presetParameters = ref<Record<string, ProjectionParameters>>({})
  const presetGlobalParameters = ref<ProjectionParameters | null>(null)

  function storePresetDefaults(parameters: Record<string, ProjectionParameters>) {
    presetParameters.value = { ...parameters }
  }

  function storeGlobalParameters(parameters: ProjectionParameters | null) {
    presetGlobalParameters.value = parameters ? { ...parameters } : null
  }

  function clearAll() {
    presetParameters.value = {}
    presetGlobalParameters.value = null
  }

  function territoryDiffersFromPreset(territoryCode: TerritoryCode, territoryParameters: ProjectionParameters): boolean {
    const reference = referenceParameters(presetParameters.value[territoryCode])
    const current: ProjectionParameters = { ...territoryParameters }
    for (const key of RESET_KEYS) {
      if (current[key] === undefined) {
        Object.assign(current, { [key]: parameterRegistry.getDefaultValue(key) })
      }
    }
    return !areParametersEqual(current, reference)
  }

  function territoriesDifferFromPreset(
    parametersByCode: Record<string, ProjectionParameters>,
    activeCodes: ReadonlySet<TerritoryCode>,
    compareActiveSet: boolean,
  ): boolean {
    const presetCodes = Object.keys(presetParameters.value) as TerritoryCode[]
    if (compareActiveSet && presetCodes.length > 0
      && (presetCodes.length !== activeCodes.size || presetCodes.some(code => !activeCodes.has(code)))) {
      return true
    }
    return Object.entries(parametersByCode)
      .some(([code, parameters]) => territoryDiffersFromPreset(code as TerritoryCode, parameters))
  }

  function globalDiffersFromPreset(effectiveGlobalParameters: ProjectionParameters): boolean {
    return !areParametersEqual(effectiveGlobalParameters, presetGlobalParameters.value ?? {})
  }

  return {
    presetParameters,
    presetGlobalParameters,
    storePresetDefaults,
    storeGlobalParameters,
    clearAll,
    territoryDiffersFromPreset,
    territoriesDifferFromPreset,
    globalDiffersFromPreset,
  }
})
