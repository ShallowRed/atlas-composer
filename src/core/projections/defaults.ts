import type { CanvasDimensions } from '@atlas-composer/specification'
import type { ProjectionId } from '@/types/branded'

export const DEFAULT_CANVAS_DIMENSIONS: CanvasDimensions = { width: 960, height: 500 }

export const FALLBACK_PROJECTION_ID = 'mercator' as ProjectionId
