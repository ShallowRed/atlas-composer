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

export interface AtlasConfig {
  id: string
  name: string
  category?: AtlasCategory
  geoDataConfig: GeoDataConfig
  splitModeConfig?: SplitModeConfig
  territoryModeOptions?: TerritoryModeOption[]
  defaultPreset?: string
  compositeProjectionConfig?: CompositeProjectionConfig
  hasTerritorySelector?: boolean
  isWildcard?: boolean
}
