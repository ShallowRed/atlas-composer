import type { CompositeProjectionConfig } from '@atlas-composer/specification'

export type PresetType = 'composite-custom' | 'built-in-composite' | 'split' | 'unified'

export type PresetRegion = 'france' | 'portugal' | 'usa' | 'europe' | 'world'

export interface PresetMetadata {
  id: string
  name: string
  description?: string
  atlasId: string
  type: PresetType
  region: PresetRegion
  tags?: string[]
  thumbnail?: string
}

export interface PresetEntry extends PresetMetadata {
  config?: CompositeProjectionConfig
}

export interface PresetCatalog {
  version: string
  lastUpdated: string
  presets: Record<string, PresetMetadata>
}

export interface PresetFilterOptions {
  atlasId?: string
  type?: PresetType
  region?: PresetRegion
  tags?: string[]
  /**
   * Include view mode presets (unified, split, built-in-composite).
   * By default, only composite-custom presets are returned.
   * View mode presets are designed for the Atlas Composer web app.
   * @default false
   */
  includeViewModes?: boolean
}
