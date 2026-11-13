import type { ProjectionDefinition } from '../types'
import { geoEquirectangular, geoMercator, geoTransverseMercator } from 'd3-geo'
import { ProjectionCategory, ProjectionFamily, ProjectionStrategy } from '../types'

const MERCATOR: ProjectionDefinition = {
  id: 'mercator',
  name: 'projections.mercator.name',
  description: 'projections.mercator.description',
  category: ProjectionCategory.CYLINDRICAL,
  family: ProjectionFamily.CYLINDRICAL,
  strategy: ProjectionStrategy.D3_BUILTIN,
  create: geoMercator,

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

const TRANSVERSE_MERCATOR: ProjectionDefinition = {
  id: 'transverse-mercator',
  name: 'projections.transverseMercator.name',
  description: 'projections.transverseMercator.description',
  category: ProjectionCategory.CYLINDRICAL,
  family: ProjectionFamily.CYLINDRICAL,
  strategy: ProjectionStrategy.D3_BUILTIN,
  create: geoTransverseMercator,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: true,
    supportsSplit: true,
    supportsUnified: true,
  },

  defaultParameters: {},

  aliases: [],

  creator: 'Johann Heinrich Lambert',
  year: 1772,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Transverse_Mercator_projection',
    experimental: false,
  },
}

/**
 * Equirectangular Projection (Plate Carrée)
 * Simple rectangular projection where meridians and parallels are evenly spaced
 */
const EQUIRECTANGULAR: ProjectionDefinition = {
  id: 'equirectangular',
  name: 'projections.equirectangular.name',
  description: 'projections.equirectangular.description',
  category: ProjectionCategory.CYLINDRICAL,
  family: ProjectionFamily.CYLINDRICAL,
  strategy: ProjectionStrategy.D3_BUILTIN,
  create: geoEquirectangular,

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
  TRANSVERSE_MERCATOR,
  EQUIRECTANGULAR,
]
