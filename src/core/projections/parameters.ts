/**
 * Projection Parameters Configuration
 *
 * Centralized configuration for which parameters are relevant for each projection family.
 * This ensures consistency between UI controls and projection application logic.
 */

import type { ProjectionFamilyType } from './types'
import { ProjectionFamily } from './types'

/**
 * Parameter set for a projection family
 */
export interface ProjectionParameterSet {
  /**
   * Longitude rotation (λ) - rotates the projection around the vertical axis
   * Applicable to most projections for centering on different meridians
   */
  rotateLongitude: boolean

  /**
   * Latitude rotation (φ) - rotates the projection around the horizontal axis
   * Primarily used for azimuthal projections to change the point of tangency
   */
  rotateLatitude: boolean

  /**
   * Center longitude - sets the central meridian of the projection
   * Used as an alternative to rotation for some projections
   */
  centerLongitude: boolean

  /**
   * Center latitude - sets the central parallel of the projection
   * Used as an alternative to rotation for some projections
   */
  centerLatitude: boolean

  /**
   * Standard parallels - defines the two parallels of zero distortion
   * Only applicable to conic projections
   */
  parallels: boolean
}

/**
 * Configuration map of projection families to their relevant parameters
 *
 * Based on D3 projection behavior:
 * - CYLINDRICAL: Uses rotation for centering, no parallels
 * - PSEUDOCYLINDRICAL: Uses rotation for centering, no parallels
 * - CONIC: Uses rotation, center, and parallels (two standard parallels)
 * - AZIMUTHAL: Uses rotation (including latitude) and center for positioning
 * - COMPOSITE: Typically uses pre-configured parameters, not user-adjustable
 * - POLYHEDRAL: Complex projections with fixed geometry, not user-adjustable
 */
export const PROJECTION_PARAMETERS_BY_FAMILY: Record<ProjectionFamilyType, ProjectionParameterSet> = {
  [ProjectionFamily.CYLINDRICAL]: {
    rotateLongitude: true, // Rotate to center on different meridians
    rotateLatitude: true, // Rotate vertically for alternative viewpoints
    centerLongitude: false, // Rotation is preferred for cylindrical
    centerLatitude: false, // Fixed at equator for standard cylindrical
    parallels: false, // No standard parallels in cylindrical
  },

  [ProjectionFamily.PSEUDOCYLINDRICAL]: {
    rotateLongitude: true, // Rotate to center on different meridians
    rotateLatitude: true, // Rotate vertically for alternative viewpoints
    centerLongitude: false, // Rotation is preferred
    centerLatitude: false, // Fixed at equator for standard pseudocylindrical
    parallels: false, // No standard parallels
  },

  [ProjectionFamily.CONIC]: {
    rotateLongitude: false, // Merged with center longitude in implementation
    rotateLatitude: false, // Not used for conic
    centerLongitude: true, // Sets the central meridian (includes rotation)
    centerLatitude: true, // Sets the origin parallel
    parallels: true, // Two standard parallels define the cone
  },

  [ProjectionFamily.AZIMUTHAL]: {
    rotateLongitude: true, // Rotate around vertical axis
    rotateLatitude: true, // Rotate around horizontal axis (unique to azimuthal)
    centerLongitude: false, // Don't show - rotation handles this
    centerLatitude: false, // Don't show - rotation handles this
    parallels: false, // No parallels in azimuthal
  },

  [ProjectionFamily.COMPOSITE]: {
    rotateLongitude: false, // Composite projections use fixed positioning
    rotateLatitude: false,
    centerLongitude: false,
    centerLatitude: false,
    parallels: false,
  },

  [ProjectionFamily.POLYHEDRAL]: {
    rotateLongitude: true, // Polyhedral projections can rotate to change viewpoint
    rotateLatitude: true, // Polyhedral projections can rotate vertically
    centerLongitude: false, // Rotation is used instead of center
    centerLatitude: false, // Rotation is used instead of center
    parallels: false, // No parallels in polyhedral
  },

  [ProjectionFamily.OTHER]: {
    rotateLongitude: false, // Unknown projection types
    rotateLatitude: false,
    centerLongitude: false,
    centerLatitude: false,
    parallels: false,
  },
}

/**
 * Get the parameter set for a given projection family
 *
 * @param family - The projection family
 * @returns The set of relevant parameters for this family
 */
export function getRelevantParameters(family: ProjectionFamilyType): ProjectionParameterSet {
  return PROJECTION_PARAMETERS_BY_FAMILY[family]
}

/**
 * Check if a projection family has any user-adjustable parameters
 *
 * @param family - The projection family
 * @returns True if at least one parameter is relevant
 */
export function hasRelevantParameters(family: ProjectionFamilyType): boolean {
  const params = PROJECTION_PARAMETERS_BY_FAMILY[family]
  return Object.values(params).includes(true)
}
