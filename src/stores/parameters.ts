import type { ValidationResult } from '@/core/parameters/parameter-registry'
import type { PositioningView, PositionParameter } from '@/core/positioning'
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { Translation } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type {
  ParameterUpdate,
  ParameterValidationResult,
  ProjectionParameters,
} from '@/types/projection-parameters'

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { parameterRegistry } from '@/core/parameters'
import { convertPositioning } from '@/core/positioning'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionParameterManager } from '@/services/parameters/projection-parameter-manager'
import { logger } from '@/utils/logger'

const debug = logger.store.parameters

interface AxisRange {
  min: number
  max: number
  step?: number
}

type TupleRanges<K extends PositionParameter> = K extends 'rotate'
  ? [AxisRange, AxisRange, AxisRange]
  : [AxisRange, AxisRange]

export const useParameterStore = defineStore('parameters', () => {
  const parameterManager = new ProjectionParameterManager()

  const validationErrors = ref<Map<string, ParameterValidationResult[]>>(new Map())

  const globalParametersVersion = ref(0)
  const territoryParametersVersion = ref(0)

  function reset() {
    parameterManager.reset()
    validationErrors.value.clear()
    globalParametersVersion.value = 0
    territoryParametersVersion.value = 0
  }

  const globalParameters = computed(() => {
    void globalParametersVersion.value
    return parameterManager.getGlobalParameters()
  })

  function setGlobalParameter(key: keyof ProjectionParameters, value: any) {
    parameterManager.setGlobalParameter(key, value)
    globalParametersVersion.value++
  }

  function setGlobalParameters(parameters: ParameterUpdate) {
    parameterManager.setGlobalParameters(parameters)
    globalParametersVersion.value++
  }

  function setAtlasParameters(parameters: ProjectionParameters) {
    parameterManager.setAtlasParameters(parameters)
    globalParametersVersion.value++
  }

  function getTerritoryParameters(territoryCode: TerritoryCode): ProjectionParameters {
    void territoryParametersVersion.value
    const params = parameterManager.getTerritoryParameters(territoryCode)

    return params
  }

  function setTerritoryParameter(territoryCode: TerritoryCode, key: keyof ProjectionParameters, value: any) {
    if (value === null || value === undefined) {
      throw new Error(`[ParameterStore] Invalid null/undefined value for ${key} on territory ${territoryCode}. InitializationService should validate before calling.`)
    }

    try {
      parameterManager.setTerritoryParameter(territoryCode, key, value)
      territoryParametersVersion.value++
    }
    catch (err) {
      debug('Error setting parameter %s for territory %s: %O', key, territoryCode, err)
      throw err // Re-throw to surface bugs immediately
    }
  }

  function setTerritoryParameters(territoryCode: TerritoryCode, parameters: ParameterUpdate) {
    parameterManager.setTerritoryParameters(territoryCode, parameters)
    territoryParametersVersion.value++
  }

  function setTerritoryProjection(territoryCode: TerritoryCode, projectionId: ProjectionId) {
    setTerritoryParameter(territoryCode, 'projectionId', projectionId)
  }

  function changeTerritoryProjection(territoryCode: TerritoryCode, projectionId: ProjectionId, view: PositioningView) {
    const effective = getEffectiveParameters(territoryCode)
    const previousFamily = projectionRegistry.get(effective.projectionId ?? '')?.family
    const family = projectionRegistry.get(projectionId)?.family ?? 'MISCELLANEOUS'
    const hasPositioning = effective.center !== undefined || effective.rotate !== undefined

    if (view === 'composite' && hasPositioning && family !== previousFamily) {
      setTerritoryParameters(territoryCode, {
        projectionId,
        ...convertPositioning(effective, family),
      })
      return
    }
    setTerritoryProjection(territoryCode, projectionId)
  }

  function getTerritoryProjection(territoryCode: TerritoryCode): ProjectionId | undefined {
    const effective = getEffectiveParameters(territoryCode)
    return effective.projectionId as ProjectionId | undefined
  }

  function setTerritoryTranslation(territoryCode: TerritoryCode, axis: 'x' | 'y', value: number) {
    const effective = getEffectiveParameters(territoryCode)
    const currentOffset = effective.translateOffset ?? [0, 0]
    const newOffset: [number, number] = axis === 'x'
      ? [value, currentOffset[1]]
      : [currentOffset[0], value]
    setTerritoryParameter(territoryCode, 'translateOffset', newOffset)
  }

  function getTerritoryTranslation(territoryCode: TerritoryCode): Translation {
    const effective = getEffectiveParameters(territoryCode)
    const offset = effective.translateOffset ?? [0, 0]
    return { x: offset[0], y: offset[1] }
  }

  function getEffectiveParameters(territoryCode?: TerritoryCode): ProjectionParameters {
    void globalParametersVersion.value
    void territoryParametersVersion.value
    return parameterManager.getEffectiveParameters(territoryCode)
  }

  function clearAllTerritoryOverrides(territoryCode: TerritoryCode) {
    parameterManager.clearAllTerritoryOverrides(territoryCode)
    territoryParametersVersion.value++
  }

  function clearAll() {
    parameterManager.clearAll()

    Object.keys(globalParameters.value).forEach((key) => {
      delete globalParameters.value[key as keyof ProjectionParameters]
    })

    validationErrors.value.clear()

    globalParametersVersion.value++
    territoryParametersVersion.value++

    debug('All parameters cleared')
  }

  function validateParameter(family: ProjectionFamilyType, key: keyof ProjectionParameters, value: any): ParameterValidationResult {
    const result = parameterRegistry.validate(key as string, value, family)
    return {
      isValid: result.isValid,
      error: result.error,
      warning: result.warning,
    }
  }

  function validateParameterSet(family: ProjectionFamilyType, parameters: Partial<ProjectionParameters>): ParameterValidationResult[] {
    const results = parameterRegistry.validateParameters(parameters, family)
    return results.map(result => ({
      isValid: result.isValid,
      error: result.error,
      warning: result.warning,
    }))
  }

  function validateTerritoryParameters(territoryCode: TerritoryCode, family: ProjectionFamilyType) {
    const parameters = getEffectiveParameters(territoryCode)
    const results = validateParameterSet(family, parameters)

    if (results.length > 0) {
      validationErrors.value.set(territoryCode, results)
    }
    else {
      validationErrors.value.delete(territoryCode)
    }

    return results
  }

  function getParameterConstraints(family: ProjectionFamilyType) {
    const relevant = parameterRegistry.getRelevant(family)

    return {
      family,
      constraints: relevant.reduce((acc, def) => {
        const familyConstraints = parameterRegistry.getConstraintsForFamily(def.key as string, family)
        acc[def.key] = {
          parameter: def.key,
          relevant: familyConstraints.relevant,
          required: familyConstraints.required,
          min: familyConstraints.min,
          max: familyConstraints.max,
          step: familyConstraints.step,
          defaultValue: def.familyConstraints?.[family]?.defaultValue ?? def.defaultValue,
        }
        return acc
      }, {} as any),
    }
  }

  // Bounds of each axis, whether or not the parameter is relevant for the family
  function getTupleRanges<K extends PositionParameter>(family: ProjectionFamilyType, key: K): TupleRanges<K> | undefined {
    const { min, max, step } = parameterRegistry.getConstraintsForFamily(key, family)
    if (!Array.isArray(min) || !Array.isArray(max))
      return undefined
    return min.map((axisMin, axis) => ({ min: axisMin, max: max[axis] as number, step })) as TupleRanges<K>
  }

  const globalEffectiveParameters = computed(() => {
    void globalParametersVersion.value
    void territoryParametersVersion.value
    return parameterManager.getEffectiveParameters()
  })

  function initializeFromPreset(
    atlasParams: ProjectionParameters,
    territoryParams: Record<string, ProjectionParameters>,
  ): ValidationResult[] {
    const errors: ValidationResult[] = []

    if (atlasParams) {
      parameterManager.setAtlasParameters(atlasParams)
    }

    for (const [code, params] of Object.entries(territoryParams)) {
      setTerritoryParameters(code as TerritoryCode, params)
    }

    return errors
  }

  function getExportableParameters(territoryCode: string): ProjectionParameters {
    const params = getEffectiveParameters(territoryCode as TerritoryCode)
    const exportable = parameterRegistry.getExportable()

    const result: ProjectionParameters = {}
    for (const def of exportable) {
      if (def.key in params) {
        result[def.key] = params[def.key]
      }
    }

    return result
  }

  return {
    validationErrors,
    territoryParametersVersion, // Reactive version for watching parameter changes

    globalParameters,
    globalEffectiveParameters,

    reset,

    setGlobalParameter,
    setGlobalParameters,

    setAtlasParameters,

    getTerritoryParameters,
    setTerritoryParameter,
    setTerritoryParameters,

    setTerritoryProjection,
    changeTerritoryProjection,
    getTerritoryProjection,
    setTerritoryTranslation,
    getTerritoryTranslation,

    getEffectiveParameters,

    clearAllTerritoryOverrides,
    clearAll,

    validateParameter,
    validateTerritoryParameters,

    getParameterConstraints,
    getTupleRanges,

    initializeFromPreset,
    getExportableParameters,
  }
})
