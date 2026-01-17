/**
 * Atlas Configuration Registry
 * Central access point for all atlas configurations with lazy loading
 *
 * This registry uses a static atlas-registry.json file to define available atlases.
 * Atlas configurations are only loaded when accessed, improving initial load time.
 */

import type { JSONAtlasConfig } from '#types'
import type { AtlasSpecificConfig, LoadedAtlasConfig } from '@/core/atlases/loader'
import type { AtlasConfig } from '@/types'
import type { AtlasId, PresetId } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'
import type { AtlasRegistry, AtlasRegistryBehavior, AtlasRegistryEntry } from '@/types/registry'
import atlasRegistryData from '#configs/atlas-registry.json'
import { resolveI18nValue } from '@/core/atlases/i18n-utils'
import { loadAtlasConfig } from '@/core/atlases/loader'
import { logger } from '@/utils/logger'

const debug = logger.atlas.loader

/**
 * Static atlas registry metadata from JSON
 */
export const REGISTRY_METADATA: AtlasRegistry = atlasRegistryData as AtlasRegistry

/**
 * Cache of loaded atlas configurations (lazy loading)
 */
const LOADED_CONFIGS: Map<string, LoadedAtlasConfig> = new Map()

/**
 * Map of atlas IDs to their config paths for lazy loading
 */
const CONFIG_PATHS: Map<string, string> = new Map(
  REGISTRY_METADATA.atlases.map(entry => [entry.id, entry.configPath]),
)

/**
 * Get the base URL for config files
 * In production, configs are in the public folder
 */
function getConfigBaseUrl(): string {
  // In Vite, import.meta.env.BASE_URL provides the base path
  const base = import.meta.env.BASE_URL || '/'
  return `${base}configs/`
}

/**
 * Load an atlas configuration on demand using fetch
 * Truly lazy - only loads the specific atlas file when called
 * @public
 */
