import type { ProjectionFamilyType } from './types'
import type { ProjectionParameters } from '@/types/projection-parameters'

export class CompositeConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompositeConfigurationError'
  }
}

export interface CompositeCanvasDimensions {
  width: number
  height: number
}

export interface TerritoryProjectionConfig {
  code: string
  name: string
  projectionId: string
  family: ProjectionFamilyType
  parameters: ProjectionParameters
  translateOffset: [number, number]
  pixelClipExtent: [number, number, number, number] | null
}

export interface SerializedCompositeConfig {
  atlasId: string
  atlasName: string
  referenceScale: number
  canvasDimensions: CompositeCanvasDimensions
  territories: TerritoryProjectionConfig[]
}

export class CompositeConfiguration {
  private territories: Map<string, TerritoryProjectionConfig> = new Map()

  readonly atlasId: string
  readonly atlasName: string
  private _referenceScale: number
  private _canvasDimensions: CompositeCanvasDimensions

  constructor(
    atlasId: string,
    atlasName: string,
    referenceScale: number,
    canvasDimensions: CompositeCanvasDimensions,
  ) {
    if (!atlasId || atlasId.trim() === '') {
      throw new CompositeConfigurationError('Atlas ID is required')
    }
    if (referenceScale <= 0) {
      throw new CompositeConfigurationError('Reference scale must be positive')
    }
    if (canvasDimensions.width <= 0 || canvasDimensions.height <= 0) {
      throw new CompositeConfigurationError('Canvas dimensions must be positive')
    }

    this.atlasId = atlasId
    this.atlasName = atlasName
    this._referenceScale = referenceScale
    this._canvasDimensions = { ...canvasDimensions }
  }

  get referenceScale(): number {
    return this._referenceScale
  }

  setReferenceScale(scale: number): void {
    if (scale <= 0) {
      throw new CompositeConfigurationError('Reference scale must be positive')
    }
    this._referenceScale = scale
  }

  get canvasDimensions(): CompositeCanvasDimensions {
    return { ...this._canvasDimensions }
  }

  setCanvasDimensions(dimensions: CompositeCanvasDimensions): void {
    if (dimensions.width <= 0 || dimensions.height <= 0) {
      throw new CompositeConfigurationError('Canvas dimensions must be positive')
    }
    this._canvasDimensions = { ...dimensions }
  }

  addTerritory(config: TerritoryProjectionConfig): void {
    this.validateTerritory(config)
    this.territories.set(config.code, { ...config })
  }

  updateTerritory(code: string, updates: Partial<TerritoryProjectionConfig>): void {
    const existing = this.territories.get(code)
    if (!existing) {
      throw new CompositeConfigurationError(`Territory not found: ${code}`)
    }

    const updated: TerritoryProjectionConfig = {
      ...existing,
      ...updates,
      code,
    }

    this.validateTerritory(updated)
    this.territories.set(code, updated)
  }

  removeTerritory(code: string): boolean {
    if (this.territories.size <= 1 && this.territories.has(code)) {
      throw new CompositeConfigurationError('Cannot remove the last territory')
    }
    return this.territories.delete(code)
  }

  getTerritory(code: string): TerritoryProjectionConfig | undefined {
    const config = this.territories.get(code)
    return config ? { ...config } : undefined
  }

  getTerritoryCodes(): string[] {
    return Array.from(this.territories.keys())
  }

  getAllTerritories(): TerritoryProjectionConfig[] {
    return Array.from(this.territories.values()).map(t => ({ ...t }))
  }

  get territoryCount(): number {
    return this.territories.size
  }

  hasTerritory(code: string): boolean {
    return this.territories.has(code)
  }

  toJSON(): SerializedCompositeConfig {
    return {
      atlasId: this.atlasId,
      atlasName: this.atlasName,
      referenceScale: this._referenceScale,
      canvasDimensions: { ...this._canvasDimensions },
      territories: this.getAllTerritories(),
    }
  }

  static fromJSON(data: SerializedCompositeConfig): CompositeConfiguration {
    const composite = new CompositeConfiguration(
      data.atlasId,
      data.atlasName,
      data.referenceScale,
      data.canvasDimensions,
    )

    for (const territory of data.territories) {
      composite.addTerritory(territory)
    }

    return composite
  }

  private validateTerritory(config: TerritoryProjectionConfig): void {
    if (!config.code || config.code.trim() === '') {
      throw new CompositeConfigurationError('Territory code is required')
    }

    if (!config.projectionId || config.projectionId.trim() === '') {
      throw new CompositeConfigurationError(`Projection ID is required for territory: ${config.code}`)
    }

    if (config.parameters.scaleMultiplier !== undefined && config.parameters.scaleMultiplier <= 0) {
      throw new CompositeConfigurationError(`Scale multiplier must be positive for territory: ${config.code}`)
    }
  }
}
