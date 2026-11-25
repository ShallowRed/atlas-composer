import type { CanvasDimensions } from '@atlas-composer/specification'
import type { ProjectionId } from '@/types/branded'

export const DEFAULT_CANVAS_DIMENSIONS: CanvasDimensions = { width: 960, height: 500 }

export const FALLBACK_PROJECTION_ID = 'mercator' as ProjectionId

// The projection that a proposed composition gives a territory, by the reason of its shape and latitude
export const PROPOSED_PROJECTION_IDS = {
  polar: 'azimuthal-equal-area' as ProjectionId,
  northSouth: 'transverse-mercator' as ProjectionId,
  equatorial: 'mercator' as ProjectionId,
  eastWest: 'conic-conformal' as ProjectionId,
  midLatitude: 'conic-conformal' as ProjectionId,
} as const satisfies Record<string, ProjectionId>

export type ProjectionReason = keyof typeof PROPOSED_PROJECTION_IDS
