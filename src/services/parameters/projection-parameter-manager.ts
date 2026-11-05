import type { TerritoryCode } from '@/types/branded'
import type {
  ParameterChangeEvent,
  ParameterInheritance,
  ParameterSource,
  ParameterUpdate,
  ProjectionParameters,
} from '@/types/projection-parameters'

import { inferCanonicalFromLegacy } from '@/core/positioning'
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
}
