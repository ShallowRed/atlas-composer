/**
 * Atlas Configuration Registry
 * Central access point for all atlas configurations with lazy loading
 *
 * This registry uses a static atlas-registry.json file to define available atlases.
 * Atlas configurations are only loaded when accessed, improving initial load time.
 */

import type { I18nValue, JSONAtlasConfig } from '#types'
import type { AtlasSpecificConfig, LoadedAtlasConfig } from '@/core/atlases/loader'
import type { AtlasConfig } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import atlasRegistryData from '#configs/atlas-registry.json'
import { resolveI18nValue } from '@/core/atlases/i18n-utils'
import { loadAtlasConfig } from '@/core/atlases/loader'

/**
 * Atlas group definition
 */
export interface AtlasGroupDefinition {
  id: 'country' | 'region' | 'world'
  label: I18nValue | string
  sortOrder: number
}

/**
 * Atlas registry metadata entry
 */
export interface AtlasRegistryEntry {
  id: string
  name: I18nValue | string
  group: 'country' | 'region' | 'world'
  sortOrder: number
  configPath: string
}

/**
 * Atlas registry configuration
 */
interface AtlasRegistryConfig {
  defaultAtlas: string
  groups: AtlasGroupDefinition[]
  atlases: AtlasRegistryEntry[]
}

/**
 * Cache of loaded atlas configurations (lazy loading)
 */
const LOADED_CONFIGS: Map<string, LoadedAtlasConfig> = new Map()

/**
 * Static atlas registry metadata from JSON
 */
const REGISTRY_METADATA: AtlasRegistryConfig = atlasRegistryData as AtlasRegistryConfig

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
export async function loadAtlasAsync(atlasId: string): Promise<LoadedAtlasConfig> {
  // Check cache first
  if (LOADED_CONFIGS.has(atlasId)) {
    return LOADED_CONFIGS.get(atlasId)!
  }

  // Get config path from registry
  const configPath = CONFIG_PATHS.get(atlasId)
  if (!configPath) {
    throw new Error(`[Registry] Atlas '${atlasId}' not found in registry`)
  }

  try {
    // Fetch the JSON file from public/configs
    const url = `${getConfigBaseUrl()}${atlasId}.json`
    console.info(`[Registry] Fetching atlas '${atlasId}' from ${url}...`)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const jsonConfig: JSONAtlasConfig = await response.json()

    // Validate that this is an atlas config (has required fields)
    if (!jsonConfig.id || !jsonConfig.territories) {
      throw new Error(`Invalid atlas config: missing required fields (id, territories)`)
    }

    // Load and cache the config
    const loadedConfig = loadAtlasConfig(jsonConfig)
    LOADED_CONFIGS.set(atlasId, loadedConfig)

    console.info(`[Registry] Successfully loaded atlas '${atlasId}'`)
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
 * Default atlas ID from registry
 */
export const DEFAULT_ATLAS = REGISTRY_METADATA.defaultAtlas

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
    console.warn(`[Registry] Atlas '${atlasId}' not cached, falling back to '${DEFAULT_ATLAS}':`, error)
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
 * Get territories for an atlas
 */
export function getAtlasTerritories(atlasId: string) {
  const loaded = getLoadedConfig(atlasId)
  return loaded.territories
}

/**
 * Get mainland territory for an atlas
 */
export function getMainlandTerritory(atlasId: string) {
  return getAtlasTerritories(atlasId).mainland
}

/**
 * Get overseas territories for an atlas
 */
export function getOverseasTerritories(atlasId: string) {
  return getAtlasTerritories(atlasId).overseas
}

/**
 * Get all territories (mainland + overseas) for an atlas
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
 * Get group definitions from registry
 */
export function getGroupDefinitions(): AtlasGroupDefinition[] {
  return REGISTRY_METADATA.groups
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
