/**
 * Artistic Projection Definitions
 *
 * Unique and artistic projections for special purposes, educational materials,
 * or aesthetic visualizations. These projections often have interesting
 * visual characteristics.
 */

import type { ProjectionDefinition } from '../types'
import { ProjectionCategory, ProjectionFamily, ProjectionStrategy } from '../types'

/**
 * Armadillo Projection
 * Artistic polyhedral projection with unique visual appearance
 */
export const ARMADILLO: ProjectionDefinition = {
  id: 'armadillo',
  name: 'projections.armadillo.name',
  description: 'projections.armadillo.description',
  category: ProjectionCategory.ARTISTIC,
  family: ProjectionFamily.POLYHEDRAL,
  strategy: ProjectionStrategy.D3_EXTENDED,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance', 'direction'],
    supportsComposite: false,
    supportsSplit: false,
    supportsUnified: true,
  },

  suitability: {
    usable: [
      { scale: 'global' },
    ],
    avoid: [
      { scale: 'regional' },
      { scale: 'local' },
    ],
  },

  metadata: {
    experimental: true,
  },
}

/**
 * Polyhedral Butterfly Projection
 * Unfolded globe in butterfly shape
 */
export const POLYHEDRAL_BUTTERFLY: ProjectionDefinition = {
  id: 'polyhedral-butterfly',
  name: 'projections.polyhedralButterfly.name',
  description: 'projections.polyhedralButterfly.description',
  category: ProjectionCategory.ARTISTIC,
  family: ProjectionFamily.POLYHEDRAL,
  strategy: ProjectionStrategy.D3_EXTENDED,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance', 'direction'],
    supportsComposite: false,
    supportsSplit: false,
    supportsUnified: true,
    isInterrupted: true,
  },

  suitability: {
    usable: [
      { scale: 'global' },
    ],
    avoid: [
      { scale: 'regional' },
      { scale: 'local' },
    ],
  },

  aliases: ['butterfly'],

  metadata: {
    experimental: true,
  },
}

/**
 * Loximuthal Projection
 * Rhumb lines (loxodromes) from center are straight
 */
export const LOXIMUTHAL: ProjectionDefinition = {
  id: 'loximuthal',
  name: 'projections.loximuthal.name',
  description: 'projections.loximuthal.description',
  category: ProjectionCategory.ARTISTIC,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  suitability: {
    good: [
      { scale: 'global' },
    ],
    usable: [
      { latitudeRange: { min: -30, max: 30 } },
    ],
    avoid: [
      { scale: 'regional' },
      { scale: 'local' },
    ],
  },

  creator: 'Karl Siemon & Waldo Tobler',
  year: 1935,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Loximuthal_projection',
    experimental: false,
  },
}

/**
 * Waterman Butterfly Projection
 * Polyhedral projection with minimal area distortion
 */
export const POLYHEDRAL_WATERMAN: ProjectionDefinition = {
  id: 'polyhedral-waterman',
  name: 'projections.polyhedralWaterman.name',
  description: 'projections.polyhedralWaterman.description',
  category: ProjectionCategory.ARTISTIC,
  family: ProjectionFamily.POLYHEDRAL,
  strategy: ProjectionStrategy.D3_EXTENDED,

  capabilities: {
    preserves: [],
    distorts: ['angle', 'distance', 'direction'],
    supportsComposite: false,
    supportsSplit: false,
    supportsUnified: true,
    isInterrupted: true,
  },

  suitability: {
    good: [
      { scale: 'global' },
    ],
    avoid: [
      { scale: 'regional' },
      { scale: 'local' },
    ],
  },

  aliases: ['waterman'],

  creator: 'Steve Waterman',
  year: 1996,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Waterman_butterfly_projection',
    experimental: true,
  },
}

/**
 * Array of all artistic projection definitions
 */
export const ARTISTIC_PROJECTIONS: ProjectionDefinition[] = [
  ARMADILLO,
  POLYHEDRAL_BUTTERFLY,
  LOXIMUTHAL,
  POLYHEDRAL_WATERMAN,
]
