import type { AtlasId, ProjectionId, TerritoryCode } from '@/types/branded'
import type { ViewMode } from '@/types/composite'
import type { ExportedCompositeConfig } from '@/types/export-config'
import type { ProjectionParameters } from '@/types/projection-parameters'

export interface LoadResult<T> {
  success: boolean
  data?: T
  errors: string[]
  warnings: string[]
}

export interface TerritoryDefaults {
  projections: Record<TerritoryCode, ProjectionId>
  translations: Record<TerritoryCode, { x: number, y: number }>
  scales: Record<TerritoryCode, number>
}

export interface AtlasProjectionMetadata {
  compositeProjections?: string[]
  defaultCompositeProjection?: string
  projectionPreferences?: {
    recommended?: string[]
    prohibited?: string[]
  }
  projectionParameters?: {
    center?: { longitude: number, latitude: number }
    rotate?: {
      conic?: [number, number]
      azimuthal?: [number, number]
    }
    parallels?: { conic?: [number, number] }
  }
}

export interface BasePresetMetadata {
  id: string
  name: string
  description?: string
  atlasId: AtlasId
}

export type ViewPresetMode = Extract<ViewMode, 'unified' | 'split' | 'built-in-composite'>

export type PresetType = 'composite-custom' | ViewPresetMode

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

export interface CompositeCustomConfig extends ExportedCompositeConfig {
  atlasMetadata?: AtlasProjectionMetadata
}

export interface CompositePreset extends BasePresetMetadata {
  type: 'composite-custom'
  config: CompositeCustomConfig
}

export interface UnifiedPreset extends BasePresetMetadata {
  type: 'unified'
  config: UnifiedViewConfig
}

export interface SplitPreset extends BasePresetMetadata {
  type: 'split'
  config: SplitViewConfig
}

export interface CompositeExistingPreset extends BasePresetMetadata {
  type: 'built-in-composite'
  config: CompositeExistingViewConfig
}

export type Preset
  = | CompositePreset
    | UnifiedPreset
    | SplitPreset
    | CompositeExistingPreset
