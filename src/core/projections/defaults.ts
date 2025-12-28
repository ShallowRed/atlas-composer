/**
 * Atlas Projection Defaults
 *
 * Centralized fallback projection preferences for atlases.
 * Used when preset metadata is not available.
 *
 * These defaults are intentionally kept minimal - actual preferences
 * should be defined in preset files (atlasMetadata.projectionPreferences).
 */

import type { ProjectionPreferences } from '@/core/atlases/loader'

/**
 * Default projection preferences by atlas ID
 *
 * Used as fallback when:
 * - Atlas has no presets defined
 * - Preset metadata doesn't include projectionPreferences
 * - Synchronous access is needed before async preset loads
 */
export const ATLAS_PROJECTION_DEFAULTS: Record<string, ProjectionPreferences> = {
  world: {
    recommended: ['natural-earth', 'robinson'],
    prohibited: [],
  },
  france: {
    recommended: ['conic-conformal-france'],
    prohibited: [],
  },
  spain: {
    recommended: ['conic-conformal-spain'],
    prohibited: [],
  },
  portugal: {
    recommended: ['conic-conformal-portugal'],
    prohibited: [],
  },
  usa: {
    recommended: ['albers-usa', 'albers-usa-composite'],
    prohibited: [],
  },
  europe: {
    recommended: ['conic-conformal-europe'],
    prohibited: [],
  },
}

/**
 * Get default projection preferences for an atlas
 *
 * @param atlasId - Atlas identifier
 * @returns Projection preferences with recommended and prohibited lists
 */
export function getDefaultProjectionPreferences(atlasId: string): ProjectionPreferences {
  // Check for explicit defaults
  if (atlasId in ATLAS_PROJECTION_DEFAULTS) {
    return ATLAS_PROJECTION_DEFAULTS[atlasId]!
  }

  // Generate default based on atlas ID pattern
  return {
    recommended: [`conic-conformal-${atlasId}`],
    prohibited: [],
  }
}

/**
 * Get default composite projections for an atlas
 *
 * @param atlasId - Atlas identifier
 * @returns Array of default composite projection IDs
 */
export function getDefaultCompositeProjections(atlasId: string): string[] {
  const prefs = getDefaultProjectionPreferences(atlasId)
  return prefs.recommended ?? [`conic-conformal-${atlasId}`]
}
