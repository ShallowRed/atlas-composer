/**
 * Preset Catalog
 *
 * Registry of all available presets with metadata.
 */

import type { PresetCatalog, PresetMetadata } from './types.js'

/**
 * Complete preset catalog.
 */
export const catalog: PresetCatalog = {
  version: '1.0.0',
  lastUpdated: '2026-01-17',
  presets: {
    // ==========================================================================
    // France Presets
    // ==========================================================================
    'france-standard': {
      id: 'france-standard',
      name: 'France Standard',
      description: 'Standard composite projection for France with overseas territories',
      atlasId: 'france',
      type: 'composite-custom',
      region: 'france',
      tags: ['default', 'conic-conformal'],
    },
    'france-proportional': {
      id: 'france-proportional',
      name: 'France Proportional',
      description: 'France with d3-composite-projections proportional layout',
      atlasId: 'france',
      type: 'composite-custom',
      region: 'france',
      tags: ['proportional', 'd3cp-style'],
    },
    'france-pseudo-d3cp': {
      id: 'france-pseudo-d3cp',
      name: 'France Pseudo D3CP',
      description: 'France layout mimicking d3-composite-projections style',
      atlasId: 'france',
      type: 'composite-custom',
      region: 'france',
      tags: ['d3cp-style'],
    },
    'france-builtin-d3cp': {
      id: 'france-builtin-d3cp',
      name: 'France Built-in (D3CP)',
      description: 'France using d3-composite-projections library',
      atlasId: 'france',
      type: 'built-in-composite',
      region: 'france',
      tags: ['d3-composite-projections'],
    },
    'france-split': {
      id: 'france-split',
      name: 'France Split',
      description: 'France territories displayed separately',
      atlasId: 'france',
      type: 'split',
      region: 'france',
      tags: ['split-view'],
    },
    'france-unified': {
      id: 'france-unified',
      name: 'France Unified',
      description: 'France territories in single world projection',
      atlasId: 'france',
      type: 'unified',
      region: 'france',
      tags: ['world-view'],
    },

    // ==========================================================================
    // Portugal Presets
    // ==========================================================================
    'portugal-standard': {
      id: 'portugal-standard',
      name: 'Portugal Standard',
      description: 'Standard composite projection for Portugal with Azores and Madeira',
      atlasId: 'portugal',
      type: 'composite-custom',
      region: 'portugal',
      tags: ['default', 'conic-conformal'],
    },
    'portugal-builtin': {
      id: 'portugal-builtin',
      name: 'Portugal Built-in',
      description: 'Portugal using d3-composite-projections library',
      atlasId: 'portugal',
      type: 'built-in-composite',
      region: 'portugal',
      tags: ['d3-composite-projections'],
    },
    'portugal-split': {
      id: 'portugal-split',
      name: 'Portugal Split',
      description: 'Portugal territories displayed separately',
      atlasId: 'portugal',
      type: 'split',
      region: 'portugal',
      tags: ['split-view'],
    },
    'portugal-unified': {
      id: 'portugal-unified',
      name: 'Portugal Unified',
      description: 'Portugal territories in single projection',
      atlasId: 'portugal',
      type: 'unified',
      region: 'portugal',
      tags: ['world-view'],
    },

    // ==========================================================================
    // USA Presets
    // ==========================================================================
    'usa-albers': {
      id: 'usa-albers',
      name: 'USA Albers',
      description: 'USA with Albers equal-area projection (Alaska and Hawaii inset)',
      atlasId: 'usa',
      type: 'built-in-composite',
      region: 'usa',
      tags: ['default', 'albers', 'd3-builtin'],
    },
    'usa-pseudo-d3cp': {
      id: 'usa-pseudo-d3cp',
      name: 'USA Pseudo D3CP',
      description: 'USA layout mimicking d3-composite-projections style',
      atlasId: 'usa',
      type: 'composite-custom',
      region: 'usa',
      tags: ['d3cp-style'],
    },
    'usa-builtin-d3cp': {
      id: 'usa-builtin-d3cp',
      name: 'USA Built-in (D3CP)',
      description: 'USA using d3-composite-projections library',
      atlasId: 'usa',
      type: 'built-in-composite',
      region: 'usa',
      tags: ['d3-composite-projections'],
    },
    'usa-builtin-territories': {
      id: 'usa-builtin-territories',
      name: 'USA with Territories',
      description: 'USA including territories (Puerto Rico, Guam, etc.)',
      atlasId: 'usa',
      type: 'built-in-composite',
      region: 'usa',
      tags: ['d3-composite-projections', 'territories'],
    },
    'usa-split': {
      id: 'usa-split',
      name: 'USA Split',
      description: 'USA states displayed separately',
      atlasId: 'usa',
      type: 'split',
      region: 'usa',
      tags: ['split-view'],
    },
    'usa-unified': {
      id: 'usa-unified',
      name: 'USA Unified',
      description: 'USA in single projection',
      atlasId: 'usa',
      type: 'unified',
      region: 'usa',
      tags: ['world-view'],
    },

    // ==========================================================================
    // Europe Presets
    // ==========================================================================
    'europe-builtin': {
      id: 'europe-builtin',
      name: 'Europe Built-in',
      description: 'Europe using d3-composite-projections library',
      atlasId: 'europe',
      type: 'built-in-composite',
      region: 'europe',
      tags: ['d3-composite-projections', 'default'],
    },
    'europe-split': {
      id: 'europe-split',
      name: 'Europe Split',
      description: 'European countries displayed separately',
      atlasId: 'europe',
      type: 'split',
      region: 'europe',
      tags: ['split-view'],
    },
    'europe-unified': {
      id: 'europe-unified',
      name: 'Europe Unified',
      description: 'Europe in single projection',
      atlasId: 'europe',
      type: 'unified',
      region: 'europe',
      tags: ['world-view'],
    },

    // ==========================================================================
    // World Presets
    // ==========================================================================
    'world-unified': {
      id: 'world-unified',
      name: 'World Unified',
      description: 'World map with Natural Earth projection',
      atlasId: 'world',
      type: 'unified',
      region: 'world',
      tags: ['default', 'natural-earth'],
    },
  },
}

export function getAllPresets(): PresetMetadata[] {
  return Object.values(catalog.presets)
}

export function getPresetMetadata(id: string): PresetMetadata | undefined {
  return catalog.presets[id]
}
