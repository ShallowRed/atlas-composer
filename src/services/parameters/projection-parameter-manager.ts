import type { ProjectionFamilyType } from '@/core/projections/types'
import type { TerritoryCode } from '@/types/branded'
import type {
  ParameterChangeEvent,
  ParameterConstraints,
  ParameterInheritance,
  ParameterSource,
  ParameterUpdate,
  ParameterValidationResult,
  ProjectionParameters,
} from '@/types/projection-parameters'

import { inferCanonicalFromLegacy } from '@/core/positioning'
import { getRelevantParameters } from '@/core/projections/parameters'
import { mergeParameters } from '@/types/projection-parameters'
import { logger } from '@/utils/logger'

const debug = logger.parameters.manager

interface ParameterManagerConfig {
  enableValidation?: boolean
  enableEvents?: boolean
  sourcePriority?: ParameterSource[]
}

type ParameterChangeListener = (event: ParameterChangeEvent) => void

export class ProjectionParameterManager {
  private globalParameters: ProjectionParameters = {}
  private territoryParameters: Map<string, ProjectionParameters> = new Map()
  private atlasParameters: ProjectionParameters | null = null
  private listeners: Set<ParameterChangeListener> = new Set()
  private config: ParameterManagerConfig

  constructor(config: ParameterManagerConfig = {}) {
    this.config = {
      enableValidation: true,
      enableEvents: true,
      sourcePriority: ['territory', 'global', 'atlas', 'projection', 'default'],
      ...config,
    }
  }

  setAtlasParameters(atlasParams: ProjectionParameters): void {
    this.atlasParameters = this.normalizeParameters(atlasParams)
    this.emitChangeEvent('center', this.atlasParameters.center, undefined, undefined, 'atlas')
  }

  private normalizeParameters(params: ProjectionParameters): ProjectionParameters {
    const result = { ...params }

    const hasLegacyPositioning = result.center || result.rotate
    const hasCanonicalPositioning = result.focusLongitude !== undefined
      || result.focusLatitude !== undefined

    if (hasLegacyPositioning && !hasCanonicalPositioning) {
      const canonical = inferCanonicalFromLegacy({
        center: result.center as [number, number] | undefined,
        rotate: result.rotate as [number, number, number] | undefined,
      })

      result.focusLongitude = canonical.focusLongitude
      result.focusLatitude = canonical.focusLatitude
      if (canonical.rotateGamma !== 0) {
        result.rotateGamma = canonical.rotateGamma
      }

      delete result.center
      delete result.rotate

      debug('Normalized legacy params to canonical: %O', result)
    }

    return result
  }

  getGlobalParameters(): ProjectionParameters {
    return { ...this.globalParameters }
  }

  setGlobalParameter(key: keyof ProjectionParameters, value: any): void {
    const previousValue = this.globalParameters[key]

    if (value === undefined) {
      const { [key]: removed, ...rest } = this.globalParameters
      this.globalParameters = rest
    }
    else {
      this.globalParameters = { ...this.globalParameters, [key]: value }
    }

    this.emitChangeEvent(key, value, previousValue, undefined, 'global')
  }

  setGlobalParameters(parameters: ParameterUpdate): void {
    const previousParams = { ...this.globalParameters }
    this.globalParameters = mergeParameters(this.globalParameters, parameters)

    Object.entries(parameters).forEach(([key, value]) => {
      const paramKey = key as keyof ProjectionParameters
      this.emitChangeEvent(paramKey, value, previousParams[key], undefined, 'global')
    })
  }

  getTerritoryParameters(territoryCode: TerritoryCode): ProjectionParameters {
    return { ...(this.territoryParameters.get(territoryCode) || {}) }
  }

  setTerritoryParameter(territoryCode: TerritoryCode, key: keyof ProjectionParameters, value: any): void {
    const currentParams = this.territoryParameters.get(territoryCode) || {}
    const previousValue = currentParams[key]

    const updatedParams = { ...currentParams, [key]: value }
    this.territoryParameters.set(territoryCode, updatedParams)

    this.emitChangeEvent(key, value, previousValue, territoryCode, 'territory')
  }

