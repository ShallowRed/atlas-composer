import type { ProjectionDefinition } from '../types'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjUK from 'd3-composite-projections/src/albersUk.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjAlbersUsa from 'd3-composite-projections/src/albersUsa.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjAlbersUsaTerritories from 'd3-composite-projections/src/albersUsaTerritories.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjEurope from 'd3-composite-projections/src/conicConformalEurope.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjections from 'd3-composite-projections/src/conicConformalFrance.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjNetherlands from 'd3-composite-projections/src/conicConformalNetherlands.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjPortugal from 'd3-composite-projections/src/conicConformalPortugal.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjSpain from 'd3-composite-projections/src/conicConformalSpain.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjJapan from 'd3-composite-projections/src/conicEquidistantJapan.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjEcuador from 'd3-composite-projections/src/mercatorEcuador.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjEquatorialGuinea from 'd3-composite-projections/src/mercatorEquatorialGuinea.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjMalaysia from 'd3-composite-projections/src/mercatorMalaysia.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjChile from 'd3-composite-projections/src/transverseMercatorChile.js'
// @ts-expect-error - d3-composite-projections has module resolution issues in tests
import * as d3CompositeProjDenmark from 'd3-composite-projections/src/transverseMercatorDenmark.js'
import { geoAlbersUsa } from 'd3-geo'
import { ProjectionCategory, ProjectionFamily, ProjectionStrategy } from '../types'

const CONIC_CONFORMAL_FRANCE: ProjectionDefinition = {
  id: 'conic-conformal-france',
  name: 'projections.conicConformalFrance.name',
  description: 'projections.conicConformalFrance.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjections.default(),

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [2.5, 46.5],
  },

  aliases: ['france-composite', 'composite-france'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      // eslint-disable-next-line no-restricted-syntax -- default scale of conicConformalFrance in d3-composite-projections
      defaultScale: 2700,
      referenceWidth: 960,
    },
  },
}

const CONIC_CONFORMAL_PORTUGAL: ProjectionDefinition = {
  id: 'conic-conformal-portugal',
  name: 'projections.conicConformalPortugal.name',
  description: 'projections.conicConformalPortugal.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjPortugal.default(),

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [-8, 39.5],
  },

  aliases: ['portugal-composite', 'composite-portugal'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 4200,
      referenceWidth: 960,
    },
  },
}

const CONIC_CONFORMAL_SPAIN: ProjectionDefinition = {
  id: 'conic-conformal-spain',
  name: 'projections.conicConformalSpain.name',
  description: 'projections.conicConformalSpain.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjSpain.default(),

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [-3, 40],
  },

  aliases: ['spain-composite', 'composite-spain'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 3500,
      referenceWidth: 960,
    },
  },
}

const CONIC_CONFORMAL_EUROPE: ProjectionDefinition = {
  id: 'conic-conformal-europe',
  name: 'projections.conicConformalEurope.name',
  description: 'projections.conicConformalEurope.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjEurope.default(),

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [10, 50],
  },

  aliases: ['europe-composite', 'composite-europe', 'europe-composite', 'composite-europe'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 750,
      referenceWidth: 960,
    },
  },
}

const ALBERS_USA: ProjectionDefinition = {
  id: 'albers-usa',
  name: 'projections.albersUsa.name',
  description: 'projections.albersUsa.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: geoAlbersUsa,

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [-98.5, 39.8],
  },

  metadata: {
    infoUrl: 'https://d3js.org/d3-geo/conic#geoAlbersUsa',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 1070,
      referenceWidth: 960,
    },
  },
}

const ALBERS_USA_COMPOSITE: ProjectionDefinition = {
  id: 'albers-usa-composite',
  name: 'projections.albersUsaComposite.name',
  description: 'projections.albersUsaComposite.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjAlbersUsa.default(),

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [-98.5, 39.8],
  },

  aliases: ['usa-composite'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 1300, // Adjusted for standard composite
      referenceWidth: 960,
    },
  },
}

const ALBERS_USA_TERRITORIES: ProjectionDefinition = {
  id: 'albers-usa-territories',
  name: 'projections.albersUsaTerritories.name',
  description: 'projections.albersUsaTerritories.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjAlbersUsaTerritories.default(),

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [-98.5, 39.8],
  },

  aliases: ['usa-territories'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 1300, // Adjusted for USA territories extent
      referenceWidth: 960,
    },
  },
}

