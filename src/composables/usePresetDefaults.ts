import type { TerritoryDefaults } from '@/core/presets'
import type { TerritoryCode } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { ref, toRaw } from 'vue'

/**
 * Deep comparison function for parameter values
 * Handles arrays, objects, primitives, null, and undefined
 * Also handles Vue Proxy objects by unwrapping them
 */
function areValuesEqual(a: any, b: any): boolean {
  // Unwrap Vue proxies to get raw values
  const rawA = toRaw(a)
  const rawB = toRaw(b)

  // Strict equality check (handles primitives, null, undefined)
  if (rawA === rawB)
    return true

  // Both must be arrays or both must be objects (but not null)
  if (Array.isArray(rawA) && Array.isArray(rawB)) {
    if (rawA.length !== rawB.length)
      return false
    return rawA.every((val, index) => areValuesEqual(val, rawB[index]))
  }

  // Handle objects (but not arrays or null)
  if (rawA && rawB && typeof rawA === 'object' && typeof rawB === 'object' && !Array.isArray(rawA) && !Array.isArray(rawB)) {
    const keysA = Object.keys(rawA)
    const keysB = Object.keys(rawB)
    if (keysA.length !== keysB.length)
      return false
    return keysA.every(key => areValuesEqual(rawA[key], rawB[key]))
  }

  // Different types or one is null/undefined
  return false
}

/**
 * Composable for managing original preset defaults for reset functionality
 */
export function usePresetDefaults() {
  // Store the original preset configuration for reset functionality
  const presetDefaults = ref<TerritoryDefaults | null>(null)
  const presetParameters = ref<Record<string, ProjectionParameters>>({})
  const presetGlobalParameters = ref<ProjectionParameters | null>(null)

  /**
   * Store the original preset defaults when a preset is loaded
   */
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

  /**
   * Store global projection parameters from view preset
   */
  function storeGlobalParameters(parameters: ProjectionParameters | null) {
    presetGlobalParameters.value = parameters ? { ...parameters } : null
  }

  /**
   * Clear stored preset defaults (when switching atlases or when no preset)
   */
  function clearPresetDefaults() {
    presetDefaults.value = null
    presetParameters.value = {}
    presetGlobalParameters.value = null
  }

  /**
   * Alias for clearPresetDefaults
   * Phase 4: Used by InitializationService for consistency
   */
  function clearAll() {
    clearPresetDefaults()
  }

  /**
   * Get preset defaults for a specific territory
   */
  function getPresetDefaultsForTerritory(territoryCode: string) {
    if (!presetDefaults.value) {
      return null
    }

    // Convert: function receives string but Records are keyed by TerritoryCode
    const code = territoryCode as TerritoryCode
    return {
      projection: presetDefaults.value.projections[code],
      translation: presetDefaults.value.translations[code],
      scale: presetDefaults.value.scales[code],
      parameters: presetParameters.value[code],
    }
  }

  /**
   * Check if preset defaults are available
   */
  function hasPresetDefaults() {
    return presetDefaults.value !== null
  }

  /**
   * Check if current values differ from preset defaults
   */
  function hasDivergingParameters(
    currentTranslations: Record<string, { x: number, y: number }>,
    currentScales: Record<string, number>,
    territoryParameters: Record<string, Record<string, unknown>>,
    currentProjections?: Record<string, string>,
  ): boolean {
    if (!presetDefaults.value) {
      return false // No preset loaded, nothing to diverge from
    }

    // Check projections
    if (currentProjections) {
      // Convert: Object.entries returns [string, ...] but Record uses TerritoryCode keys
      for (const [territoryCode, currentProjection] of Object.entries(currentProjections)) {
        const presetProjection = presetDefaults.value.projections[territoryCode as TerritoryCode]
        if (presetProjection && currentProjection !== presetProjection) {
          return true
        }
      }
    }

    // Check translations
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

    // Check scales
    for (const [territoryCode, currentScale] of Object.entries(currentScales)) {
      const presetScale = presetDefaults.value.scales[territoryCode as TerritoryCode]
      if (presetScale && currentScale !== presetScale) {
        return true
      }
    }

    // Check territory parameters - compare actual values with deep comparison for arrays
    for (const [territoryCode, currentParams] of Object.entries(territoryParameters)) {
      const presetParams = presetParameters.value[territoryCode as TerritoryCode]
      if (presetParams) {
        // Get union of all parameter keys from both current and preset
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

// Global instance for sharing across components
let globalPresetDefaults: ReturnType<typeof usePresetDefaults> | null = null

/**
 * Get shared preset defaults instance
 */
export function getSharedPresetDefaults() {
  if (!globalPresetDefaults) {
    globalPresetDefaults = usePresetDefaults()
  }
  return globalPresetDefaults
}
