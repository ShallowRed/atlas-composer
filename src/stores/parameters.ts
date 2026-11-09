import type { PositioningView } from '@/core/positioning'
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { ParameterIssue } from '@/core/types/errors'
import type { Translation } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type {
  ParameterUpdate,
  ProjectionParameterProvider,
  ProjectionParameters,
} from '@/types/projection-parameters'

import { defineStore } from 'pinia'
import { computed, markRaw, ref } from 'vue'

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

type TupleParameter = 'rotate' | 'center' | 'parallels' | 'translateOffset' | 'pixelClipExtent'

type TupleRanges<K extends TupleParameter> = K extends 'rotate'
  ? [AxisRange, AxisRange, AxisRange]
  : K extends 'pixelClipExtent'
    ? [AxisRange, AxisRange, AxisRange, AxisRange]
    : [AxisRange, AxisRange]

export const useParameterStore = defineStore('parameters', () => {
  const parameterManager = new ProjectionParameterManager()

  const globalParametersVersion = ref(0)
  const territoryParametersVersion = ref(0)

  function reset() {
    parameterManager.reset()
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
      throw new Error(`[ParameterStore] Invalid null/undefined value for ${key} on territory ${territoryCode}. The initializeAtlas action of the composition store should validate before calling.`)
    }

    parameterManager.setTerritoryParameter(territoryCode, key, value)
    territoryParametersVersion.value++
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
    // Every d3 projection has clipAngle: a value kept from an azimuthal projection would clip the new one
    const clipAngle = parameterRegistry.getConstraintsForFamily('clipAngle', family).relevant ? {} : { clipAngle: undefined }

    setTerritoryParameters(territoryCode, {
      projectionId,
      ...(view === 'composite' && hasPositioning && family !== previousFamily ? convertPositioning(effective, family) : {}),
      ...clipAngle,
    })
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

    globalParametersVersion.value++
    territoryParametersVersion.value++

    debug('All parameters cleared')
  }

  function validateTerritoryParameters(territoryCode: TerritoryCode, family: ProjectionFamilyType): ParameterIssue[] {
    return parameterRegistry.validateParameters(getEffectiveParameters(territoryCode), family)
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
  function getTupleRanges<K extends TupleParameter>(family: ProjectionFamilyType, key: K): TupleRanges<K> | undefined {
    const { min, max, step } = parameterRegistry.getConstraintsForFamily(key, family)
    if (!Array.isArray(min) || !Array.isArray(max))
      return undefined
    return min.map((axisMin, axis) => ({ min: axisMin, max: max[axis] as number, step })) as TupleRanges<K>
  }

  function getNumberRange(family: ProjectionFamilyType, key: keyof ProjectionParameters): AxisRange | undefined {
    const { min, max, step } = parameterRegistry.getConstraintsForFamily(key as string, family)
    return typeof min === 'number' && typeof max === 'number' ? { min, max, step } : undefined
  }

  const globalEffectiveParameters = computed(() => {
    void globalParametersVersion.value
    void territoryParametersVersion.value
    return parameterManager.getEffectiveParameters()
  })

  function initializeFromPreset(
    atlasParams: ProjectionParameters,
    territoryParams: Record<string, ProjectionParameters>,
  ): void {
    if (atlasParams) {
      parameterManager.setAtlasParameters(atlasParams)
    }

    for (const [code, params] of Object.entries(territoryParams)) {
      setTerritoryParameters(code as TerritoryCode, params)
    }
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

  // markRaw: the composite projections call it at each render, without a reactive proxy
  const parameterProvider: ProjectionParameterProvider = markRaw({
    getEffectiveParameters,
    getExportableParameters,
  })

  return {
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

    validateTerritoryParameters,

    getParameterConstraints,
    getTupleRanges,
    getNumberRange,

    initializeFromPreset,
    getExportableParameters,
    parameterProvider,
  }
})
