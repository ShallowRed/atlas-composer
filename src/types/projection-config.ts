/**
 * Projection Configuration Types
 *
 * Unified projection configuration types used across the application.
 * These types provide a common structure for projection definitions
 * in both composite and view mode presets.
 */

import type { ProjectionParameters } from './projection-parameters'

/**
 * Standard projection configuration
 * Used consistently across preset systems, export format, and UI
 */
export interface ProjectionConfig {
  /** Projection identifier from registry (e.g., 'conic-conformal', 'mercator', 'natural-earth') */
  id: string

  /** Projection family (e.g., 'CONIC', 'CYLINDRICAL', 'AZIMUTHAL', 'PSEUDOCYLINDRICAL') */
  family?: string

  /** D3 projection parameters */
  parameters: ProjectionParameters
}

/**
 * Projection configuration with required family
 * Used in export format where family must be explicitly specified
 */
export interface ProjectionConfigWithFamily extends ProjectionConfig {
  family: string
}
