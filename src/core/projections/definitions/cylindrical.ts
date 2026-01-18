import type { ProjectionDefinition } from '../types'
import { ProjectionCategory, ProjectionFamily, ProjectionStrategy } from '../types'

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

export const CYLINDRICAL_PROJECTIONS: ProjectionDefinition[] = [
  MERCATOR,
  EQUIRECTANGULAR,
]
