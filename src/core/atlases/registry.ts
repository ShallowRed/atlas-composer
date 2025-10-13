/**
 * Atlas Configuration Registry
 * Auto-discovery and central access point for all atlas configurations
 *
 * This registry automatically discovers all JSON config files in the configs/ folder
 * using Vite's import.meta.glob feature. Simply add a new JSON file to add an atlas.
 */

import type { AtlasSpecificConfig, LoadedAtlasConfig, ProjectionParams } from '@/core/atlases/loader'
import type { AtlasConfig } from '@/types'
import { loadAtlasConfig } from '@/core/atlases/loader'

/**
 * Registry of all loaded atlas configurations
 */
interface AtlasRegistry {
  [atlasId: string]: LoadedAtlasConfig
}

/**
 * Auto-discover and load all JSON configs from configs/ folder
 * Uses Vite's import.meta.glob for automatic discovery
 */
function buildRegistry(): AtlasRegistry {
  const registry: AtlasRegistry = {}

  // Files to exclude from auto-discovery (non-atlas configs)
  const excludeFiles = ['schema.json', 'README.md']

  // Import all JSON files from configs/ folder
  // The key is the file path, value is the imported module
  const configModules = import.meta.glob('#configs/*.json', { eager: true })

  for (const [path, module] of Object.entries(configModules)) {
    try {
      // Extract filename and atlas ID
      const filename = path.split('/').pop() || ''
      const atlasId = filename.replace('.json', '')

      // Skip excluded files
      if (excludeFiles.includes(filename)) {
        continue
      }

      // Load and validate the config
      const jsonConfig = (module as any).default || module

      // Validate that this looks like an atlas config (has required fields)
      if (!jsonConfig.id || !jsonConfig.territories) {
        console.warn(`[Registry] Skipping ${filename}: missing required fields (id, territories)`)
        continue
      }

      registry[atlasId] = loadAtlasConfig(jsonConfig)
    }
    catch (error) {
      const filename = path.split('/').pop() || path
      console.error(`[Registry] Failed to load config from ${filename}:`, error)
    }
  }

  // Verify at least one atlas was loaded
  if (Object.keys(registry).length === 0) {
    throw new Error('[Registry] No atlas configurations found in configs/ folder')
  }

  console.info(`[Registry] Loaded ${Object.keys(registry).length} atlas(es): ${Object.keys(registry).join(', ')}`)

  return registry
}

// Build registry on module load
const REGISTRY = buildRegistry()

/**
 * Default atlas ID
 */
export const DEFAULT_ATLAS = 'france'

/**
 * Get complete loaded configuration for an atlas
 */
export function getLoadedConfig(atlasId: string): LoadedAtlasConfig {
  return REGISTRY[atlasId] || REGISTRY[DEFAULT_ATLAS]!
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
export function getProjectionParams(atlasId: string): ProjectionParams {
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
 */
export function getAllAtlases(): Record<string, AtlasConfig> {
  return Object.fromEntries(
    Object.entries(REGISTRY).map(([id, loaded]) => [id, loaded.atlasConfig]),
  )
}

/**
 * Get list of available atlases for UI selector
 */
export function getAvailableAtlases() {
  return Object.values(REGISTRY).map(loaded => ({
    value: loaded.atlasConfig.id,
    label: loaded.atlasConfig.name,
  }))
}

/**
 * Atlas group for UI selector
 */
export interface AtlasGroup {
  category: string
  options: Array<{
    value: string
    label: string
    icon?: string
  }>
}

/**
 * Get available atlases grouped by category for UI selector
 * Groups atlases by their category field (country, region, world)
 * Returns groups in order: country → region → world
 */
export function getAvailableAtlasesGrouped(): AtlasGroup[] {
  const atlases = Object.values(REGISTRY).map(loaded => loaded.atlasConfig)

  // Group by category (default to 'country' if not specified)
  const groups: Record<string, typeof atlases> = {}

  atlases.forEach((atlas) => {
    const category = atlas.category || 'country'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(atlas)
  })

  // Define category order: country → region → world
  const categoryOrder: Array<'country' | 'region' | 'world'> = ['country', 'region', 'world']

  // Build grouped result
  return categoryOrder
    .filter(cat => groups[cat] && groups[cat].length > 0)
    .map((category) => {
      const categoryAtlases = groups[category]!
      return {
        category,
        options: categoryAtlases
          .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically within each group
          .map(atlas => ({
            value: atlas.id,
            label: atlas.name,
            translated: true, // Names from config are already translated via resolveI18nValue
          })),
      }
    })
}

/**
 * Check if an atlas exists in the registry
 */
export function hasAtlas(atlasId: string): boolean {
  return atlasId in REGISTRY
}

/**
 * Get list of all atlas IDs
 */
export function getAtlasIds(): string[] {
  return Object.keys(REGISTRY)
}
