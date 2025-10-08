/**
 * Territory-related constants
 */

/**
 * Default projection types for different territory categories
 */
export const DEFAULT_PROJECTION_TYPES = {
  MAINLAND: 'conic-conformal',
  OVERSEAS: 'mercator',
  POLAR: 'azimuthal-equal-area',
} as const

/**
 * Default translation ranges for territory controls (in pixels)
 */
export const TRANSLATION_RANGES = {
  x: { min: -600, max: 600, step: 10 },
  y: { min: -400, max: 400, step: 10 },
} as const

/**
 * Default scale range for territory controls
 */
export const SCALE_RANGE = {
  min: 0.5,
  max: 2.0,
  step: 0.1,
  default: 1.0,
} as const
