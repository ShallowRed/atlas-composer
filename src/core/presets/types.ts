import type { PresetType } from '#types'
import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { Translation } from '@/types'
import type { AtlasId, ProjectionId, TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'

export interface LoadResult<T> {
  success: boolean
  data?: T
  errors: string[]
  warnings: string[]
}

export interface TerritoryDefaults {
  projections: Record<TerritoryCode, ProjectionId>
  translations: Record<TerritoryCode, Translation>
  scales: Record<TerritoryCode, number>
}

export interface AtlasProjectionMetadata {
  compositeProjections?: string[]
  defaultCompositeProjection?: string
  projectionPreferences?: {
    recommended?: string[]
    prohibited?: string[]
  }
}

interface BasePresetMetadata {
  id: string
  atlasId: AtlasId
}

export type ViewPresetMode = Exclude<PresetType, 'composite-custom'>

export interface UnifiedViewConfig {
  projection: {
    id: string
    parameters: ProjectionParameters
  }
}

export interface SplitViewConfig {
  territories: Record<string, {
    projection: {
      id: string
      parameters: ProjectionParameters
    }
  }>
}

export interface CompositeExistingViewConfig {
  projectionId: string
  globalScale?: number
}

export interface CompositeCustomConfig extends CompositeProjectionConfig {
  atlasMetadata?: AtlasProjectionMetadata
}

interface CompositePreset extends BasePresetMetadata {
  type: 'composite-custom'
  config: CompositeCustomConfig
}

interface UnifiedPreset extends BasePresetMetadata {
  type: 'unified'
  config: UnifiedViewConfig
}

interface SplitPreset extends BasePresetMetadata {
  type: 'split'
  config: SplitViewConfig
}

interface CompositeExistingPreset extends BasePresetMetadata {
  type: 'built-in-composite'
  config: CompositeExistingViewConfig
}

export type Preset
  = | CompositePreset
    | UnifiedPreset
    | SplitPreset
    | CompositeExistingPreset
