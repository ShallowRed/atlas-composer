import type { I18nValue } from '#types'
import type { ProjectionId } from '@/types/branded'
import type { CompositeTerritories } from '@/types/composite'
import type { GeoDataConfig } from '@/types/geo-data'

interface SplitModeConfig {
  territoriesTitle: string
}

interface TerritoryModeOption {
  value: string
  label: I18nValue
}

type AtlasCategory = 'country' | 'region' | 'world'

interface ProjectionPreferences {
  defaultCompositeProjection?: ProjectionId
  recommended?: ProjectionId[]
}

export interface AtlasConfig {
  id: string
  name: I18nValue
  category?: AtlasCategory
  geoDataConfig: GeoDataConfig
  projectionPreferences?: ProjectionPreferences
  splitModeConfig?: SplitModeConfig
  territoryModeOptions?: TerritoryModeOption[]
  defaultPreset?: string
  compositeTerritories?: CompositeTerritories
  hasTerritorySelector?: boolean
  isWildcard?: boolean
}
