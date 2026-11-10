import type { PresetType } from '#types'
import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { AtlasId } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'

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

interface CompositePreset extends BasePresetMetadata {
  type: 'composite-custom'
  config: CompositeProjectionConfig
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
