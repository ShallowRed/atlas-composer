/**
 * Conic Projection Definitions
 *
 * Conic projections are ideal for mid-latitude regions. They project the sphere
 * onto a cone, which is then unrolled into a flat surface. They are commonly used
 * for individual territories in custom composite mode.
 */

import type { ProjectionDefinition } from '../types'
import { ProjectionCategory, ProjectionFamily, ProjectionStrategy } from '../types'

/**
 * Conic Conformal (Lambert Conformal Conic)
 * Preserves angles and shapes, ideal for mid-latitude regions
 * Used as individual projection for territories in custom composite mode
 */
export const CONIC_CONFORMAL: ProjectionDefinition = {
  id: 'conic-conformal',
  name: 'projections.conicConformal.name',
  description: 'projections.conicConformal.description',
  category: ProjectionCategory.CONIC,
  family: ProjectionFamily.CONIC,
  strategy: ProjectionStrategy.D3_BUILTIN,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: true, // Can be used in custom composite mode
    supportsSplit: true,
    supportsUnified: true,
    recommendedMaxScale: 5000000,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'europe', latitudeRange: { min: 30, max: 60 } },
      { territoryType: 'mainland', region: 'americas', latitudeRange: { min: 30, max: 60 } },
    ],
    good: [
      { territoryType: 'mainland', latitudeRange: { min: 20, max: 70 } },
      { territoryType: 'island', scale: 'regional' },
    ],
    usable: [
      { territoryType: 'overseas', scale: 'local' },
    ],
    avoid: [
      { latitudeRange: { min: -10, max: 10 } }, // Not good for equatorial regions
      { scale: 'global' }, // Not suitable for world maps
    ],
    // Note: Not recommended for france/portugal/eu because there are dedicated
    // composite projections (conic-conformal-france, etc.) for those atlases
    recommendedForAtlases: [],
  },

  defaultParameters: {
    parallels: [30, 60],
  },

  aliases: ['conicConformal', 'lambert-conformal-conic', 'lambert', 'lcc'],

  creator: 'Johann Heinrich Lambert',
  year: 1772,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Lambert_conformal_conic_projection',
    experimental: false,
  },
}

/**
 * Albers Equal Area Conic (Conic Equal Area)
 * Preserves area, good for thematic maps
 * Alternative to Conic Conformal for territories in custom composite mode
 */
export const ALBERS: ProjectionDefinition = {
  id: 'conic-equal-area',
  name: 'projections.conicEqualArea.name',
  description: 'projections.conicEqualArea.description',
  category: ProjectionCategory.CONIC,
  family: ProjectionFamily.CONIC,
  strategy: ProjectionStrategy.D3_BUILTIN,

  capabilities: {
    preserves: ['area'],
    distorts: ['angle'],
    supportsComposite: true,
    supportsSplit: true,
    supportsUnified: true,
    recommendedMaxScale: 5000000,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'europe', latitudeRange: { min: 30, max: 60 } },
      { territoryType: 'mainland', region: 'americas', latitudeRange: { min: 30, max: 60 } },
    ],
    good: [
      { territoryType: 'mainland', latitudeRange: { min: 20, max: 70 } },
      { territoryType: 'island', scale: 'regional' },
    ],
    usable: [
      { territoryType: 'overseas', scale: 'local' },
    ],
    avoid: [
      { latitudeRange: { min: -10, max: 10 } },
      { scale: 'global' },
    ],
    // Note: Not recommended for france/portugal/eu because there are dedicated
    // composite projections for those atlases
    recommendedForAtlases: [],
  },

  defaultParameters: {
    parallels: [30, 60],
  },

  aliases: ['albers', 'albers-usa'],

  creator: 'Heinrich Christian Albers',
  year: 1805,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Albers_projection',
    experimental: false,
  },
}

/**
 * Conic Equidistant
 * Preserves distance along meridians, good for north-south extent
 */
export const CONIC_EQUIDISTANT: ProjectionDefinition = {
  id: 'conic-equidistant',
  name: 'projections.conicEquidistant.name',
  description: 'projections.conicEquidistant.description',
  category: ProjectionCategory.CONIC,
  family: ProjectionFamily.CONIC,
  strategy: ProjectionStrategy.D3_BUILTIN,

  capabilities: {
    preserves: ['distance'],
    distorts: ['area', 'angle'],
    supportsComposite: true,
    supportsSplit: true,
    supportsUnified: true,
    recommendedMaxScale: 5000000,
  },

  suitability: {
    good: [
      { territoryType: 'mainland', region: 'europe', latitudeRange: { min: 30, max: 60 } },
      { territoryType: 'mainland', region: 'americas', latitudeRange: { min: 30, max: 60 } },
    ],
    usable: [
      { territoryType: 'mainland', latitudeRange: { min: 20, max: 70 } },
      { territoryType: 'island', scale: 'regional' },
    ],
    avoid: [
      { latitudeRange: { min: -10, max: 10 } },
      { scale: 'global' },
    ],
  },

  defaultParameters: {
    parallels: [30, 60],
  },

  aliases: ['conicEquidistant'],

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Equidistant_conic_projection',
    experimental: false,
  },
}

/**
 * Array of all conic projection definitions
 */
export const CONIC_PROJECTIONS: ProjectionDefinition[] = [
  CONIC_CONFORMAL,
  ALBERS,
  CONIC_EQUIDISTANT,
]
