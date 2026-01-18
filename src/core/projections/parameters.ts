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
    rotateLongitude: true,
    rotateLatitude: true,
    centerLongitude: false,
    centerLatitude: false,
    parallels: false,
  },

  [ProjectionFamily.OTHER]: {
    rotateLongitude: false,
    rotateLatitude: false,
    centerLongitude: false,
    centerLatitude: false,
    parallels: false,
  },
}

export function getRelevantParameters(family: ProjectionFamilyType): ProjectionParameterSet {
  return PROJECTION_PARAMETERS_BY_FAMILY[family]
}

export function hasRelevantParameters(family: ProjectionFamilyType): boolean {
  const params = PROJECTION_PARAMETERS_BY_FAMILY[family]
  return Object.values(params).includes(true)
}
