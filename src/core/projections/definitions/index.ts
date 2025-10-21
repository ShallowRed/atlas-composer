/**
 * Projection Definitions Index
 *
 * Central export point for all projection definitions.
 * Import from here to access any projection definition.
 */

import { ARTISTIC_PROJECTIONS } from '@/core/projections/definitions/artistic'
import { AZIMUTHAL_PROJECTIONS } from '@/core/projections/definitions/azimuthal'
import { COMPOSITE_PROJECTIONS } from '@/core/projections/definitions/composite'
import { COMPROMISE_PROJECTIONS } from '@/core/projections/definitions/compromise'
import { CONIC_PROJECTIONS } from '@/core/projections/definitions/conic'
import { CYLINDRICAL_PROJECTIONS } from '@/core/projections/definitions/cylindrical'
import { WORLD_PROJECTIONS } from '@/core/projections/definitions/world'

export * from '@/core/projections/definitions/artistic'
export * from '@/core/projections/definitions/azimuthal'
export * from '@/core/projections/definitions/composite'
export * from '@/core/projections/definitions/compromise'
export * from '@/core/projections/definitions/conic'
export * from '@/core/projections/definitions/cylindrical'
export * from '@/core/projections/definitions/world'

/**
 * All projection definitions combined
 */
export const ALL_PROJECTIONS = [
  ...COMPOSITE_PROJECTIONS,
  ...CONIC_PROJECTIONS,
  ...CYLINDRICAL_PROJECTIONS,
  ...AZIMUTHAL_PROJECTIONS,
  ...WORLD_PROJECTIONS,
  ...COMPROMISE_PROJECTIONS,
  ...ARTISTIC_PROJECTIONS,
]
