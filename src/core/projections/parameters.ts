import type { ProjectionFamilyType } from './types'
import { ProjectionFamily } from './types'

export interface ProjectionParameterSet {
  rotateLongitude: boolean
  rotateLatitude: boolean
  centerLongitude: boolean
  centerLatitude: boolean
  parallels: boolean
}

export const PROJECTION_PARAMETERS_BY_FAMILY: Record<ProjectionFamilyType, ProjectionParameterSet> = {
  [ProjectionFamily.CYLINDRICAL]: {
    rotateLongitude: true,
    rotateLatitude: true,
    centerLongitude: false,
    centerLatitude: false,
    parallels: false,
  },

  [ProjectionFamily.PSEUDOCYLINDRICAL]: {
    rotateLongitude: true,
    rotateLatitude: true,
    centerLongitude: false,
    centerLatitude: false,
    parallels: false,
  },

  [ProjectionFamily.CONIC]: {
    rotateLongitude: false,
    rotateLatitude: false,
    centerLongitude: true,
    centerLatitude: true,
    parallels: true,
  },

  [ProjectionFamily.AZIMUTHAL]: {
    rotateLongitude: true,
    rotateLatitude: true,
    centerLongitude: false,
    centerLatitude: false,
    parallels: false,
  },

  [ProjectionFamily.COMPOSITE]: {
    rotateLongitude: false,
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
