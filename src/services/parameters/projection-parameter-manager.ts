import type { Positioning } from '@/core/positioning'
import type { TerritoryCode } from '@/types/branded'
import type {
  ParameterChangeEvent,
  ParameterInheritance,
  ParameterSource,
  ParameterUpdate,
  ProjectionParameters,
} from '@/types/projection-parameters'

import { mergeParameters } from '@/types/projection-parameters'
import { logger } from '@/utils/logger'

const debug = logger.parameters.manager

interface ParameterManagerConfig {
  enableEvents?: boolean
  sourcePriority?: ParameterSource[]
}

type ParameterChangeListener = (event: ParameterChangeEvent) => void

function isPositioningKey(key: keyof ProjectionParameters): boolean {
  return key === 'center' || key === 'rotate'
}

function definesPositioning(params: ProjectionParameters): boolean {
  return params.center !== undefined || params.rotate !== undefined
}

function copyPositioning(params: ProjectionParameters): Positioning {
  return {
    center: params.center ? [...params.center] as [number, number] : undefined,
    rotate: params.rotate ? [...params.rotate] as [number, number] | [number, number, number] : undefined,
  }
}

// A positioning update replaces both parameters of the level; mergeParameters
// would keep the current value of a parameter the update leaves undefined.
function updateParameters(current: ProjectionParameters, update: ParameterUpdate): ProjectionParameters {
  const { center, rotate, ...rest } = update
  const merged = mergeParameters(current, rest)
  const updated = 'center' in update || 'rotate' in update
    ? { ...merged, ...copyPositioning({ center, rotate }) }
    : merged
  return Object.fromEntries(Object.entries(updated).filter(([, value]) => value !== undefined))
}

export class ProjectionParameterManager {
  private globalParameters: ProjectionParameters = {}
  private territoryParameters: Map<string, ProjectionParameters> = new Map()
  private atlasParameters: ProjectionParameters | null = null
  private listeners: Set<ParameterChangeListener> = new Set()
  private config: ParameterManagerConfig

  constructor(config: ParameterManagerConfig = {}) {
    this.config = {
      enableEvents: true,
      sourcePriority: ['territory', 'global', 'atlas', 'projection', 'default'],
      ...config,
    }
  }

  setAtlasParameters(atlasParams: ProjectionParameters): void {
    this.atlasParameters = { ...atlasParams }
    this.emitChangeEvent('center', this.atlasParameters.center, undefined, undefined, 'atlas')
  }

  getGlobalParameters(): ProjectionParameters {
    return { ...this.globalParameters }
  }

  setGlobalParameter(key: keyof ProjectionParameters, value: any): void {
    this.refusePositioningKey(key)
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
    this.globalParameters = updateParameters(this.globalParameters, parameters)

    Object.entries(parameters).forEach(([key, value]) => {
      const paramKey = key as keyof ProjectionParameters
      this.emitChangeEvent(paramKey, value, previousParams[key], undefined, 'global')
    })
  }

  getTerritoryParameters(territoryCode: TerritoryCode): ProjectionParameters {
    return { ...(this.territoryParameters.get(territoryCode) || {}) }
  }

  setTerritoryParameter(territoryCode: TerritoryCode, key: keyof ProjectionParameters, value: any): void {
    this.refusePositioningKey(key)
    const currentParams = this.territoryParameters.get(territoryCode) || {}
    const previousValue = currentParams[key]

    const updatedParams = { ...currentParams, [key]: value }
    this.territoryParameters.set(territoryCode, updatedParams)

    this.emitChangeEvent(key, value, previousValue, territoryCode, 'territory')
  }

  setTerritoryParameters(territoryCode: TerritoryCode, parameters: ParameterUpdate): void {
    const currentParams = this.territoryParameters.get(territoryCode) || {}
    const updatedParams = updateParameters(currentParams, parameters)
    this.territoryParameters.set(territoryCode, updatedParams)

    Object.entries(parameters).forEach(([key, value]) => {
      const paramKey = key as keyof ProjectionParameters
      this.emitChangeEvent(paramKey, value, currentParams[paramKey], territoryCode, 'territory')
    })
  }

  getEffectiveParameters(territoryCode?: string): ProjectionParameters {
    const atlasParams = this.atlasParameters || {}
    const territoryParams = territoryCode ? this.territoryParameters.get(territoryCode) || {} : {}

    const merged = mergeParameters(
      {}, // Default empty parameters
      atlasParams, // Atlas defaults
      this.globalParameters, // Global overrides
      territoryParams, // Territory-specific overrides
    )
    const positioningLevel = [territoryParams, this.globalParameters, atlasParams].find(definesPositioning)

    return { ...merged, ...copyPositioning(positioningLevel ?? {}) }
  }

  getParameterInheritance(territoryCode: TerritoryCode, key: keyof ProjectionParameters): ParameterInheritance {
    const territoryParams = this.territoryParameters.get(territoryCode) || {}
    const atlasParams = this.atlasParameters || {}
    const effectiveValue = this.getEffectiveParameters(territoryCode)[key as string]
    const defines = isPositioningKey(key)
      ? definesPositioning
      : (params: ProjectionParameters) => params[key as string] !== undefined

    let source: ParameterSource = 'default'
    let isOverridden = false

    if (defines(territoryParams)) {
      source = 'territory'
      isOverridden = true
    }
    else if (defines(this.globalParameters)) {
      source = 'global'
    }
    else if (defines(atlasParams)) {
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
    const keys = isPositioningKey(key) ? ['center', 'rotate'] : [key as string]
    if (keys.every(k => currentParams[k] === undefined))
      return

    const previousValue = currentParams[key as string]
    const remainingParams = Object.fromEntries(
      Object.entries(currentParams).filter(([k]) => !keys.includes(k)),
    ) as ProjectionParameters

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

  private refusePositioningKey(key: keyof ProjectionParameters): void {
    if (isPositioningKey(key))
      throw new Error(`[ProjectionParameterManager] ${String(key)} is part of the positioning: write rotate and center together with setGlobalParameters or setTerritoryParameters.`)
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
