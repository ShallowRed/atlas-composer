import type { ProjectionFamilyType } from '@/core/projections/types'
import type { BaseProjectionParameters } from '@/types/projection-parameters'

import { computed } from 'vue'
import { useParameterStore } from '@/stores/parameters'

/**
 * Composable for territory-specific parameter management
 *
 * Provides reactive access to territory parameter state and operations
 * for use in territory control components.
 */
export function useTerritoryParameters(territoryCode: string) {
  // Get parameter store
  const parameterStore = useParameterStore()

  // Territory parameter state
  const territoryParameters = computed(() => {
    return parameterStore.getTerritoryParameters(territoryCode)
  })

  const effectiveParameters = computed(() => {
    return parameterStore.getEffectiveParameters(territoryCode)
  })

  const hasOverrides = computed(() => {
    return Object.keys(territoryParameters.value).length > 0
  })

  // Parameter operations
  function setParameter(key: keyof BaseProjectionParameters, value: unknown) {
    parameterStore.setTerritoryParameter(territoryCode, key, value)
  }

  function clearOverride(key: keyof BaseProjectionParameters) {
    parameterStore.clearTerritoryOverride(territoryCode, key)
  }

  function clearAllOverrides() {
    parameterStore.clearAllTerritoryOverrides(territoryCode)
  }

  // Parameter inheritance
  function getParameterInheritance(key: keyof BaseProjectionParameters) {
    return parameterStore.getParameterInheritance(territoryCode, key)
  }

  function getParameterSource(key: keyof BaseProjectionParameters) {
    return parameterStore.getParameterSource(territoryCode, key)
  }

  // Validation
  function validateParameter(
    projectionFamily: ProjectionFamilyType,
    key: keyof BaseProjectionParameters,
    value: unknown,
  ) {
    return parameterStore.validateParameter(projectionFamily, key, value)
  }

  function validateTerritoryParameters(projectionFamily: ProjectionFamilyType) {
    return parameterStore.validateTerritoryParameters(territoryCode, projectionFamily)
  }

  function getParameterConstraints(projectionFamily: ProjectionFamilyType) {
    return parameterStore.getParameterConstraints(projectionFamily)
  }

  return {
    // State
    territoryParameters,
    effectiveParameters,
    hasOverrides,

    // Operations
    setParameter,
    clearOverride,
    clearAllOverrides,

    // Inheritance
    getParameterInheritance,
    getParameterSource,

    // Validation
    validateParameter,
    validateTerritoryParameters,
    getParameterConstraints,
  }
}
