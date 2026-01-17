/**
 * Cylindrical Projection Definitions
 *
 * Cylindrical projections map the sphere onto a cylinder. They are commonly
 * used for navigation and web maps. Mercator is particularly useful for
 * overseas territories in tropical regions.
 */

import type { ProjectionDefinition } from '../types'
import { ProjectionCategory, ProjectionFamily, ProjectionStrategy } from '../types'

/**
 * Mercator Projection
 * Preserves angles and shapes, commonly used for navigation
 * Ideal for overseas territories near the equator
 */
export const MERCATOR: ProjectionDefinition = {
  id: 'mercator',
  name: 'projections.mercator.name',
  description: 'projections.mercator.description',
  category: ProjectionCategory.CYLINDRICAL,
  family: ProjectionFamily.CYLINDRICAL,
  strategy: ProjectionStrategy.D3_BUILTIN,

  capabilities: {
    preserves: ['angle', 'direction'],
    distorts: ['area'],
    supportsComposite: true,
    supportsSplit: true,
    supportsUnified: true,
  },

  defaultParameters: {},

  aliases: ['web-mercator'],

  creator: 'Gerardus Mercator',
  year: 1569,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Mercator_projection',
    experimental: false,
  },
}

/**
 * Equirectangular Projection (Plate Carrée)
 * Simple rectangular projection where meridians and parallels are evenly spaced
 */
export const EQUIRECTANGULAR: ProjectionDefinition = {
  id: 'equirectangular',
  name: 'projections.equirectangular.name',
  description: 'projections.equirectangular.description',
  category: ProjectionCategory.CYLINDRICAL,
  family: ProjectionFamily.CYLINDRICAL,
  strategy: ProjectionStrategy.D3_BUILTIN,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance', 'direction'],
    supportsComposite: true,
    supportsSplit: true,
    supportsUnified: true,
  },

  aliases: ['plateCarree', 'geographic'],

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Equirectangular_projection',
    experimental: false,
  },
}

/**
 * Array of all cylindrical projection definitions
 */
export const CYLINDRICAL_PROJECTIONS: ProjectionDefinition[] = [
  MERCATOR,
  EQUIRECTANGULAR,
]