  setTerritoryParameters(territoryCode: TerritoryCode, parameters: ParameterUpdate): void {
    const currentParams = this.territoryParameters.get(territoryCode) || {}
    const normalizedParams = this.normalizeParameters(parameters as ProjectionParameters)
    const updatedParams = mergeParameters(currentParams, normalizedParams)
    this.territoryParameters.set(territoryCode, updatedParams)

    Object.entries(normalizedParams).forEach(([key, value]) => {
      const paramKey = key as keyof ProjectionParameters
      this.emitChangeEvent(paramKey, value, currentParams[paramKey], territoryCode, 'territory')
    })
  }

  getEffectiveParameters(territoryCode?: string): ProjectionParameters {
    const atlasParams = this.atlasParameters || {}
    const territoryParams = territoryCode ? this.territoryParameters.get(territoryCode) || {} : {}

    return mergeParameters(
      {}, // Default empty parameters
      atlasParams, // Atlas defaults
      this.globalParameters, // Global overrides
      territoryParams, // Territory-specific overrides
    )
  }

  getParameterInheritance(territoryCode: TerritoryCode, key: keyof ProjectionParameters): ParameterInheritance {
    const territoryParams = this.territoryParameters.get(territoryCode) || {}
    const atlasParams = this.atlasParameters || {}
    const effectiveValue = this.getEffectiveParameters(territoryCode)[key as string]

    let source: ParameterSource = 'default'
    let isOverridden = false

    if (territoryParams[key as string] !== undefined) {
      source = 'territory'
      isOverridden = true
    }
    else if (this.globalParameters[key as string] !== undefined) {
      source = 'global'
    }
    else if (atlasParams[key as string] !== undefined) {
      source = 'atlas'
    }

    return {
      key,
      value: effectiveValue,
      source,
      isOverridden,
      atlasValue: atlasParams[key as string],
      globalValue: this.globalParameters[key as string],
    }
  }

  getParameterSource(territoryCode: TerritoryCode, key: keyof ProjectionParameters): ParameterSource {
    return this.getParameterInheritance(territoryCode, key).source
  }

  clearTerritoryOverride(territoryCode: TerritoryCode, key: keyof ProjectionParameters): void {
    const currentParams = this.territoryParameters.get(territoryCode) || {}
    if (currentParams[key as string] === undefined)
      return

    const previousValue = currentParams[key as string]
    const keyStr = key as string
    const { [keyStr]: removed, ...remainingParams } = currentParams

    if (Object.keys(remainingParams).length === 0) {
      this.territoryParameters.delete(territoryCode)
    }
    else {
      this.territoryParameters.set(territoryCode, remainingParams)
    }

    const newValue = this.getEffectiveParameters(territoryCode)[key]
    this.emitChangeEvent(key, newValue, previousValue, territoryCode, 'global')
  }

  clearAllTerritoryOverrides(territoryCode: TerritoryCode): void {
    const currentParams = this.territoryParameters.get(territoryCode) || {}
    this.territoryParameters.delete(territoryCode)

    Object.keys(currentParams).forEach((key) => {
      const paramKey = key as keyof ProjectionParameters
      const previousValue = currentParams[key]
      const newValue = this.getEffectiveParameters(territoryCode)[key]
      this.emitChangeEvent(paramKey, newValue, previousValue, territoryCode, 'global')
    })
  }

  clearAll(): void {
    this.globalParameters = {}
    this.atlasParameters = null
    this.territoryParameters.clear()

    debug('All parameters cleared')
  }