export async function loadAtlasAsync(atlasId: AtlasId): Promise<LoadedAtlasConfig> {
  // Check cache first
  if (LOADED_CONFIGS.has(atlasId)) {
    debug('Atlas %s already loaded from cache', atlasId)
    return LOADED_CONFIGS.get(atlasId)!
  }

  // Get config path from registry
  const configPath = CONFIG_PATHS.get(atlasId)
  if (!configPath) {
    throw new Error(`[Registry] Atlas '${atlasId}' not found in registry`)
  }

  try {
    // Fetch the JSON file using the registry's configPath
    // configPath is relative (e.g., "./atlases/france.json"), so we join it with the base URL
    const relativePath = configPath.replace(/^\.\//, '') // Remove leading "./"
    const url = `${getConfigBaseUrl()}${relativePath}`
    debug('Fetching atlas %s from %s', atlasId, url)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const jsonConfig: JSONAtlasConfig = await response.json()

    // Validate that this is an atlas config (has required fields)
    if (!jsonConfig.id || !jsonConfig.territories) {
      throw new Error(`Invalid atlas config: missing required fields (id, territories)`)
    }

    // Get behavior from registry for this atlas
    const behavior = getAtlasBehavior(atlasId)

    // Load and cache the config
    const loadedConfig = loadAtlasConfig(jsonConfig, behavior)
    LOADED_CONFIGS.set(atlasId, loadedConfig)

    debug('Successfully loaded atlas %s from network', atlasId)
    return loadedConfig
  }
  catch (error) {
    throw new Error(`[Registry] Failed to load atlas '${atlasId}': ${error}`)
  }
}

/**
 * Load an atlas configuration synchronously
 * Only works if the atlas is already cached or is the default atlas (pre-loaded)
 */
function loadAtlasSync(atlasId: string): LoadedAtlasConfig {
  // Check cache first
  if (LOADED_CONFIGS.has(atlasId)) {
    return LOADED_CONFIGS.get(atlasId)!
  }

  // If not cached, this is an error - caller should use async loading
  throw new Error(
    `[Registry] Atlas '${atlasId}' not loaded yet. Use await loadAtlasAsync('${atlasId}') or switch to a cached atlas.`,
  )
}

/**
 * Get the default atlas entry from registry
 * Uses isDefault flag
 */
export function getDefaultAtlas(): AtlasRegistryEntry {
  const defaultEntry = REGISTRY_METADATA.atlases.find(e => e.isDefault)
  if (defaultEntry) {
    return defaultEntry
  }

  // Fallback: first atlas
  debug('No default atlas defined, using first atlas')
  if (REGISTRY_METADATA.atlases.length === 0) {
    throw new Error('[Registry] No atlases defined in registry')
  }
  return REGISTRY_METADATA.atlases[0]!
}

/**
 * Default atlas ID from registry
 */
export const DEFAULT_ATLAS = getDefaultAtlas().id as AtlasId

/**
 * Pre-load the default atlas into cache
 * Should be called during app initialization
 */
export async function preloadDefaultAtlas(): Promise<void> {
  if (!LOADED_CONFIGS.has(DEFAULT_ATLAS)) {
    await loadAtlasAsync(DEFAULT_ATLAS)
  }
}

/**
 * Check if an atlas is loaded in cache
 */
export function isAtlasLoaded(atlasId: string): boolean {
  return LOADED_CONFIGS.has(atlasId)
}

/**
 * Get complete loaded configuration for an atlas (synchronous)
 * Only works for atlases that are already cached
 * For loading new atlases, use loadAtlasAsync() instead
 */
export function getLoadedConfig(atlasId: string): LoadedAtlasConfig {
  try {
    // Try to load the requested atlas from cache
    return loadAtlasSync(atlasId)
  }
  catch (error) {
    // Fallback to default atlas if requested one doesn't exist in cache
    debug('Atlas %s not cached, falling back to %s: %o', atlasId, DEFAULT_ATLAS, error)
    try {
      return loadAtlasSync(DEFAULT_ATLAS)
    }
    catch {
      throw new Error(
        `[Registry] Neither '${atlasId}' nor default atlas '${DEFAULT_ATLAS}' are cached. Use await loadAtlasAsync() to load atlases.`,
      )
    }
  }
}

/**
 * Get atlas configuration (for stores and UI)
 */
export function getAtlasConfig(atlasId: string): AtlasConfig {
  const loaded = getLoadedConfig(atlasId)
  return loaded.atlasConfig
}

/**
 * Get atlas-specific configuration (projection params, modes, groups)
 */
export function getAtlasSpecificConfig(atlasId: string): AtlasSpecificConfig {
  const loaded = getLoadedConfig(atlasId)
  return loaded.atlasSpecificConfig
}

/**
 * Get projection parameters for an atlas
 */
export function getProjectionParams(atlasId: string): ProjectionParameters {
  return getAtlasSpecificConfig(atlasId).projectionParams
}

/**
 * Get behavior configuration for an atlas from registry
 * Returns behavior config if defined, undefined otherwise
 */
export function getAtlasBehavior(atlasId: string): AtlasRegistryBehavior | undefined {
  const entry = REGISTRY_METADATA.atlases.find(e => e.id === atlasId)
  return entry?.behavior
}

/**
 * Get territories for an atlas
 */
export function getAtlasTerritories(atlasId: string) {
  const loaded = getLoadedConfig(atlasId)
  return loaded.territories
}

/**
 * Get first territory for an atlas (convenience accessor)
 */
export function getFirstTerritory(atlasId: string) {
  return getAtlasTerritories(atlasId).first
}

/**
 * Get all territories for an atlas
 */
export function getAllTerritories(atlasId: string) {
  return getAtlasTerritories(atlasId).all
}

/**
 * Get all atlas configurations as a record
 * Note: This loads all atlases. Use getAvailableAtlasesGrouped() for UI to avoid loading all configs.
 */
export function getAllAtlases(): Record<string, AtlasConfig> {
  const result: Record<string, AtlasConfig> = {}
  for (const atlasId of CONFIG_PATHS.keys()) {
    result[atlasId] = getAtlasConfig(atlasId)
  }
  return result
}

/**
 * Get list of available atlases for UI selector
 * Uses registry metadata without loading configs
 */
export function getAvailableAtlases() {
  return REGISTRY_METADATA.atlases.map(entry => ({
    value: entry.id,
    label: typeof entry.name === 'string' ? entry.name : resolveI18nValue(entry.name),
  }))
}

/**
 * Atlas group for UI selector
 */
export interface AtlasGroup {
  id: string
  label: string
  options: Array<{
    value: string
    label: string
    icon?: string
  }>
}

/**
 * Get available atlases grouped by category for UI selector
 * Uses registry metadata without loading configs for better performance
 * Groups atlases by their group field and uses group definitions for labels
 * Returns groups in order defined by group sortOrder
 */
export function getAvailableAtlasesGrouped(): AtlasGroup[] {
  // Group atlases by their group field
  const atlasesByGroup: Record<string, AtlasRegistryEntry[]> = {}

  REGISTRY_METADATA.atlases.forEach((entry) => {
    const groupId = entry.group
    if (!atlasesByGroup[groupId]) {
      atlasesByGroup[groupId] = []
    }
    atlasesByGroup[groupId].push(entry)
  })

  // Sort groups by their sortOrder and build result
  return REGISTRY_METADATA.groups
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter(group => (atlasesByGroup[group.id]?.length ?? 0) > 0)
    .map((group) => {
      const groupAtlases = atlasesByGroup[group.id]!
      return {
        id: group.id,
        label: typeof group.label === 'string' ? group.label : resolveI18nValue(group.label),
        options: groupAtlases
          .sort((a, b) => a.sortOrder - b.sortOrder) // Sort atlases by their sortOrder
          .map(entry => ({
            value: entry.id,
            label: typeof entry.name === 'string' ? entry.name : resolveI18nValue(entry.name),
            translated: true, // Names are translated via resolveI18nValue
          })),
      }
    })
}

/**
 * Check if an atlas exists in the registry
 */
export function hasAtlas(atlasId: string): boolean {
  return CONFIG_PATHS.has(atlasId)
}

/**
 * Get list of all atlas IDs
 */
export function getAtlasIds(): string[] {
  return Array.from(CONFIG_PATHS.keys())
}

// Preset Helpers

/**
 * Get all presets for an atlas from registry
 * Returns empty array if atlas has no presets defined
 */
export function getAtlasPresets(atlasId: string) {
  const entry = REGISTRY_METADATA.atlases.find(e => e.id === atlasId)
  return entry?.presets ?? []
}

/**
 * Get default preset for an atlas
 * Uses isDefault flag in preset definitions
 */
export function getDefaultPreset(atlasId: string) {
  const entry = REGISTRY_METADATA.atlases.find(e => e.id === atlasId)
  if (!entry) {
    debug('No atlas entry found for %s', atlasId)
    return undefined
  }

  debug('Looking for default preset in atlas %s, has %d presets', atlasId, entry.presets?.length ?? 0)

  if (entry.presets) {
    const defaultPreset = entry.presets.find(p => p.isDefault)
    if (defaultPreset) {
      debug('Found default preset %s via isDefault flag', defaultPreset.id)
      return defaultPreset
    }
  }

  // No default preset defined
  debug('No default preset found for atlas %s', atlasId)
  return undefined
}

/**
 * Get default preset for a specific view mode
 * Filters presets by view mode type, then finds default within that filtered set
 * Falls back to first preset of that type if no default is marked
 */
export function getDefaultPresetForViewMode(
  atlasId: string,
  viewMode: 'split' | 'built-in-composite' | 'composite-custom' | 'unified',
) {
  const presets = getAtlasPresets(atlasId)
  const viewModePresets = presets.filter(p => p.type === viewMode)

  if (viewModePresets.length === 0) {
    debug('No presets found for view mode %s in atlas %s', viewMode, atlasId)
    return undefined
  }

  // Look for default within this view mode
  const defaultPreset = viewModePresets.find(p => p.isDefault)
  if (defaultPreset) {
    debug('Found default preset %s for view mode %s', defaultPreset.id, viewMode)
    return defaultPreset
  }

  // Fallback to first preset of this type
  const firstPreset = viewModePresets[0]
  debug('No default for view mode %s, using first preset %s', viewMode, firstPreset?.id)
  return firstPreset
}

/**
 * Get a specific preset by ID for an atlas
 */
export function getPresetById(atlasId: AtlasId, presetId: PresetId) {
  const presets = getAtlasPresets(atlasId)
  return presets.find(p => p.id === presetId)
}

/**
 * Get available view modes for an atlas
 * Derived from unique preset types defined in registry
 * Returns array of view modes that have at least one preset
 */
export function getAvailableViewModes(atlasId: AtlasId): Array<'split' | 'built-in-composite' | 'composite-custom' | 'unified'> {
  const presets = getAtlasPresets(atlasId)
  const uniqueTypes = new Set(presets.map(p => p.type))
  return Array.from(uniqueTypes)
}

/**
 * Get default view mode for an atlas
 * Uses type of default preset if defined, falls back to first preset type, then 'composite-custom'
 */
export function getDefaultViewMode(atlasId: AtlasId): 'split' | 'built-in-composite' | 'composite-custom' | 'unified' {
  const defaultPreset = getDefaultPreset(atlasId)
  if (defaultPreset) {
    return defaultPreset.type
  }

  // Fallback: use first preset's type
  const presets = getAtlasPresets(atlasId)
  if (presets.length > 0 && presets[0]) {
    return presets[0].type
  }

  // Last resort: composite-custom
  return 'composite-custom'
}
