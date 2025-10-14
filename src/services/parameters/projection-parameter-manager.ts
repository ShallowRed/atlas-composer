/**
 * Projection Parameter Manager
 *
 * Unified service for managing both global and territory-specific projection parameters
 * with inheritance, validation, and override capabilities.
 */

import type { ProjectionFamilyType } from '@/core/projections/types'
import type {
  AtlasProjectionParameters,
  BaseProjectionParameters,
  ExtendedProjectionParameters,
  ParameterChangeEvent,
  ParameterConstraints,
  ParameterInheritance,
  ParameterSource,
  ParameterUpdate,
  ParameterValidationResult,
} from '@/types/projection-parameters'

import { getRelevantParameters } from '@/core/projections/parameters'
import {
  atlasToBaseParameters,
  mergeParameters,
} from '@/types/projection-parameters'

/**
 * Parameter manager configuration
 */
interface ParameterManagerConfig {
  /** Enable parameter validation */
  enableValidation?: boolean
  /** Enable change event emission */
  enableEvents?: boolean
  /** Default parameter source priority order */
  sourcePriority?: ParameterSource[]
}

/**
 * Parameter change listener function
 */
type ParameterChangeListener = (event: ParameterChangeEvent) => void

/**
 * Unified projection parameter manager
 * Handles global and territory-specific parameters with inheritance and validation
 */
export class ProjectionParameterManager {
  private globalParameters: BaseProjectionParameters = {}
  private territoryParameters: Map<string, BaseProjectionParameters> = new Map()
  private atlasParameters: AtlasProjectionParameters | null = null
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

  /**
   * Set atlas-specific parameters
   */
  setAtlasParameters(atlasParams: AtlasProjectionParameters): void {
    this.atlasParameters = atlasParams
    this.emitChangeEvent('center', atlasParams.center, undefined, undefined, 'atlas')
  }

  /**
   * Get global parameters
   */
  getGlobalParameters(): BaseProjectionParameters {
    return { ...this.globalParameters }
  }

  /**
   * Set global parameter
   */
  setGlobalParameter(key: keyof BaseProjectionParameters, value: any): void {
    const previousValue = this.globalParameters[key]
    this.globalParameters = { ...this.globalParameters, [key]: value }

    this.emitChangeEvent(key, value, previousValue, undefined, 'global')
  }

  /**
   * Set multiple global parameters
   */
  setGlobalParameters(parameters: ParameterUpdate): void {
    const previousParams = { ...this.globalParameters }
    this.globalParameters = mergeParameters(this.globalParameters, parameters)

    // Emit change events for each modified parameter
    Object.entries(parameters).forEach(([key, value]) => {
      const paramKey = key as keyof BaseProjectionParameters
      this.emitChangeEvent(paramKey, value, previousParams[paramKey], undefined, 'global')
    })
  }

  /**
   * Get territory-specific parameters
   */
  getTerritoryParameters(territoryCode: string): BaseProjectionParameters {
    return { ...(this.territoryParameters.get(territoryCode) || {}) }
  }

  /**
   * Set territory-specific parameter
   */
  setTerritoryParameter(territoryCode: string, key: keyof BaseProjectionParameters, value: any): void {
    const currentParams = this.territoryParameters.get(territoryCode) || {}
    const previousValue = currentParams[key]

    const updatedParams = { ...currentParams, [key]: value }
    this.territoryParameters.set(territoryCode, updatedParams)

    this.emitChangeEvent(key, value, previousValue, territoryCode, 'territory')
  }

  /**
   * Set multiple territory-specific parameters
   */
  setTerritoryParameters(territoryCode: string, parameters: ParameterUpdate): void {
    const currentParams = this.territoryParameters.get(territoryCode) || {}
    const updatedParams = mergeParameters(currentParams, parameters)
    this.territoryParameters.set(territoryCode, updatedParams)

    // Emit change events for each modified parameter
    Object.entries(parameters).forEach(([key, value]) => {
      const paramKey = key as keyof BaseProjectionParameters
      this.emitChangeEvent(paramKey, value, currentParams[paramKey], territoryCode, 'territory')
    })
  }

  /**
   * Get effective parameters for a territory (with inheritance)
   */
  getEffectiveParameters(territoryCode?: string): BaseProjectionParameters {
    const atlasParams = this.atlasParameters ? atlasToBaseParameters(this.atlasParameters) : {}
    const territoryParams = territoryCode ? this.territoryParameters.get(territoryCode) || {} : {}

    return mergeParameters(
      {}, // Default empty parameters
      atlasParams, // Atlas defaults
      this.globalParameters, // Global overrides
      territoryParams, // Territory-specific overrides
    )
  }

