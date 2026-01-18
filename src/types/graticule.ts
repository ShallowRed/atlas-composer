export interface GraticuleLevel {
  level: number
  step: [number, number]
  strokeWidth: number
  opacity: number
  className: string
  precision: number
  dashArray?: [number, number]
}

export interface GraticuleConfig {
  extent?: [[number, number], [number, number]]
  precision?: number
  includeOutline?: boolean
}

export interface GraticuleOverlayConfig {
  showGraticule: boolean
  width: number
  height: number
  projection: d3.GeoProjection
  territoryScales?: Map<string, number>
  territoryBounds?: Map<string, [[number, number], [number, number]]>
  effectiveScale?: number
  opacity?: number
}

export interface GraticuleGeometry {
  geometry: GeoJSON.MultiLineString
  level: GraticuleLevel
  territoryCode?: string
}

export const GRATICULE_SCALE_THRESHOLDS = [400, 1200, 3000, 6000, 12000] as const

export const GRATICULE_LEVEL_STEPS: readonly [number, number][] = [
  [15, 15],
  [10, 10],
  [5, 5],
  [2, 2],
  [1, 1],
  [1, 1],
] as const

export const GRATICULE_PRECISIONS = [10, 5, 5, 5, 5, 5] as const
export const GRATICULE_STROKE_WIDTH = 0.75 as const
export const GRATICULE_OPACITIES = [0.5, 0.45, 0.4, 0.35, 0.3, 0.25] as const

export const GRATICULE_DASH_PATTERNS: readonly (readonly [number, number] | undefined)[] = [
  undefined,
  undefined,
  [8, 4],
  [4, 4],
  [2, 4],
  [1, 3],
] as const
