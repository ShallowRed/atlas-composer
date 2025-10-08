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
    avoidForAtlases: ['portugal', 'eu'],
  },

  defaultParameters: {
    // Parameters are handled by d3-composite-projections
    center: [2.5, 46.5], // Approximate center of France
  },

  aliases: ['france-composite', 'composite-france'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
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
    avoidForAtlases: ['france', 'eu'],
  },

  defaultParameters: {
    center: [-8, 39.5], // Approximate center of Portugal
  },

  aliases: ['portugal-composite', 'composite-portugal'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
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
    avoidForAtlases: ['france', 'portugal'],
  },

  defaultParameters: {
    center: [10, 50], // Approximate center of Europe
  },

  aliases: ['europe-composite', 'composite-europe', 'eu-composite', 'composite-eu'],

  metadata: {
    infoUrl: 'https://github.com/rveciana/d3-composite-projections',
    experimental: false,
  },
}

/**
 * Array of all composite projection definitions
 */
export const COMPOSITE_PROJECTIONS: ProjectionDefinition[] = [
  CONIC_CONFORMAL_FRANCE,
  CONIC_CONFORMAL_PORTUGAL,
  CONIC_CONFORMAL_EUROPE,
]
