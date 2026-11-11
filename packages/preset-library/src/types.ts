import type { CompositeProjectionConfig } from '@atlas-composer/specification'

export const PRESET_TYPES = ['composite-custom', 'built-in-composite', 'split', 'unified'] as const

export type PresetType = typeof PRESET_TYPES[number]

export type PresetRegion = string

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

export interface AtlasMetadata {
  id: string
  name: string
  group: string
  /** Path of the atlas configuration in the package, such as `atlases/france.json` */
  path: string
}

export interface PresetCatalog {
  version: string
  atlases: Record<string, AtlasMetadata>
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