  validateParameter(
    family: ProjectionFamilyType,
    key: keyof ProjectionParameters,
    value: any,
  ): ParameterValidationResult {
    if (!this.config.enableValidation) {
      return { isValid: true }
    }

    const relevantParams = getRelevantParameters(family)
    const parameterConfig = relevantParams[key as keyof typeof relevantParams]

    if (!parameterConfig) {
      return {
        isValid: false,
        error: `Parameter ${String(key)} is not relevant for ${family} projections`,
      }
    }

    if (value === null || value === undefined) {
      return { isValid: true }
    }

    switch (key) {
      case 'center':
      case 'parallels':
      case 'translate':
        if (!Array.isArray(value) || value.length !== 2 || !value.every(v => typeof v === 'number')) {
          return {
            isValid: false,
            error: `${key} must be an array of two numbers`,
          }
        }
        break

      case 'rotate':
        if (!Array.isArray(value) || (value.length < 2 || value.length > 3) || !value.every(v => typeof v === 'number')) {
          return {
            isValid: false,
            error: 'rotate must be an array of 2 or 3 numbers',
          }
        }
        break

      case 'scale':
      case 'clipAngle':
      case 'precision':
        if (typeof value !== 'number' || value <= 0) {
          return {
            isValid: false,
            error: `${key} must be a positive number`,
          }
        }
        break

      case 'pixelClipExtent':
        if (!Array.isArray(value) || value.length !== 4 || !value.every(v => typeof v === 'number')) {
          return {
            isValid: false,
            error: 'pixelClipExtent must be an array of four numbers [x1, y1, x2, y2]',
          }
        }
        break
    }

    return { isValid: true }
  }

  getParameterConstraints(family: ProjectionFamilyType): Record<keyof ProjectionParameters, ParameterConstraints> {
    const relevantParams = getRelevantParameters(family)
    const constraints: Partial<Record<keyof ProjectionParameters, ParameterConstraints>> = {}

    const parameterKeys: Array<keyof ProjectionParameters> = [
      'center',
      'rotate',
      'parallels',
      'scale',
      'translate',
      'clipAngle',
      'precision',
      'pixelClipExtent',
    ]

    parameterKeys.forEach((key) => {
      const relevant = relevantParams[key as keyof typeof relevantParams] || false

      constraints[key] = {
        parameter: key as keyof ProjectionParameters,
        relevant,
        required: false,
        defaultValue: this.getDefaultValue(key),
      }

      switch (key) {
        case 'scale':
          constraints[key] = {
            ...constraints[key]!,
            min: 1,
            max: 100000,
            step: 1,
          }
          break

        case 'clipAngle':
          constraints[key] = {
            ...constraints[key]!,
            min: 0,
            max: 180,
            step: 1,
          }
          break

        case 'precision':
          constraints[key] = {
            ...constraints[key]!,
            min: 0.001,
            max: 10,
            step: 0.001,
          }
          break

        case 'pixelClipExtent':
          constraints[key] = {
            ...constraints[key]!,
            min: -500,
            max: 500,
            step: 1,
          }
          break
      }
    })

    return constraints as Record<keyof ProjectionParameters, ParameterConstraints>
  }

  addChangeListener(listener: ParameterChangeListener): void {
    this.listeners.add(listener)
  }

  removeChangeListener(listener: ParameterChangeListener): void {
    this.listeners.delete(listener)
  }

  exportParameters(territoryCode?: string): ProjectionParameters {
    const params = this.getEffectiveParameters(territoryCode)

    return {
      ...params,
      scale: params.scale || 1000,
      baseScale: params.scale || 1000,
      scaleMultiplier: 1,
    }
  }

  reset(): void {
    this.globalParameters = {}
    this.territoryParameters.clear()
    this.atlasParameters = null
  }

  private emitChangeEvent(
    key: keyof ProjectionParameters,
    value: any,
    previousValue: any,
    territoryCode?: string,
    source: ParameterSource = 'global',
  ): void {
    if (!this.config.enableEvents)
      return

    const event: ParameterChangeEvent = {
      key,
      value,
      previousValue,
      territoryCode,
      source,
    }

    this.listeners.forEach(listener => listener(event))
  }

  private getDefaultValue(key: keyof ProjectionParameters): any {
    switch (key) {
      case 'center':
        return [0, 0]
      case 'rotate':
        return [0, 0, 0]
      case 'parallels':
        return [30, 60]
      case 'scale':
        return 1000
      case 'translate':
        return [0, 0]
      case 'clipAngle':
        return 90
      case 'precision':
        return 0.1
      case 'pixelClipExtent':
        return [-100, -100, 100, 100]
      default:
        return undefined
    }
  }
}
