import type { ProjectionDefinition } from '../types'
import { geoArmadillo, geoLoximuthal, geoPolyhedralButterfly, geoPolyhedralWaterman } from 'd3-geo-projection'
import { ProjectionCategory, ProjectionFamily, ProjectionStrategy } from '../types'

const ARMADILLO: ProjectionDefinition = {
  id: 'armadillo',
  name: 'projections.armadillo.name',
  description: 'projections.armadillo.description',
  category: ProjectionCategory.ARTISTIC,
  family: ProjectionFamily.POLYHEDRAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoArmadillo,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance', 'direction'],
    supportsComposite: false,
    supportsSplit: false,
    supportsUnified: true,
  },

  metadata: {
    experimental: true,
  },
}

const POLYHEDRAL_BUTTERFLY: ProjectionDefinition = {
  id: 'polyhedral-butterfly',
  name: 'projections.polyhedralButterfly.name',
  description: 'projections.polyhedralButterfly.description',
  category: ProjectionCategory.ARTISTIC,
  family: ProjectionFamily.POLYHEDRAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoPolyhedralButterfly,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance', 'direction'],
    supportsComposite: false,
    supportsSplit: false,
    supportsUnified: true,
    isInterrupted: true,
  },

  aliases: ['butterfly'],

  metadata: {
    experimental: true,
  },
}

const LOXIMUTHAL: ProjectionDefinition = {
  id: 'loximuthal',
  name: 'projections.loximuthal.name',
  description: 'projections.loximuthal.description',
  category: ProjectionCategory.ARTISTIC,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoLoximuthal,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  creator: 'Karl Siemon & Waldo Tobler',
  year: 1935,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Loximuthal_projection',
    experimental: false,
  },
}

const POLYHEDRAL_WATERMAN: ProjectionDefinition = {
  id: 'polyhedral-waterman',
  name: 'projections.polyhedralWaterman.name',
  description: 'projections.polyhedralWaterman.description',
  category: ProjectionCategory.ARTISTIC,
  family: ProjectionFamily.POLYHEDRAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoPolyhedralWaterman,

  capabilities: {
    preserves: [],
    distorts: ['angle', 'distance', 'direction'],
    supportsComposite: false,
    supportsSplit: false,
    supportsUnified: true,
    isInterrupted: true,
  },

  aliases: ['waterman'],

  creator: 'Steve Waterman',
  year: 1996,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Waterman_butterfly_projection',
    experimental: true,
  },
}

export const ARTISTIC_PROJECTIONS: ProjectionDefinition[] = [
  ARMADILLO,
  POLYHEDRAL_BUTTERFLY,
  LOXIMUTHAL,
  POLYHEDRAL_WATERMAN,
]
