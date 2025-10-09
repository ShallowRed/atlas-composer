/**
 * Projection Definitions Index
 *
 * Central export point for all projection definitions.
 * Import from here to access any projection definition.
 */

import { ARTISTIC_PROJECTIONS } from './artistic'
import { AZIMUTHAL_PROJECTIONS } from './azimuthal'
import { COMPOSITE_PROJECTIONS } from './composite'
import { COMPROMISE_PROJECTIONS } from './compromise'
import { CONIC_PROJECTIONS } from './conic'
import { CYLINDRICAL_PROJECTIONS } from './cylindrical'
import { WORLD_PROJECTIONS } from './world'

export * from './artistic'
export * from './azimuthal'
export * from './composite'
export * from './compromise'
export * from './conic'
export * from './cylindrical'
export * from './world'

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
