/**
 * Parameter Store
 *
 * Dedicated Pinia store for projection parameter management
 * Integrates with ProjectionParameterManager for unified parameter handling
 */

import type { ProjectionFamilyType } from '@/core/projections/types'
import type {
  AtlasProjectionParameters,
  BaseProjectionParameters,
  ParameterChangeEvent,
  ParameterInheritance,
  ParameterSource,
  ParameterUpdate,
  ParameterValidationResult,
} from '@/types/projection-parameters'

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { ProjectionParameterManager } from '@/services/parameters/projection-parameter-manager'
import { UnifiedParameterConstraints } from '@/services/parameters/unified-parameter-constraints'

export const useParameterStore = defineStore('parameters', () => {
  // Internal parameter manager instance
  const parameterManager = new ProjectionParameterManager({
    enableValidation: true,
    enableEvents: true,
  })

  // Reactive state
  const isInitialized = ref(false)
  const lastChangeEvent = ref<ParameterChangeEvent | null>(null)
  const validationErrors = ref<Map<string, ParameterValidationResult[]>>(new Map())

  // Current parameter sources for reactive updates
  const globalParametersVersion = ref(0)
  const territoryParametersVersion = ref(0)

  /**
   * Initialize the parameter store with atlas parameters
   */
  function initialize(atlasParams?: AtlasProjectionParameters) {
    if (atlasParams) {
      parameterManager.setAtlasParameters(atlasParams)
    }

    // Set up parameter change listener
    parameterManager.addChangeListener(handleParameterChange)

    isInitialized.value = true
  }

  /**
   * Reset the parameter store
   */
  function reset() {
    parameterManager.reset()
    validationErrors.value.clear()
    globalParametersVersion.value = 0
    territoryParametersVersion.value = 0
    lastChangeEvent.value = null
    isInitialized.value = false
  }

  // Global parameter management
  const globalParameters = computed(() => {
    // Access version to trigger reactivity
    void globalParametersVersion.value
    return parameterManager.getGlobalParameters()
  })

  function setGlobalParameter(key: keyof BaseProjectionParameters, value: any) {
    parameterManager.setGlobalParameter(key, value)
    globalParametersVersion.value++
  }

  function setGlobalParameters(parameters: ParameterUpdate) {
    parameterManager.setGlobalParameters(parameters)
    globalParametersVersion.value++
  }

  // Territory parameter management
  function getTerritoryParameters(territoryCode: string): BaseProjectionParameters {
    // Access version to trigger reactivity
    void territoryParametersVersion.value
    return parameterManager.getTerritoryParameters(territoryCode)
  }

  function setTerritoryParameter(territoryCode: string, key: keyof BaseProjectionParameters, value: any) {
    parameterManager.setTerritoryParameter(territoryCode, key, value)
    territoryParametersVersion.value++
  }

  function setTerritoryParameters(territoryCode: string, parameters: ParameterUpdate) {
    parameterManager.setTerritoryParameters(territoryCode, parameters)
    territoryParametersVersion.value++
  }

  // Effective parameters (with inheritance)
  function getEffectiveParameters(territoryCode?: string): BaseProjectionParameters {
    // Access versions to trigger reactivity
    void globalParametersVersion.value
    void territoryParametersVersion.value
    return parameterManager.getEffectiveParameters(territoryCode)
  }

  // Parameter inheritance information
  function getParameterInheritance(territoryCode: string, key: keyof BaseProjectionParameters): ParameterInheritance {
    // Access versions to trigger reactivity
    void globalParametersVersion.value
    void territoryParametersVersion.value
    return parameterManager.getParameterInheritance(territoryCode, key)
  }

  function getParameterSource(territoryCode: string, key: keyof BaseProjectionParameters): ParameterSource {
    return parameterManager.getParameterSource(territoryCode, key)
  }

  // Parameter override management
  function clearTerritoryOverride(territoryCode: string, key: keyof BaseProjectionParameters) {
    parameterManager.clearTerritoryOverride(territoryCode, key)
    territoryParametersVersion.value++
  }

  function clearAllTerritoryOverrides(territoryCode: string) {
    parameterManager.clearAllTerritoryOverrides(territoryCode)
    territoryParametersVersion.value++
  }

  // Parameter validation
  function validateParameter(
    family: ProjectionFamilyType,
    key: keyof BaseProjectionParameters,
    value: any,
  ): ParameterValidationResult {
    return UnifiedParameterConstraints.validateParameter(family, key, value)
  }

  function validateParameters(family: ProjectionFamilyType, parameters: BaseProjectionParameters): ParameterValidationResult[] {
    return UnifiedParameterConstraints.validateParameterSet(family, parameters)
  }

  function validateTerritoryParameters(territoryCode: string, family: ProjectionFamilyType) {
    const parameters = getEffectiveParameters(territoryCode)
    const results = validateParameters(family, parameters)

    if (results.length > 0) {
      validationErrors.value.set(territoryCode, results)
    }
    else {
      validationErrors.value.delete(territoryCode)
    }

    return results
  }

  // Parameter constraints
  function getParameterConstraints(family: ProjectionFamilyType) {
    return UnifiedParameterConstraints.getParameterConstraints(family)
  }

  function isParameterRelevant(family: ProjectionFamilyType, key: keyof BaseProjectionParameters): boolean {
    return UnifiedParameterConstraints.isParameterRelevant(family, key)
  }

  // Computed properties for common use cases
  const hasGlobalParameters = computed(() => {
    const params = globalParameters.value
    return Object.keys(params).length > 0
  })

  const hasValidationErrors = computed(() => {
    return validationErrors.value.size > 0
  })

  const allValidationErrors = computed(() => {
    const allErrors: ParameterValidationResult[] = []
    validationErrors.value.forEach((errors) => {
      allErrors.push(...errors)
    })
    return allErrors
  })

  // Territory-specific computed properties
  function createTerritoryParametersComputed(territoryCode: string) {
    return computed(() => getTerritoryParameters(territoryCode))
  }

  function createEffectiveParametersComputed(territoryCode?: string) {
    return computed(() => getEffectiveParameters(territoryCode))
  }

  function createParameterInheritanceComputed(territoryCode: string, key: keyof BaseProjectionParameters) {
    return computed(() => getParameterInheritance(territoryCode, key))
  }

  // Export functionality
  function exportParameters(territoryCode?: string) {
    return parameterManager.exportParameters(territoryCode)
  }

  // Internal event handler
  function handleParameterChange(event: ParameterChangeEvent) {
    lastChangeEvent.value = event

    // Clear validation errors for changed parameter
    if (event.territoryCode) {
      const errors = validationErrors.value.get(event.territoryCode)
      if (errors) {
        const filteredErrors = errors.filter(error =>
          !error.error?.includes(event.key),
        )
        if (filteredErrors.length === 0) {
          validationErrors.value.delete(event.territoryCode)
        }
        else {
          validationErrors.value.set(event.territoryCode, filteredErrors)
        }
      }
    }
  }

  // Watch for parameter changes to trigger validation
  watch(
    () => lastChangeEvent.value,
    (event) => {
      if (!event)
        return

      // Auto-validate changed parameters
      if (event.territoryCode) {
        // We need the projection family to validate, but we don't have it here
        // This would need to be provided by the component using the store
        // For now, we'll skip auto-validation and let components trigger it
      }
    },
    { deep: true },
  )

  return {
    // State
    isInitialized,
    lastChangeEvent,
    validationErrors,
    territoryParametersVersion, // Reactive version for watching parameter changes

    // Computed
    globalParameters,
    hasGlobalParameters,
    hasValidationErrors,
    allValidationErrors,

    // Actions
    initialize,
    reset,

    // Global parameters
    setGlobalParameter,
    setGlobalParameters,

    // Territory parameters
    getTerritoryParameters,
    setTerritoryParameter,
    setTerritoryParameters,

    // Effective parameters
    getEffectiveParameters,
    getParameterInheritance,
    getParameterSource,

    // Parameter overrides
    clearTerritoryOverride,
    clearAllTerritoryOverrides,

    // Validation
    validateParameter,
    validateParameters,
    validateTerritoryParameters,

    // Constraints
    getParameterConstraints,
    isParameterRelevant,

    // Factory functions for reactive computed properties
    createTerritoryParametersComputed,
    createEffectiveParametersComputed,
    createParameterInheritanceComputed,

    // Export
    exportParameters,
  }
})
