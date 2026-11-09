import type { ProjectionId } from '@/types/branded'
import type { CompositeProjectionConfig } from '@/types/composite'
import type { GeoDataConfig } from '@/types/geo-data'

interface SplitModeConfig {
  territoriesTitle: string
}

interface TerritoryModeOption {
  value: string
  label: string
}

type AtlasCategory = 'country' | 'region' | 'world'

interface ProjectionPreferences {
  defaultCompositeProjection?: ProjectionId
  recommended?: ProjectionId[]
}

export interface AtlasConfig {
  id: string
  name: string
  category?: AtlasCategory
  geoDataConfig: GeoDataConfig
  projectionPreferences?: ProjectionPreferences
  splitModeConfig?: SplitModeConfig
  territoryModeOptions?: TerritoryModeOption[]
  defaultPreset?: string
  compositeProjectionConfig?: CompositeProjectionConfig
  hasTerritorySelector?: boolean
  isWildcard?: boolean
}
