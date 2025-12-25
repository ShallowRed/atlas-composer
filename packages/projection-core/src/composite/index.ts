/**
 * Composite Builder
 *
 * Factory function for building composite projections from sub-projection entries.
 * The composite projection routes geographic points to the appropriate sub-projection
 * based on territory bounds and multiplexes geometry rendering to all territories.
 */

export { buildCompositeProjection } from './builder'
