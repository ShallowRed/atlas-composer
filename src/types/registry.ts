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
 * Application behavior configuration for an atlas
 *
 * Defines how the application should behave with this atlas,
 * including UI preferences and collection set configuration.
 * This is separate from the atlas data structure itself.
 */
export interface AtlasRegistryBehavior {
  /**
   * Maps UI component locations to territory collection set keys
   *
   * Keys identify where in the UI a collection set is used:
   * - "territoryManager": TerritorySetManager component (composite-custom mode)
   *   Controls which territories can be selected for the custom composite
   *
   * - "territoryScope": Territory dropdown in AtlasConfigSection (split/unified modes)
   *   Controls which territories are included in the view (filtering)
   *
   * - "territoryGroups": Visual grouping in SplitView (split/unified modes)
   *   Controls how territories are organized visually into groups
   *
   * Values are keys from the atlas's territoryCollections configuration
   *
   * Example:
   * {
   *   "territoryManager": "legal-status",
   *   "territoryScope": "incremental",
   *   "territoryGroups": "geographic"
   * }
   */
  collectionSets?: Record<string, string>
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