  /**
   * Get parameter inheritance information
   */
  getParameterInheritance(territoryCode: string, key: keyof BaseProjectionParameters): ParameterInheritance {
    const territoryParams = this.territoryParameters.get(territoryCode) || {}
    const atlasParams = this.atlasParameters ? atlasToBaseParameters(this.atlasParameters) : {}
    const effectiveValue = this.getEffectiveParameters(territoryCode)[key]

    let source: ParameterSource = 'default'
    let isOverridden = false

    if (territoryParams[key] !== undefined) {
      source = 'territory'
      isOverridden = true
    }
    else if (this.globalParameters[key] !== undefined) {
      source = 'global'
    }
    else if (atlasParams[key] !== undefined) {
      source = 'atlas'
    }

    return {
      key,
      value: effectiveValue,
      source,
      isOverridden,
      atlasValue: atlasParams[key],
      globalValue: this.globalParameters[key],
    }
  }

  /**
   * Get parameter source for a territory
   */
  getParameterSource(territoryCode: string, key: keyof BaseProjectionParameters): ParameterSource {
    return this.getParameterInheritance(territoryCode, key).source
  }

  /**
   * Clear territory parameter override
   */
  clearTerritoryOverride(territoryCode: string, key: keyof BaseProjectionParameters): void {
    const currentParams = this.territoryParameters.get(territoryCode) || {}
    if (currentParams[key] === undefined)
      return

    const previousValue = currentParams[key]
    const { [key]: removed, ...remainingParams } = currentParams

    if (Object.keys(remainingParams).length === 0) {
      this.territoryParameters.delete(territoryCode)
    }
    else {
      this.territoryParameters.set(territoryCode, remainingParams)
    }

    const newValue = this.getEffectiveParameters(territoryCode)[key]
    this.emitChangeEvent(key, newValue, previousValue, territoryCode, 'global')
  }

  /**
   * Clear all territory parameter overrides
   */
  clearAllTerritoryOverrides(territoryCode: string): void {
    const currentParams = this.territoryParameters.get(territoryCode) || {}
    this.territoryParameters.delete(territoryCode)

    // Emit change events for each cleared parameter
    Object.keys(currentParams).forEach((key) => {
      const paramKey = key as keyof BaseProjectionParameters
      const previousValue = currentParams[paramKey]
      const newValue = this.getEffectiveParameters(territoryCode)[paramKey]
      this.emitChangeEvent(paramKey, newValue, previousValue, territoryCode, 'global')
    })
  }

  /**
   * Validate parameter value
   */
  validateParameter(
    family: ProjectionFamilyType,
    key: keyof BaseProjectionParameters,
    value: any,
  ): ParameterValidationResult {
    if (!this.config.enableValidation) {
      return { isValid: true }
    }

    const relevantParams = getRelevantParameters(family)
    const parameterConfig = relevantParams[key as keyof typeof relevantParams]

    // Check if parameter is relevant for this family
    if (!parameterConfig) {
      return {
        isValid: false,
        error: `Parameter ${key} is not relevant for ${family} projections`,
      }
    }

    // Basic type validation
    if (value === null || value === undefined) {
      return { isValid: true } // Allow clearing parameters
    }

    // Validate specific parameter types
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
    }

    return { isValid: true }
  }

  /**
   * Get parameter constraints for a projection family
   */
  getParameterConstraints(family: ProjectionFamilyType): Record<keyof BaseProjectionParameters, ParameterConstraints> {
    const relevantParams = getRelevantParameters(family)
    const constraints: Partial<Record<keyof BaseProjectionParameters, ParameterConstraints>> = {}

    // Define constraints for each parameter
    const parameterKeys: Array<keyof BaseProjectionParameters> = [
      'center',
      'rotate',
      'parallels',
      'scale',
      'translate',
      'clipAngle',
      'precision',
    ]

    parameterKeys.forEach((key) => {
      const relevant = relevantParams[key as keyof typeof relevantParams] || false

      constraints[key] = {
        parameter: key,
        relevant,
        required: false,
        defaultValue: this.getDefaultValue(key),
      }

      // Add specific constraints
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
      }
    })

    return constraints as Record<keyof BaseProjectionParameters, ParameterConstraints>
  }

  /**
   * Add parameter change listener
   */
  addChangeListener(listener: ParameterChangeListener): void {
    this.listeners.add(listener)
  }

  /**
   * Remove parameter change listener
   */
  removeChangeListener(listener: ParameterChangeListener): void {
    this.listeners.delete(listener)
  }

  /**
   * Export parameters to extended format for configuration export
   */
  exportParameters(territoryCode?: string): ExtendedProjectionParameters {
    const params = this.getEffectiveParameters(territoryCode)

    return {
      ...params,
      scale: params.scale || 1000,
      baseScale: params.scale || 1000,
      scaleMultiplier: 1,
    }
  }

  /**
   * Reset all parameters
   */
  reset(): void {
    this.globalParameters = {}
    this.territoryParameters.clear()
    this.atlasParameters = null
  }

  /**
   * Private method to emit parameter change events
   */
  private emitChangeEvent(
    key: keyof BaseProjectionParameters,
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

  /**
   * Private method to get default value for a parameter
   */
  private getDefaultValue(key: keyof BaseProjectionParameters): any {
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
      default:
        return undefined
    }
  }
}
