/**
 * Graticule Types
 *
 * Types for the adaptive graticule rendering system that provides
 * scale-aware grid lines with dash-based visual hierarchy.
 */

/**
 * Graticule density level based on effective scale
 * Higher levels = finer grid (more lines per degree)
 */
export interface GraticuleLevel {
  /** Level index (0-5, where 5 is finest) */
  level: number
  /** Step size in degrees [longitude, latitude] */
  step: [number, number]
  /** SVG stroke width for lines at this level */
  strokeWidth: number
  /** Opacity for lines at this level */
  opacity: number
  /** CSS class name for styling */
  className: string
  /** Precision in degrees for line sampling (higher = fewer points = faster) */
  precision: number
  /** Dash pattern [dash, gap] - undefined means solid line */
  dashArray?: [number, number]
}

/**
 * Configuration for graticule generation
 */
export interface GraticuleConfig {
  /** Geographic extent [[minLon, minLat], [maxLon, maxLat]] */
  extent?: [[number, number], [number, number]]
  /** Line precision in degrees (default 2.5) */
  precision?: number
  /** Whether to include the outline polygon */
  includeOutline?: boolean
}

/**
 * Full graticule overlay configuration
 */
export interface GraticuleOverlayConfig {
  /** Whether to show graticule lines */
  showGraticule: boolean
  /** Canvas/viewport dimensions */
  width: number
  height: number
  /** Projection function for coordinate transformation */
  projection: d3.GeoProjection
  /** Optional effective scales per territory (for composite projections) */
  territoryScales?: Map<string, number>
  /** Optional territory bounds for clipping */
  territoryBounds?: Map<string, [[number, number], [number, number]]>
  /** Single effective scale (for simple mode) */
  effectiveScale?: number
  /** Graticule opacity override */
  opacity?: number
}

/**
 * Graticule geometry with metadata
 */
export interface GraticuleGeometry {
  /** The GeoJSON MultiLineString geometry */
  geometry: GeoJSON.MultiLineString
  /** The graticule level this geometry represents */
  level: GraticuleLevel
  /** Optional territory code if clipped to a territory */
  territoryCode?: string
}

/**
 * Scale thresholds for graticule level determination
 * Index corresponds to level boundary (scale >= threshold[i] => level i+1)
 */
export const GRATICULE_SCALE_THRESHOLDS = [400, 1200, 3000, 6000, 12000] as const

/**
 * Step sizes in degrees for each graticule level [longitude, latitude]
 */
export const GRATICULE_LEVEL_STEPS: readonly [number, number][] = [
  [15, 15], // Level 0: Coarse (world view)
  [10, 10], // Level 1: Medium-coarse (continental)
  [5, 5], // Level 2: Medium (country)
  [2, 2], // Level 3: Fine (regional)
  [1, 1], // Level 4: Very fine (local)
  [1, 1], // Level 5: Same as level 4 (0.5 is too dense)
] as const

/**
 * Precision for each graticule level (degrees between sampled points)
 * Higher precision value = fewer points = faster rendering
 */
export const GRATICULE_PRECISIONS = [10, 5, 5, 5, 5, 5] as const

/**
 * Stroke width - uniform for all levels (visual hierarchy via dash patterns)
 */
export const GRATICULE_STROKE_WIDTH = 0.75 as const

/**
 * Opacities for each graticule level
 */
export const GRATICULE_OPACITIES = [0.5, 0.45, 0.4, 0.35, 0.3, 0.25] as const

/**
 * Dash patterns for each graticule level [dash, gap]
 * undefined = solid line (for major gridlines)
 * Lower levels (coarse) use solid lines, higher levels (fine) use dashes
 */
export const GRATICULE_DASH_PATTERNS: readonly (readonly [number, number] | undefined)[] = [
  undefined, // Level 0: Solid (major world grid)
  undefined, // Level 1: Solid (continental)
  [8, 4], // Level 2: Long dash (country)
  [4, 4], // Level 3: Medium dash (regional)
  [2, 4], // Level 4: Short dash (local)
  [1, 3], // Level 5: Dotted (finest)
] as const
