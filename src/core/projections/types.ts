import type { GeoProjection } from 'd3-geo'
import type { ProjectionParameters } from '@/types/projection-parameters'

export interface ProjectionCapabilities {
  preserves: Array<'area' | 'angle' | 'distance' | 'direction'>
  distorts?: Array<'area' | 'angle' | 'distance' | 'direction'>
  supportsComposite: boolean
  supportsSplit: boolean
  supportsUnified: boolean
  recommendedMaxScale?: number
  isInterrupted?: boolean
}

export type {
  ProjectionParameters,
} from '@/types/projection-parameters'

export const ProjectionStrategy = {
  D3_BUILTIN: 'D3_BUILTIN',
  D3_EXTENDED: 'D3_EXTENDED',
  D3_COMPOSITE: 'D3_COMPOSITE',
} as const

export type ProjectionStrategyType = typeof ProjectionStrategy[keyof typeof ProjectionStrategy]

export const ProjectionCategory = {
  COMPOSITE: 'COMPOSITE',
  CONIC: 'CONIC',
  AZIMUTHAL: 'AZIMUTHAL',
  CYLINDRICAL: 'CYLINDRICAL',
  WORLD: 'WORLD',
  COMPROMISE: 'COMPROMISE',
  ARTISTIC: 'ARTISTIC',
} as const

export type ProjectionCategoryType = typeof ProjectionCategory[keyof typeof ProjectionCategory]

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

export interface ProjectionDefinition {
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
