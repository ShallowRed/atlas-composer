import type { Positioning } from '@/core/positioning'
import type { TerritoryCode } from '@/types/branded'
import type { ParameterUpdate, ProjectionParameters } from '@/types/projection-parameters'

import { mergeParameters } from '@/types/projection-parameters'
import { logger } from '@/utils/logger'

const debug = logger.parameters.manager

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

  setAtlasParameters(atlasParams: ProjectionParameters): void {
    this.atlasParameters = { ...atlasParams }
  }

  getGlobalParameters(): ProjectionParameters {
    return { ...this.globalParameters }
  }

  setGlobalParameter(key: keyof ProjectionParameters, value: any): void {
    this.refusePositioningKey(key)

    if (value === undefined) {
      const { [key]: removed, ...rest } = this.globalParameters
      this.globalParameters = rest
    }
    else {
      this.globalParameters = { ...this.globalParameters, [key]: value }
    }
  }

  setGlobalParameters(parameters: ParameterUpdate): void {
    this.globalParameters = updateParameters(this.globalParameters, parameters)
  }

  clearGlobalParameters(): void {
    this.globalParameters = {}
  }

  getTerritoryParameters(territoryCode: TerritoryCode): ProjectionParameters {
    return { ...(this.territoryParameters.get(territoryCode) || {}) }
  }

  setTerritoryParameter(territoryCode: TerritoryCode, key: keyof ProjectionParameters, value: any): void {
    this.refusePositioningKey(key)
    const currentParams = this.territoryParameters.get(territoryCode) || {}
    const updatedParams = { ...currentParams, [key]: value }
    this.territoryParameters.set(territoryCode, updatedParams)
  }

  setTerritoryParameters(territoryCode: TerritoryCode, parameters: ParameterUpdate): void {
    const currentParams = this.territoryParameters.get(territoryCode) || {}
    const updatedParams = updateParameters(currentParams, parameters)
    this.territoryParameters.set(territoryCode, updatedParams)
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

  clearAllTerritoryOverrides(territoryCode: TerritoryCode): void {
    this.territoryParameters.delete(territoryCode)
  }

  clearAll(): void {
    this.globalParameters = {}
    this.atlasParameters = null
    this.territoryParameters.clear()

    debug('All parameters cleared')
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
}
