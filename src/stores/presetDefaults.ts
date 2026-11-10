import type { TerritoryDefaults } from '@/core/presets'
import type { TerritoryCode } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { areParametersEqual, parameterRegistry } from '@/core/parameters'
import { referenceParameters, RESET_KEYS, TerritoryResetService } from '@/core/territories/territory-reset-service'

export const usePresetDefaultsStore = defineStore('presetDefaults', () => {
  const territoryDefaults = ref<TerritoryDefaults | null>(null)
  const presetParameters = ref<Record<string, ProjectionParameters>>({})
  const presetGlobalParameters = ref<ProjectionParameters | null>(null)

  function storePresetDefaults(
    defaults: TerritoryDefaults,
    parameters: Record<string, ProjectionParameters>,
  ) {
    territoryDefaults.value = {
      projections: { ...defaults.projections },
      translations: { ...defaults.translations },
      scales: { ...defaults.scales },
    }
    presetParameters.value = { ...parameters }
  }

  function storeGlobalParameters(parameters: ProjectionParameters | null) {
    presetGlobalParameters.value = parameters ? { ...parameters } : null
  }

  function clearAll() {
    territoryDefaults.value = null
    presetParameters.value = {}
    presetGlobalParameters.value = null
  }

  function territoryDiffersFromPreset(territoryCode: TerritoryCode, territoryParameters: ProjectionParameters): boolean {
    const reference = referenceParameters(TerritoryResetService.calculateTerritoryReset({
      territoryCode,
      presetDefaults: territoryDefaults.value ?? undefined,
      presetParameters: presetParameters.value,
    }))
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
    if (compareActiveSet && territoryDefaults.value) {
      const presetCodes = Object.keys(territoryDefaults.value.projections) as TerritoryCode[]
      if (presetCodes.length !== activeCodes.size || presetCodes.some(code => !activeCodes.has(code))) {
        return true
      }
    }
    return Object.entries(parametersByCode)
      .some(([code, parameters]) => territoryDiffersFromPreset(code as TerritoryCode, parameters))
  }

  function globalDiffersFromPreset(effectiveGlobalParameters: ProjectionParameters): boolean {
    return !areParametersEqual(effectiveGlobalParameters, presetGlobalParameters.value ?? {})
  }

  return {
    territoryDefaults,
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
