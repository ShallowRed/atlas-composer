/**
 * Composite Projection Definitions
 *
 * These are the main composite projections that combine multiple projections
 * to create optimal representations of countries with geographically-scattered territories.
 * This is the core feature of Atlas composer.
 */

import type { ProjectionDefinition } from '../types'
import { ProjectionCategory, ProjectionFamily, ProjectionStrategy } from '../types'

/**
 * Conic Conformal France - Composite projection for France
 * Optimized for France's metropolitan territory and overseas departments/territories
 */
export const CONIC_CONFORMAL_FRANCE: ProjectionDefinition = {
  id: 'conic-conformal-france',
  name: 'projections.conicConformalFrance.name',
  description: 'projections.conicConformalFrance.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false, // Already composite
    supportsSplit: true, // Can be used in split view mode
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'europe' },
      { territoryType: 'overseas', scale: 'regional' },
    ],
  },

  defaultParameters: {
    // Parameters are handled by d3-composite-projections
    center: [2.5, 46.5], // Approximate center of France
  },

  aliases: ['france-composite', 'composite-france'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 2700,
      referenceWidth: 960, // Configured for 960×500
    },
  },
}

/**
 * Conic Conformal Portugal - Composite projection for Portugal
 * Optimized for Portugal's mainland and Atlantic archipelagos (Azores, Madeira)
 */
export const CONIC_CONFORMAL_PORTUGAL: ProjectionDefinition = {
  id: 'conic-conformal-portugal',
  name: 'projections.conicConformalPortugal.name',
  description: 'projections.conicConformalPortugal.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'europe' },
      { territoryType: 'archipelago', region: 'europe' },
    ],
  },

  defaultParameters: {
    center: [-8, 39.5], // Approximate center of Portugal
  },

  aliases: ['portugal-composite', 'composite-portugal'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 4200, // Adjusted for better fill (was 3500)
      referenceWidth: 960, // Configured for 960×500
    },
  },
}

/**
 * Conic Conformal Spain - Composite projection for Spain
 * Optimized for Spain's mainland, Balearic Islands, and Canary Islands
 */
export const CONIC_CONFORMAL_SPAIN: ProjectionDefinition = {
  id: 'conic-conformal-spain',
  name: 'projections.conicConformalSpain.name',
  description: 'projections.conicConformalSpain.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'europe' },
      { territoryType: 'archipelago', region: 'europe' },
      { territoryType: 'archipelago', region: 'africa' },
    ],
  },

  defaultParameters: {
    center: [-3, 40], // Approximate center of Spain
  },

  aliases: ['spain-composite', 'composite-spain'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 3500, // Adjusted for Spain's extent
      referenceWidth: 960, // Configured for 960×500
    },
  },
}

/**
 * Conic Conformal Europe - Composite projection for European Union
 * Optimized for European Union member states including overseas territories
 */
export const CONIC_CONFORMAL_EUROPE: ProjectionDefinition = {
  id: 'conic-conformal-europe',
  name: 'projections.conicConformalEurope.name',
  description: 'projections.conicConformalEurope.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'europe' },
      { territoryType: 'overseas', scale: 'regional' },
    ],
  },

  defaultParameters: {
    center: [10, 50], // Approximate center of Europe
  },

  aliases: ['europe-composite', 'composite-europe', 'europe-composite', 'composite-europe'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
    requiresCustomFit: true,
    customFit: {
      defaultScale: 750, // d3-composite-projections default for Europe
      referenceWidth: 960, // Configured for 960×500
    },
  },
}

/**
 * Albers USA - Composite projection for United States
 * Optimized for the contiguous United States, Alaska, and Hawaii
 * This is the classic D3 composite projection for the USA
 */
export const ALBERS_USA: ProjectionDefinition = {
  id: 'albers-usa',
  name: 'projections.albersUsa.name',
  description: 'projections.albersUsa.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false, // Already composite
    supportsSplit: true, // Can be used in split view mode
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'americas' },
      { territoryType: 'overseas', region: 'americas' },
      { territoryType: 'overseas', region: 'oceania' },
    ],
  },

  defaultParameters: {
    // Parameters are handled by d3-geo albersUsa
    center: [-98.5, 39.8], // Approximate center of contiguous USA
  },

  metadata: {
    infoUrl: 'https://d3js.org/d3-geo/conic#geoAlbersUsa',
    experimental: false,
    // Note: D3's native geoAlbersUsa doesn't support fitExtent properly with external data.
    // We must use customFit to manually scale it. Use albers-usa-composite if you need
    // proper fitting behavior with territories beyond Alaska/Hawaii.
    requiresCustomFit: true,
    customFit: {
      defaultScale: 1070, // D3's default scale for geoAlbersUsa
      referenceWidth: 960,
    },
  },
}

/**
 * Albers USA Composite - From d3-composite-projections
 * Alternative implementation with additional features
 */
