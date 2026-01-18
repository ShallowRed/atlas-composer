/**
 * Centralized fallback projection preferences for atlases.
 * Used when preset metadata is not available.
 */

import type { ProjectionPreferences } from '@/core/atlases/loader'

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

export function getDefaultProjectionPreferences(atlasId: string): ProjectionPreferences {
  if (atlasId in ATLAS_PROJECTION_DEFAULTS) {
    return ATLAS_PROJECTION_DEFAULTS[atlasId]!
  }

  return {
    recommended: [`conic-conformal-${atlasId}`],
    prohibited: [],
  }
}

export function getDefaultCompositeProjections(atlasId: string): string[] {
  const prefs = getDefaultProjectionPreferences(atlasId)
  return prefs.recommended ?? [`conic-conformal-${atlasId}`]
}
