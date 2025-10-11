/**
 * Azimuthal Projection Definitions
 *
 * Azimuthal projections project the sphere onto a plane from a specific point.
 * They preserve direction from the center point and are excellent for polar
 * regions and hemispheric views.
 */

import type { ProjectionDefinition } from '../types'
import { ProjectionCategory, ProjectionFamily, ProjectionStrategy } from '../types'

/**
 * Lambert Azimuthal Equal-Area Projection
 * Preserves area and is excellent for polar and hemispheric maps
 */
export const AZIMUTHAL_EQUAL_AREA: ProjectionDefinition = {
  id: 'azimuthal-equal-area',
  name: 'projections.azimuthalEqualArea.name',
  description: 'projections.azimuthalEqualArea.description',
  aliases: ['azimuthalEqualArea', 'lambertAzimuthal'],
  category: ProjectionCategory.AZIMUTHAL,
  family: ProjectionFamily.AZIMUTHAL,
  strategy: ProjectionStrategy.D3_BUILTIN,

  capabilities: {
    preserves: ['area', 'direction'],
    distorts: ['angle', 'distance'],
    supportsComposite: true,
    supportsSplit: true,
    supportsUnified: true,
  },

  suitability: {
    excellent: [
      { region: 'polar', latitudeRange: { min: 60, max: 90 } },
      { region: 'polar', latitudeRange: { min: -90, max: -60 } },
    ],
    good: [
      { scale: 'global' },
      { scale: 'regional', latitudeRange: { min: 45, max: 75 } },
    ],
    usable: [
      { scale: 'regional' },
    ],
  },

  creator: 'Johann Heinrich Lambert',
  year: 1772,
}

/**
 * Azimuthal Equidistant Projection
 * Preserves distance from the center point
 */
export const AZIMUTHAL_EQUIDISTANT: ProjectionDefinition = {
  id: 'azimuthal-equidistant',
  name: 'projections.azimuthalEquidistant.name',
  description: 'projections.azimuthalEquidistant.description',
  aliases: ['azimuthalEquidistant'],
  category: ProjectionCategory.AZIMUTHAL,
  family: ProjectionFamily.AZIMUTHAL,
  strategy: ProjectionStrategy.D3_BUILTIN,

  capabilities: {
    preserves: ['distance', 'direction'],
    distorts: ['area', 'angle'],
    supportsComposite: true,
    supportsSplit: true,
    supportsUnified: true,
  },

  suitability: {
    excellent: [
      { region: 'polar', latitudeRange: { min: 60, max: 90 } },
      { region: 'polar', latitudeRange: { min: -90, max: -60 } },
    ],
    good: [
      { scale: 'global' },
      { scale: 'regional' },
    ],
  },
}

/**
 * Stereographic Projection
 * Conformal azimuthal projection, excellent for polar regions
 */
export const STEREOGRAPHIC: ProjectionDefinition = {
  id: 'stereographic',
  name: 'projections.stereographic.name',
  description: 'projections.stereographic.description',
  category: ProjectionCategory.AZIMUTHAL,
  family: ProjectionFamily.AZIMUTHAL,
  strategy: ProjectionStrategy.D3_BUILTIN,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area', 'distance'],
    supportsComposite: true,
    supportsSplit: true,
    supportsUnified: true,
  },

  suitability: {
    excellent: [
      { region: 'polar', latitudeRange: { min: 60, max: 90 } },
      { region: 'polar', latitudeRange: { min: -90, max: -60 } },
    ],
    good: [
      { scale: 'global' },
      { latitudeRange: { min: 45, max: 75 } },
    ],
    usable: [
      { scale: 'regional' },
    ],
  },
}

/**
 * Orthographic Projection
 * Simulates a 3D globe view from space
 */
export const ORTHOGRAPHIC: ProjectionDefinition = {
  id: 'orthographic',
  name: 'projections.orthographic.name',
  description: 'projections.orthographic.description',
  category: ProjectionCategory.AZIMUTHAL,
  family: ProjectionFamily.AZIMUTHAL,
  strategy: ProjectionStrategy.D3_BUILTIN,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance', 'direction'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  suitability: {
    good: [
      { scale: 'global' },
    ],
    usable: [
      { scale: 'regional' },
    ],
  },
}

/**
 * Gnomonic Projection
 * All great circles appear as straight lines
 */
export const GNOMONIC: ProjectionDefinition = {
  id: 'gnomonic',
  name: 'projections.gnomonic.name',
  description: 'projections.gnomonic.description',
  category: ProjectionCategory.AZIMUTHAL,
  family: ProjectionFamily.AZIMUTHAL,
  strategy: ProjectionStrategy.D3_BUILTIN,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: false,
  },

  suitability: {
    good: [
      { scale: 'local', latitudeRange: { min: -60, max: 60 } },
    ],
    usable: [
      { scale: 'regional', latitudeRange: { min: -45, max: 45 } },
    ],
  },
}

/**
 * Array of all azimuthal projection definitions
 */
export const AZIMUTHAL_PROJECTIONS: ProjectionDefinition[] = [
  AZIMUTHAL_EQUAL_AREA,
  AZIMUTHAL_EQUIDISTANT,
  STEREOGRAPHIC,
  ORTHOGRAPHIC,
  GNOMONIC,
]
