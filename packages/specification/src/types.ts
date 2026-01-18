export type I18nString = string | { en: string, fr?: string, [lang: string]: string | undefined }

export type GeoBounds = [[number, number], [number, number]]

export type ProjectionFamily
  = | 'CYLINDRICAL'
    | 'CONIC'
    | 'AZIMUTHAL'
    | 'PSEUDOCYLINDRICAL'
    | 'POLYCONIC'
    | 'MISCELLANEOUS'

/**
 * Different projection families use different parameter subsets:
 * - Cylindrical: center (longitude, latitude)
 * - Conic: rotate (lambda, phi), parallels (south, north)
 * - Azimuthal: rotate (lambda, phi, gamma)
 */
export interface ProjectionParameters {
  rotate?: [number, number] | [number, number, number]
  center?: [number, number]
  parallels?: [number, number]
  scaleMultiplier?: number
  scale?: number
  clipAngle?: number
  distance?: number
  tilt?: number
  precision?: number

  /** @deprecated Use center[0] or rotate[0] */
  focusLongitude?: number

  /** @deprecated Use center[1] or rotate[1] */
  focusLatitude?: number
}

export interface LayoutConfig {
  translateOffset: [number, number]
  pixelClipExtent: [number, number, number, number]
}

export interface TerritoryConfig {
  code: string
  name: I18nString
  projection: {
    id: string
    family: ProjectionFamily
    parameters: ProjectionParameters
  }
  layout: LayoutConfig
  bounds: GeoBounds
}

export interface ConfigMetadata {
  atlasId: string
  atlasName?: I18nString
  exportDate?: string
  createdWith?: string
  notes?: string
  [key: string]: unknown
}

export interface CanvasDimensions {
  width: number
  height: number
}

export interface AtlasMetadata {
  compositeProjections?: string[]
  defaultCompositeProjection?: string
  projectionPreferences?: {
    recommended?: string[]
    prohibited?: string[]
  }
  projectionParameters?: {
    center?: { longitude: number, latitude: number }
    rotate?: {
      conic?: [number, number]
      azimuthal?: [number, number]
    }
    parallels?: {
      conic?: [number, number]
    }
  }
}

export interface CompositeProjectionConfig {
  $schema?: string
  version: string
  metadata: ConfigMetadata
  referenceScale: number
  canvasDimensions: CanvasDimensions
  territories: TerritoryConfig[]
  atlasMetadata?: AtlasMetadata
}

export function isCompositeProjectionConfig(value: unknown): value is CompositeProjectionConfig {
  if (typeof value !== 'object' || value === null)
    return false
  const config = value as Record<string, unknown>
  return (
    typeof config.version === 'string'
    && typeof config.metadata === 'object'
    && typeof config.referenceScale === 'number'
    && typeof config.canvasDimensions === 'object'
    && Array.isArray(config.territories)
  )
}

export function getTerritoryCodes(config: CompositeProjectionConfig): string[] {
  return config.territories.map(t => t.code)
}

export function findTerritory(
  config: CompositeProjectionConfig,
  code: string,
): TerritoryConfig | undefined {
  return config.territories.find(t => t.code === code)
}

export const SPECIFICATION_VERSION = '1.0'
export const MIN_SUPPORTED_VERSION = '1.0'
