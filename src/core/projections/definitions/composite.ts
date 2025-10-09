/**
 * Composite Projection Definitions
 *
 * These are the main composite projections that combine multiple projections
 * to create optimal representations of countries with geographically-scattered territories.
 * This is the core feature of Atlas Composer.
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
    recommendedForAtlases: ['france'],
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
      defaultScale: 3000,
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
    recommendedForAtlases: ['portugal'],
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
    recommendedForAtlases: ['eu'],
  },

  defaultParameters: {
    center: [10, 50], // Approximate center of Europe
  },

  aliases: ['europe-composite', 'composite-europe', 'eu-composite', 'composite-eu'],

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
    recommendedForAtlases: ['usa'],
  },

  defaultParameters: {
    // Parameters are handled by d3-geo albersUsa
    center: [-98.5, 39.8], // Approximate center of contiguous USA
  },

  aliases: ['usa-composite', 'composite-usa', 'albers-us', 'albersUsa', 'conic-conformal-usa'],

  metadata: {
    infoUrl: 'https://d3js.org/d3-geo/conic#geoAlbersUsa',
    experimental: false,
    requiresCustomFit: true, // geoAlbersUsa has fixed positioning and needs manual scaling
    customFit: {
      defaultScale: 1070, // D3's default scale for geoAlbersUsa
      referenceWidth: 960, // Reference width for the default scale
    },
  },
}

/**
 * Array of all composite projection definitions
 */
export const COMPOSITE_PROJECTIONS: ProjectionDefinition[] = [
  CONIC_CONFORMAL_FRANCE,
  CONIC_CONFORMAL_PORTUGAL,
  CONIC_CONFORMAL_EUROPE,
  ALBERS_USA,
]
