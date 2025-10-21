/**
 * Atlas Registry Type Definitions
 *
 * Domain: Registry and behavior configuration
 * Scope: Application-level configuration for atlases
 *
 * These types represent the registry configuration that defines
 * application behavior for each atlas, separate from atlas data structure.
 */

import type { I18nValue } from '../../types/atlas-config'

/**
 * Preset type discriminator
 */
export type PresetType = 'composite-custom' | 'unified' | 'split' | 'built-in-composite'

/**
 * Preset definition in atlas registry
 * Replaces the old PresetRegistryEntry from core/presets/types.ts
 */
export interface PresetDefinition {
  /** Unique preset identifier (e.g., 'france-default') */
  id: string

  /** Display name for the preset (i18n support) */
  name: I18nValue

  /** Preset type discriminator */
  type: PresetType

  /** Whether this is the default preset for the atlas */
  isDefault?: boolean

  /** Pattern for composite presets (e.g., 'single-focus', 'equal-members') */
  pattern?: string

  /** Number of territories for composite presets */
  territoryCount?: number

  /** Description of the preset (i18n support) */
  description?: I18nValue
}

/**
 * UI configuration for the territory manager component
 */
export interface TerritoryManagerUIConfig {
  /** Which territory collection set to display (key from atlas's territoryCollections) */
  collectionSet?: string

  /** Whether to show collection labels in UI */
  showLabels?: boolean

  /** Layout strategy for territory groups */
  groupLayout?: 'stacked' | 'inline' | 'grid'
}

/**
 * UI configuration for the configuration section component
 */
export interface ConfigSectionUIConfig {
  /** Which territory collection set to use for configuration */
  collectionSet?: string
}

/**
 * UI-specific configuration for atlas behavior
 */
export interface AtlasUIBehavior {
  /** Territory manager component configuration */
  territoryManager?: TerritoryManagerUIConfig

  /** Configuration section component settings */
  configSection?: ConfigSectionUIConfig
}

/**
 * Application behavior configuration for an atlas
 *
 * Defines how the application should behave with this atlas,
 * including defaults, available options, and UI preferences.
 * This is separate from the atlas data structure itself.
 */
export interface AtlasRegistryBehavior {
  /**
   * @deprecated Use isDefault flag in PresetDefinition instead
   * Default preset to load for this atlas
   */
  defaultPreset?: string

  /**
   * @deprecated All presets in atlas.presets array are available
   * List of available presets for this atlas
   */
  availablePresets?: string[]

  /** Collection set configuration for different UI contexts */
  collectionSets?: AtlasUIBehavior
}

/**
 * Atlas group definition in registry
 */
export interface AtlasRegistryGroup {
  /** Unique group identifier */
  id: string

  /** Display label for the group */
  label: I18nValue

  /** Display order of groups */
  sortOrder: number
}

/**
 * Atlas entry in the registry
 */
export interface AtlasRegistryEntry {
  /** Unique atlas identifier */
  id: string

  /** Display name for the atlas */
  name: I18nValue

  /** Category for grouping atlases in UI */
  group: string

  /** Order within group */
  sortOrder: number

  /** Whether this is the default atlas to load on startup */
  isDefault?: boolean

  /** Relative path to the atlas JSON configuration file */
  configPath: string

  /** Available presets for this atlas */
  presets?: PresetDefinition[]

  /** Application behavior configuration for this atlas */
  behavior?: AtlasRegistryBehavior
}

/**
 * Complete atlas registry configuration
 */
export interface AtlasRegistry {
  /**
   * @deprecated Use isDefault flag in AtlasRegistryEntry instead
   * Default atlas to load on application startup
   */
  defaultAtlas?: string

  /** Atlas group definitions */
  groups: AtlasRegistryGroup[]

  /** List of available atlases */
  atlases: AtlasRegistryEntry[]
}
