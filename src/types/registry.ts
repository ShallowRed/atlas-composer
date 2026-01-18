import type { I18nValue } from '../../types/atlas-config'

export type PresetType = 'composite-custom' | 'unified' | 'split' | 'built-in-composite'

export interface PresetDefinition {
  id: string
  name: I18nValue
  type: PresetType
  isDefault?: boolean
  configPath: string
  description?: I18nValue
}

export interface ResolvedPresetDefinition extends Omit<PresetDefinition, 'name' | 'description'> {
  name: string
  description?: string
}

export interface AtlasRegistryBehavior {
  collectionSets?: Record<string, string>
}

export interface AtlasRegistryGroup {
  id: string
  label: I18nValue
  sortOrder: number
}

export interface AtlasRegistryEntry {
  id: string
  name: I18nValue
  group: string
  sortOrder: number
  isDefault?: boolean
  configPath: string
  presets?: PresetDefinition[]
  behavior?: AtlasRegistryBehavior
}

export interface AtlasRegistry {
  groups: AtlasRegistryGroup[]
  atlases: AtlasRegistryEntry[]
}
