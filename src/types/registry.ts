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
  /** Default preset to load for this atlas */
  defaultPreset?: string

  /** List of available presets for this atlas */
  availablePresets?: string[]

  /** Default territory collection set to use (key from atlas's territoryCollections) */
  defaultTerritoryCollection?: string

  /** UI-specific configuration */
  ui?: AtlasUIBehavior
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

  /** Relative path to the atlas JSON configuration file */
  configPath: string

  /** Application behavior configuration for this atlas */
  behavior?: AtlasRegistryBehavior
}

/**
 * Complete atlas registry configuration
 */
export interface AtlasRegistry {
  /** Default atlas to load on application startup */
  defaultAtlas: string

  /** Atlas group definitions */
  groups: AtlasRegistryGroup[]

  /** List of available atlases */
  atlases: AtlasRegistryEntry[]
}
