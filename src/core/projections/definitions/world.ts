/**
 * World Projection Definitions
 */

import type { ProjectionDefinition } from '../types'
import { geoNaturalEarth1 } from 'd3-geo'
import { geoEckert1, geoEckert2, geoEckert3, geoEckert4, geoEckert5, geoEckert6, geoHammer, geoMiller, geoMollweide, geoRobinson, geoSinusoidal, geoWagner6, geoWinkel3 } from 'd3-geo-projection'
import { ProjectionCategory, ProjectionFamily, ProjectionStrategy } from '../types'

const NATURAL_EARTH: ProjectionDefinition = {
  id: 'natural-earth',
  name: 'projections.naturalEarth.name',
  description: 'projections.naturalEarth.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_BUILTIN,
  create: geoNaturalEarth1,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  aliases: ['naturalEarth1', 'natural-earth-1'],

  creator: 'Tom Patterson',
  year: 2007,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Natural_Earth_projection',
    experimental: false,
  },
}

const ROBINSON: ProjectionDefinition = {
  id: 'robinson',
  name: 'projections.robinson.name',
  description: 'projections.robinson.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoRobinson,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  creator: 'Arthur H. Robinson',
  year: 1963,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Robinson_projection',
    experimental: false,
  },
}

const ECKERT4: ProjectionDefinition = {
  id: 'eckert4',
  name: 'projections.eckert4.name',
  description: 'projections.eckert4.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoEckert4,

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  creator: 'Max Eckert',
  year: 1906,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Eckert_IV_projection',
    experimental: false,
  },
}

const WINKEL_TRIPEL: ProjectionDefinition = {
  id: 'winkel-tripel',
  name: 'projections.winkelTripel.name',
  description: 'projections.winkelTripel.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoWinkel3,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  aliases: ['winkelTripel', 'winkel3'],

  creator: 'Oswald Winkel',
  year: 1921,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Winkel_tripel_projection',
    experimental: false,
  },
}

const MOLLWEIDE: ProjectionDefinition = {
  id: 'mollweide',
  name: 'projections.mollweide.name',
  description: 'projections.mollweide.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoMollweide,

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  aliases: ['mollweide'],

  creator: 'Karl Mollweide',
  year: 1805,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Mollweide_projection',
    experimental: false,
  },
}

const MILLER: ProjectionDefinition = {
  id: 'miller',
  name: 'projections.miller.name',
  description: 'projections.miller.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.CYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoMiller,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  creator: 'Osborn Maitland Miller',
  year: 1942,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Miller_cylindrical_projection',
    experimental: false,
  },
}

const SINUSOIDAL: ProjectionDefinition = {
  id: 'sinusoidal',
  name: 'projections.sinusoidal.name',
  description: 'projections.sinusoidal.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoSinusoidal,

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  aliases: ['sinusoidal', 'sansonFlamsteed', 'mercatorEqualArea'],

  creator: 'Nicolas Sanson / John Flamsteed',
  year: 1650,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Sinusoidal_projection',
    experimental: false,
  },
}

const WAGNER6: ProjectionDefinition = {
  id: 'wagner6',
  name: 'projections.wagner6.name',
  description: 'projections.wagner6.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoWagner6,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  aliases: ['wagner6', 'wagnerVI'],

  creator: 'Karlheinz Wagner',
  year: 1932,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Wagner_VI_projection',
    experimental: false,
  },
}

const HAMMER: ProjectionDefinition = {
  id: 'hammer',
  name: 'projections.hammer.name',
  description: 'projections.hammer.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.AZIMUTHAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoHammer,

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  aliases: ['hammer', 'hammerAitoff'],

  creator: 'Ernst Hammer',
  year: 1892,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Hammer_projection',
    experimental: false,
  },
}

const ECKERT1: ProjectionDefinition = {
  id: 'eckert1',
  name: 'projections.eckert1.name',
  description: 'projections.eckert1.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoEckert1,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  creator: 'Max Eckert',
  year: 1906,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Eckert_I_projection',
    experimental: false,
  },
}

const ECKERT2: ProjectionDefinition = {
  id: 'eckert2',
  name: 'projections.eckert2.name',
  description: 'projections.eckert2.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoEckert2,

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  creator: 'Max Eckert',
  year: 1906,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Eckert_II_projection',
    experimental: false,
  },
}

const ECKERT3: ProjectionDefinition = {
  id: 'eckert3',
  name: 'projections.eckert3.name',
  description: 'projections.eckert3.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoEckert3,

  capabilities: {
    preserves: [],
    distorts: ['area', 'angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  creator: 'Max Eckert',
  year: 1906,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Eckert_III_projection',
    experimental: false,
  },
}

const ECKERT5: ProjectionDefinition = {
  id: 'eckert5',
  name: 'projections.eckert5.name',
  description: 'projections.eckert5.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoEckert5,

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  creator: 'Max Eckert',
  year: 1906,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Eckert_V_projection',
    experimental: false,
  },
}

const ECKERT6: ProjectionDefinition = {
  id: 'eckert6',
  name: 'projections.eckert6.name',
  description: 'projections.eckert6.description',
  category: ProjectionCategory.WORLD,
  family: ProjectionFamily.PSEUDOCYLINDRICAL,
  strategy: ProjectionStrategy.D3_EXTENDED,
  create: geoEckert6,

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
  },

  creator: 'Max Eckert',
  year: 1906,

  metadata: {
    infoUrl: 'https://en.wikipedia.org/wiki/Eckert_VI_projection',
    experimental: false,
  },
}

export const WORLD_PROJECTIONS: ProjectionDefinition[] = [
  NATURAL_EARTH,
  ROBINSON,
  ECKERT4,
  WINKEL_TRIPEL,
  MOLLWEIDE,
  MILLER,
  SINUSOIDAL,
  WAGNER6,
  HAMMER,
  ECKERT1,
  ECKERT2,
  ECKERT3,
  ECKERT5,
  ECKERT6,
]
