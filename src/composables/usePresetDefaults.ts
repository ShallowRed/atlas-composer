import type { TerritoryDefaults } from '@/core/presets'
import type { TerritoryCode } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { ref, toRaw } from 'vue'

function areValuesEqual(a: any, b: any): boolean {
  const rawA = toRaw(a)
  const rawB = toRaw(b)

  if (rawA === rawB)
    return true

  if (Array.isArray(rawA) && Array.isArray(rawB)) {
    if (rawA.length !== rawB.length)
      return false
    return rawA.every((val, index) => areValuesEqual(val, rawB[index]))
  }

  if (rawA && rawB && typeof rawA === 'object' && typeof rawB === 'object' && !Array.isArray(rawA) && !Array.isArray(rawB)) {
    const keysA = Object.keys(rawA)
    const keysB = Object.keys(rawB)
    if (keysA.length !== keysB.length)
      return false
    return keysA.every(key => areValuesEqual(rawA[key], rawB[key]))
  }

  return false
}

export function usePresetDefaults() {
  const presetDefaults = ref<TerritoryDefaults | null>(null)
  const presetParameters = ref<Record<string, ProjectionParameters>>({})
  const presetGlobalParameters = ref<ProjectionParameters | null>(null)

  function storePresetDefaults(
    defaults: TerritoryDefaults,
    parameters: Record<string, ProjectionParameters>,
  ) {
    presetDefaults.value = {
      projections: { ...defaults.projections },
      translations: { ...defaults.translations },
      scales: { ...defaults.scales },
    }
    presetParameters.value = { ...parameters }
  }

  function storeGlobalParameters(parameters: ProjectionParameters | null) {
    presetGlobalParameters.value = parameters ? { ...parameters } : null
  }

  function clearPresetDefaults() {
    presetDefaults.value = null
    presetParameters.value = {}
    presetGlobalParameters.value = null
  }

  function clearAll() {
    clearPresetDefaults()
  }

  function getPresetDefaultsForTerritory(territoryCode: string) {
    if (!presetDefaults.value) {
      return null
    }

    const code = territoryCode as TerritoryCode
    return {
      projection: presetDefaults.value.projections[code],
      translation: presetDefaults.value.translations[code],
      scale: presetDefaults.value.scales[code],
      parameters: presetParameters.value[code],
    }
  }

  function hasPresetDefaults() {
    return presetDefaults.value !== null
  }

  function hasDivergingParameters(
    currentTranslations: Record<string, { x: number, y: number }>,
    currentScales: Record<string, number>,
    territoryParameters: Record<string, Record<string, unknown>>,
    currentProjections?: Record<string, string>,
  ): boolean {
    if (!presetDefaults.value) {
      return false
    }

    if (currentProjections) {
      for (const [territoryCode, currentProjection] of Object.entries(currentProjections)) {
        const presetProjection = presetDefaults.value.projections[territoryCode as TerritoryCode]
        if (presetProjection && currentProjection !== presetProjection) {
          return true
        }
      }
    }

    for (const [territoryCode, currentTranslation] of Object.entries(currentTranslations)) {
      const presetTranslation = presetDefaults.value.translations[territoryCode as TerritoryCode]
      if (presetTranslation) {
        if (
          currentTranslation.x !== presetTranslation.x
          || currentTranslation.y !== presetTranslation.y
        ) {
          return true
        }
      }
    }

    for (const [territoryCode, currentScale] of Object.entries(currentScales)) {
      const presetScale = presetDefaults.value.scales[territoryCode as TerritoryCode]
      if (presetScale && currentScale !== presetScale) {
        return true
      }
    }

    for (const [territoryCode, currentParams] of Object.entries(territoryParameters)) {
      const presetParams = presetParameters.value[territoryCode as TerritoryCode]
      if (presetParams) {
        const allParamKeys = new Set([
          ...Object.keys(currentParams),
          ...Object.keys(presetParams),
        ])

        for (const paramKey of allParamKeys) {
          const currentValue = currentParams[paramKey]
          const presetValue = presetParams[paramKey as keyof ProjectionParameters]

          // Deep comparison for arrays and objects
          if (!areValuesEqual(currentValue, presetValue)) {
            return true
          }
        }
      }
      else {
        // Territory has parameters but no preset parameters - this is a divergence
        return true
      }
    }

    return false
  }

  return {
    presetDefaults,
    presetParameters,
    presetGlobalParameters,
    storePresetDefaults,
    storeGlobalParameters,
    clearPresetDefaults,
    clearAll,
    getPresetDefaultsForTerritory,
    hasPresetDefaults,
    hasDivergingParameters,
  }
}

let globalPresetDefaults: ReturnType<typeof usePresetDefaults> | null = null

export function getSharedPresetDefaults() {
  if (!globalPresetDefaults) {
    globalPresetDefaults = usePresetDefaults()
  }
  return globalPresetDefaults
}
