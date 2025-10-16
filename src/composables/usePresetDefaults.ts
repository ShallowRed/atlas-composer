import type { TerritoryDefaults } from '@/services/atlas/territory-defaults-service'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { ref } from 'vue'

/**
 * Deep comparison function for parameter values
 * Handles arrays, objects, primitives, null, and undefined
 */
function areValuesEqual(a: any, b: any): boolean {
  // Strict equality check (handles primitives, null, undefined)
  if (a === b)
    return true

  // Both must be arrays or both must be objects (but not null)
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length)
      return false
    return a.every((val, index) => areValuesEqual(val, b[index]))
  }

  // Handle objects (but not arrays or null)
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length)
      return false
    return keysA.every(key => areValuesEqual(a[key], b[key]))
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
   * Clear stored preset defaults (when switching atlases or when no preset)
   */
  function clearPresetDefaults() {
    presetDefaults.value = null
    presetParameters.value = {}
  }

  /**
   * Get preset defaults for a specific territory
   */
  function getPresetDefaultsForTerritory(territoryCode: string) {
    if (!presetDefaults.value) {
      return null
    }

    return {
      projection: presetDefaults.value.projections[territoryCode],
      translation: presetDefaults.value.translations[territoryCode],
      scale: presetDefaults.value.scales[territoryCode],
      parameters: presetParameters.value[territoryCode],
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
  ): boolean {
    if (!presetDefaults.value) {
      return false // No preset loaded, nothing to diverge from
    }

    console.log('[usePresetDefaults] Checking divergence with preset defaults:', {
      presetTranslations: presetDefaults.value.translations,
      presetScales: presetDefaults.value.scales,
      presetParameters: presetParameters.value,
    })

    // Check translations
    for (const [territoryCode, currentTranslation] of Object.entries(currentTranslations)) {
      const presetTranslation = presetDefaults.value.translations[territoryCode]
      if (presetTranslation) {
        if (
          currentTranslation.x !== presetTranslation.x
          || currentTranslation.y !== presetTranslation.y
        ) {
          console.log(`[usePresetDefaults] Translation divergence in ${territoryCode}:`, {
            current: currentTranslation,
            preset: presetTranslation,
          })
          return true
        }
      }
    }

    // Check scales
    for (const [territoryCode, currentScale] of Object.entries(currentScales)) {
      const presetScale = presetDefaults.value.scales[territoryCode]
      if (presetScale && currentScale !== presetScale) {
        console.log(`[usePresetDefaults] Scale divergence in ${territoryCode}:`, {
          current: currentScale,
          preset: presetScale,
        })
        return true
      }
    }

    // Check territory parameters - compare actual values with deep comparison for arrays
    for (const [territoryCode, currentParams] of Object.entries(territoryParameters)) {
      const presetParams = presetParameters.value[territoryCode]
      if (presetParams) {
        for (const [paramKey, currentValue] of Object.entries(currentParams)) {
          const presetValue = presetParams[paramKey as keyof ProjectionParameters]

          // Deep comparison for arrays and objects
          if (!areValuesEqual(currentValue, presetValue)) {
            console.log(`[usePresetDefaults] Parameter divergence in ${territoryCode}.${paramKey}:`, {
              current: currentValue,
              preset: presetValue,
            })
            return true
          }
        }
      }
      else {
        // Territory has parameters but no preset parameters - this is a divergence
        console.log(`[usePresetDefaults] Territory ${territoryCode} has overrides but no preset parameters`)
        return true
      }
    }

    console.log('[usePresetDefaults] No divergence detected')
    return false
  }

  return {
    presetDefaults,
    presetParameters,
    storePresetDefaults,
    clearPresetDefaults,
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