const CONIC_CONFORMAL_NETHERLANDS: ProjectionDefinition = {
  id: 'conic-conformal-netherlands',
  name: 'projections.conicConformalNetherlands.name',
  description: 'projections.conicConformalNetherlands.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjNetherlands.default(),

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [5.5, 52.2],
  },

  aliases: ['netherlands-composite', 'composite-netherlands'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 6500,
      referenceWidth: 960,
    },
  },
}

const CONIC_EQUIDISTANT_JAPAN: ProjectionDefinition = {
  id: 'conic-equidistant-japan',
  name: 'projections.conicEquidistantJapan.name',
  description: 'projections.conicEquidistantJapan.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjJapan.default(),

  capabilities: {
    preserves: ['distance'],
    distorts: ['area', 'angle'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [136, 38],
  },

  aliases: ['japan-composite', 'composite-japan'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 2000,
      referenceWidth: 960,
    },
  },
}

const MERCATOR_ECUADOR: ProjectionDefinition = {
  id: 'mercator-ecuador',
  name: 'projections.mercatorEcuador.name',
  description: 'projections.mercatorEcuador.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjEcuador.default(),

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [-78.5, -1.5],
  },

  aliases: ['ecuador-composite', 'composite-ecuador'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 3500,
      referenceWidth: 960,
    },
  },
}

const TRANSVERSE_MERCATOR_CHILE: ProjectionDefinition = {
  id: 'transverse-mercator-chile',
  name: 'projections.transverseMercatorChile.name',
  description: 'projections.transverseMercatorChile.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjChile.default(),

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [-72, -37],
  },

  aliases: ['chile-composite', 'composite-chile'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 1000,
      referenceWidth: 960,
    },
  },
}

const MERCATOR_MALAYSIA: ProjectionDefinition = {
  id: 'mercator-malaysia',
  name: 'projections.mercatorMalaysia.name',
  description: 'projections.mercatorMalaysia.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjMalaysia.default(),

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [112, 4],
  },

  aliases: ['malaysia-composite', 'composite-malaysia'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 2500,
      referenceWidth: 960,
    },
  },
}

const MERCATOR_EQUATORIAL_GUINEA: ProjectionDefinition = {
  id: 'mercator-equatorial-guinea',
  name: 'projections.mercatorEquatorialGuinea.name',
  description: 'projections.mercatorEquatorialGuinea.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjEquatorialGuinea.default(),

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [10, 1.5],
  },

  aliases: ['equatorial-guinea-composite', 'composite-equatorial-guinea'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 7000,
      referenceWidth: 960,
    },
  },
}

const ALBERS_UK: ProjectionDefinition = {
  id: 'albers-uk',
  name: 'projections.albersUk.name',
  description: 'projections.albersUk.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjUK.default(),

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [-2, 55.4],
  },

  aliases: ['uk-composite', 'composite-uk', 'united-kingdom-composite'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 4500,
      referenceWidth: 960,
    },
  },
}

const TRANSVERSE_MERCATOR_DENMARK: ProjectionDefinition = {
  id: 'transverse-mercator-denmark',
  name: 'projections.transverseMercatorDenmark.name',
  description: 'projections.transverseMercatorDenmark.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.MISCELLANEOUS,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  create: () => d3CompositeProjDenmark.default(),

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  defaultParameters: {
    center: [10.5, 56],
  },

  aliases: ['denmark-composite', 'composite-denmark'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 6000,
      referenceWidth: 960,
    },
  },
}

export const COMPOSITE_PROJECTIONS: ProjectionDefinition[] = [
  CONIC_CONFORMAL_FRANCE,
  CONIC_CONFORMAL_PORTUGAL,
  CONIC_CONFORMAL_SPAIN,
  CONIC_CONFORMAL_EUROPE,
  ALBERS_USA,
  ALBERS_USA_COMPOSITE,
  ALBERS_USA_TERRITORIES,
  CONIC_CONFORMAL_NETHERLANDS,
  CONIC_EQUIDISTANT_JAPAN,
  MERCATOR_ECUADOR,
  TRANSVERSE_MERCATOR_CHILE,
  MERCATOR_MALAYSIA,
  MERCATOR_EQUATORIAL_GUINEA,
  ALBERS_UK,
  TRANSVERSE_MERCATOR_DENMARK,
]