export const ALBERS_USA_COMPOSITE: ProjectionDefinition = {
  id: 'albers-usa-composite',
  name: 'projections.albersUsaComposite.name',
  description: 'projections.albersUsaComposite.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'americas' },
      { territoryType: 'overseas', region: 'americas' },
      { territoryType: 'overseas', region: 'oceania' },
    ],
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

/**
 * Albers USA Territories - Extended version with US territories
 * Includes Puerto Rico, US Virgin Islands, Guam, American Samoa, Northern Mariana Islands
 */
export const ALBERS_USA_TERRITORIES: ProjectionDefinition = {
  id: 'albers-usa-territories',
  name: 'projections.albersUsaTerritories.name',
  description: 'projections.albersUsaTerritories.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'americas' },
      { territoryType: 'overseas', region: 'americas' },
      { territoryType: 'overseas', region: 'oceania' },
    ],
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

/**
 * Conic Conformal Netherlands - Composite projection for Netherlands
 * Optimized for Netherlands mainland and Caribbean territories
 */
export const CONIC_CONFORMAL_NETHERLANDS: ProjectionDefinition = {
  id: 'conic-conformal-netherlands',
  name: 'projections.conicConformalNetherlands.name',
  description: 'projections.conicConformalNetherlands.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'europe' },
      { territoryType: 'overseas', region: 'americas' },
    ],
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

/**
 * Conic Equidistant Japan - Composite projection for Japan
 * Optimized for Japan's main islands including Hokkaido and Okinawa
 */
export const CONIC_EQUIDISTANT_JAPAN: ProjectionDefinition = {
  id: 'conic-equidistant-japan',
  name: 'projections.conicEquidistantJapan.name',
  description: 'projections.conicEquidistantJapan.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['distance'],
    distorts: ['area', 'angle'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'asia' },
      { territoryType: 'archipelago', region: 'asia' },
    ],
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

/**
 * Mercator Ecuador - Composite projection for Ecuador
 * Optimized for Ecuador mainland and Galápagos Islands
 */
export const MERCATOR_ECUADOR: ProjectionDefinition = {
  id: 'mercator-ecuador',
  name: 'projections.mercatorEcuador.name',
  description: 'projections.mercatorEcuador.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'americas' },
      { territoryType: 'archipelago', region: 'americas' },
    ],
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

/**
 * Transverse Mercator Chile - Composite projection for Chile
 * Optimized for Chile's long mainland, Easter Island, and Juan Fernández
 */
export const TRANSVERSE_MERCATOR_CHILE: ProjectionDefinition = {
  id: 'transverse-mercator-chile',
  name: 'projections.transverseMercatorChile.name',
  description: 'projections.transverseMercatorChile.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'americas' },
      { territoryType: 'overseas', region: 'americas' },
      { territoryType: 'overseas', region: 'oceania' },
    ],
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

/**
 * Mercator Malaysia - Composite projection for Malaysia
 * Optimized for Peninsular Malaysia and East Malaysia (Borneo)
 */
export const MERCATOR_MALAYSIA: ProjectionDefinition = {
  id: 'mercator-malaysia',
  name: 'projections.mercatorMalaysia.name',
  description: 'projections.mercatorMalaysia.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'asia' },
      { territoryType: 'overseas', region: 'asia' },
    ],
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

/**
 * Mercator Equatorial Guinea - Composite projection for Equatorial Guinea
 * Optimized for mainland Río Muni and Bioko island
 */
export const MERCATOR_EQUATORIAL_GUINEA: ProjectionDefinition = {
  id: 'mercator-equatorial-guinea',
  name: 'projections.mercatorEquatorialGuinea.name',
  description: 'projections.mercatorEquatorialGuinea.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'africa' },
      { territoryType: 'overseas', region: 'africa' },
    ],
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

/**
 * Albers UK - Composite projection for United Kingdom
 * Optimized for Great Britain and Shetland Islands
 */
export const ALBERS_UK: ProjectionDefinition = {
  id: 'albers-uk',
  name: 'projections.albersUk.name',
  description: 'projections.albersUk.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['area'],
    distorts: ['angle', 'distance'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'europe' },
      { territoryType: 'archipelago', region: 'europe' },
    ],
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

/**
 * Transverse Mercator Denmark - Composite projection for Denmark
 * Optimized for Jutland, Zealand, and Bornholm
 */
export const TRANSVERSE_MERCATOR_DENMARK: ProjectionDefinition = {
  id: 'transverse-mercator-denmark',
  name: 'projections.transverseMercatorDenmark.name',
  description: 'projections.transverseMercatorDenmark.description',
  category: ProjectionCategory.COMPOSITE,
  family: ProjectionFamily.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,

  capabilities: {
    preserves: ['angle'],
    distorts: ['area'],
    supportsComposite: false,
    supportsSplit: true,
    supportsUnified: true,
    isInterrupted: false,
  },

  suitability: {
    excellent: [
      { territoryType: 'mainland', region: 'europe' },
      { territoryType: 'archipelago', region: 'europe' },
    ],
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

/**
 * Array of all composite projection definitions
 */
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
