import type { ProjectionFamily as SpecificationProjectionFamily } from '@atlas-composer/specification'
import type { GeoProjection } from 'd3-geo'
import type { ProjectionParameters } from '@/types/projection-parameters'

interface ProjectionCapabilities {
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

export type ProjectionFamilyType = SpecificationProjectionFamily

export const ProjectionFamily = {
  CONIC: 'CONIC',
  AZIMUTHAL: 'AZIMUTHAL',
  CYLINDRICAL: 'CYLINDRICAL',
  PSEUDOCYLINDRICAL: 'PSEUDOCYLINDRICAL',
  POLYCONIC: 'POLYCONIC',
  POLYHEDRAL: 'POLYHEDRAL',
  MISCELLANEOUS: 'MISCELLANEOUS',
} as const satisfies { [F in ProjectionFamilyType]: F }

export interface ProjectionDefinition {
  id: string
  name: string
  description?: string
  category: ProjectionCategoryType
  family: ProjectionFamilyType
  strategy: ProjectionStrategyType
  create: () => GeoProjection
  capabilities: ProjectionCapabilities
  defaultParameters?: ProjectionParameters
  aliases?: string[]
  creator?: string
  year?: number
  metadata?: {
    epsgCode?: string
    infoUrl?: string
    experimental?: boolean
    requiresCustomFit?: boolean
    customFit?: {
      defaultScale: number
      referenceWidth: number
    }
  }
}

export interface ProjectionFilterContext {
  recommended?: readonly string[]
  viewMode?: 'split' | 'composite-custom' | 'built-in-composite' | 'unified'
  requiredCapabilities?: Partial<ProjectionCapabilities>
  excludeCategories?: ProjectionCategoryType[]
}

export interface ProjectionRecommendation {
  projection: ProjectionDefinition
  score: number
  level: 'excellent' | 'good' | 'usable' | 'not-recommended'
  suggestedParameters?: ProjectionParameters
}

export interface CreateProjectionOptions {
  projection: string | ProjectionDefinition
  parameters?: ProjectionParameters
  territory?: {
    id: string
    bounds?: [[number, number], [number, number]]
  }
}
