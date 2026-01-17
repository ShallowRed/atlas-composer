/**
 * Projection System Type Definitions
 *
 * Domain: Projection metadata and capabilities
 * Scope: Projection registry, D3 projection functions
 *
 * This module defines the metadata structure for map projections,
 * including their properties and capabilities.
 *
 * Note: For atlas layout and territory composition types,
 * see src/types/composite.d.ts
 */

import type { GeoProjection } from 'd3-geo'
import type { ProjectionParameters } from '@/types/projection-parameters'

/**
 * Projection capabilities - what the projection preserves or distorts
 */
export interface ProjectionCapabilities {
  /** Properties this projection preserves exactly */
  preserves: Array<'area' | 'angle' | 'distance' | 'direction'>
  /** Properties this projection distorts */
  distorts?: Array<'area' | 'angle' | 'distance' | 'direction'>
  /** Whether this projection supports composite/multi-projection mode */
  supportsComposite: boolean
  /** Whether this projection can be used in split view */
  supportsSplit: boolean
  /** Whether this projection can be used in unified view */
  supportsUnified: boolean
  /** Maximum recommended scale (larger values = more suitable for larger areas) */
  recommendedMaxScale?: number
  /** Whether the projection is interrupted/discontinuous */
  isInterrupted?: boolean
}

/**
 * Re-export unified parameter types for convenience
 * These are the recommended types to use going forward
 */
export type {
  ProjectionParameters,
} from '@/types/projection-parameters'

/**
 * Projection strategy - how the projection is created
 */
export const ProjectionStrategy = {
  /** Built-in D3 projection (d3-geo) */
  D3_BUILTIN: 'D3_BUILTIN',
  /** Extended D3 projection (d3-geo-projection) */
  D3_EXTENDED: 'D3_EXTENDED',
  /** Composite projection (d3-composite-projections) */
  D3_COMPOSITE: 'D3_COMPOSITE',
} as const

export type ProjectionStrategyType = typeof ProjectionStrategy[keyof typeof ProjectionStrategy]

/**
 * Projection category for UI grouping
 */
export const ProjectionCategory = {
  /** Composite projections (main feature) */
  COMPOSITE: 'COMPOSITE',
  /** Conic projections */
  CONIC: 'CONIC',
  /** Azimuthal projections */
  AZIMUTHAL: 'AZIMUTHAL',
  /** Cylindrical projections */
  CYLINDRICAL: 'CYLINDRICAL',
  /** World projections */
  WORLD: 'WORLD',
  /** Compromise projections */
  COMPROMISE: 'COMPROMISE',
  /** Artistic/historical projections */
  ARTISTIC: 'ARTISTIC',
} as const

export type ProjectionCategoryType = typeof ProjectionCategory[keyof typeof ProjectionCategory]

/**
 * Projection family (mathematical type)
 */
export const ProjectionFamily = {
  CONIC: 'CONIC',
  AZIMUTHAL: 'AZIMUTHAL',
  CYLINDRICAL: 'CYLINDRICAL',
  PSEUDOCYLINDRICAL: 'PSEUDOCYLINDRICAL',
  POLYHEDRAL: 'POLYHEDRAL',
  COMPOSITE: 'COMPOSITE',
  OTHER: 'OTHER',
} as const

export type ProjectionFamilyType = typeof ProjectionFamily[keyof typeof ProjectionFamily]

/**
 * Complete projection definition with all metadata
 */
export interface ProjectionDefinition {
  /** Unique identifier (kebab-case) */
  id: string

  /** Display name (i18n key) */
  name: string

  /** Optional description (i18n key) */
  description?: string

  /** Category for UI grouping */
  category: ProjectionCategoryType

  /** Mathematical family */
  family: ProjectionFamilyType

  /** Implementation strategy */
  strategy: ProjectionStrategyType

  /** Projection capabilities */
  capabilities: ProjectionCapabilities

  /** Default parameters */
  defaultParameters?: ProjectionParameters

  /** Alternative names/aliases */
  aliases?: string[]

  /** Historical creator/inventor */
  creator?: string

  /** Year of creation */
  year?: number

  /** Additional metadata */
  metadata?: {
    /** Official EPSG code if applicable */
    epsgCode?: string
    /** Link to more information */
    infoUrl?: string
    /** Whether this is experimental */
    experimental?: boolean
    /** Whether this projection requires custom fitting (no domain) */
    requiresCustomFit?: boolean
    /** Custom fit parameters for projections that need manual scaling */
    customFit?: {
      /** Default scale value */
      defaultScale: number
      /** Reference width for the default scale */
      referenceWidth: number
    }
  }
}

/**
 * Context for filtering projections
 */
export interface ProjectionFilterContext {
  /** Current atlas ID */
  atlasId?: string

  /** Current view mode */
  viewMode?: 'split' | 'composite-custom' | 'built-in-composite' | 'unified'

  /** Required capabilities */
  requiredCapabilities?: Partial<ProjectionCapabilities>

  /** Excluded categories */
  excludeCategories?: ProjectionCategoryType[]

  /** Only show recommended projections */
  recommendedOnly?: boolean
}

/**
 * Projection recommendation with score
 */
export interface ProjectionRecommendation {
  /** Projection definition */
  projection: ProjectionDefinition

  /** Recommendation score (0-100) */
  score: number

  /** Recommendation level */
  level: 'excellent' | 'good' | 'usable' | 'not-recommended'

  /** Reason for recommendation (i18n key) */
  reason: string

  /** Suggested parameters for this context */
  suggestedParameters?: ProjectionParameters
}

/**
 * Type for D3 projection creation function
 */
export type D3ProjectionFunction = () => GeoProjection

/**
 * Options for creating a projection instance
 */
export interface CreateProjectionOptions {
  /** Projection ID or definition */
  projection: string | ProjectionDefinition

  /** Override default parameters */
  parameters?: ProjectionParameters

  /** Territory-specific configuration */
  territory?: {
    id: string
    bounds?: [[number, number], [number, number]]
  }
}
