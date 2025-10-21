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

  /** Relative path to the preset JSON configuration file */
  configPath: string

  /** Pattern for composite presets (e.g., 'single-focus', 'equal-members') */
  pattern?: string

  /** Number of territories for composite presets */
  territoryCount?: number

  /** Description of the preset (i18n support) */
  description?: I18nValue
}

/**
 * Preset definition with resolved i18n values
 * Used for UI display after locale resolution
 */
export interface ResolvedPresetDefinition extends Omit<PresetDefinition, 'name' | 'description'> {
  /** Display name (resolved to current locale) */
  name: string

  /** Description (resolved to current locale) */
  description?: string
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
export interface AtlasCollectionSetConfig {
  /** Territory manager component configuration */
  territoryManager?: TerritoryManagerUIConfig

  /** Configuration section component settings */
  configSection?: ConfigSectionUIConfig
}

/**
 * Application behavior configuration for an atlas
 *
 * Defines how the application should behave with this atlas,
 * including UI preferences and collection set configuration.
 * This is separate from the atlas data structure itself.
 */
export interface AtlasRegistryBehavior {
  /** Collection set configuration for different UI contexts */
  collectionSets?: AtlasCollectionSetConfig[]
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
  /** Atlas group definitions */
  groups: AtlasRegistryGroup[]

  /** List of available atlases */
  atlases: AtlasRegistryEntry[]
}
