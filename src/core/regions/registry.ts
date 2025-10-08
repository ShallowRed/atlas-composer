/**
 * Region Configuration Registry
 * Auto-discovery and central access point for all region configurations
 *
 * This registry automatically discovers all JSON config files in the configs/ folder
 * using Vite's import.meta.glob feature. Simply add a new JSON file to add a region.
 */

import type { LoadedRegionConfig, ProjectionParams, RegionSpecificConfig } from './loader'
import type { RegionConfig } from '@/types/territory'
import { loadRegionConfig } from './loader'

/**
 * Registry of all loaded region configurations
 */
interface RegionRegistry {
  [regionId: string]: LoadedRegionConfig
}

/**
 * Auto-discover and load all JSON configs from configs/ folder
 * Uses Vite's import.meta.glob for automatic discovery
 */
function buildRegistry(): RegionRegistry {
  const registry: RegionRegistry = {}

  // Files to exclude from auto-discovery (non-region configs)
  const excludeFiles = ['schema.json', 'README.md']

  // Import all JSON files from configs/ folder
  // The key is the file path, value is the imported module
  const configModules = import.meta.glob('@configs/*.json', { eager: true })

  for (const [path, module] of Object.entries(configModules)) {
    try {
      // Extract filename and region ID
      const filename = path.split('/').pop() || ''
      const regionId = filename.replace('.json', '')

      // Skip excluded files
      if (excludeFiles.includes(filename)) {
        console.info(`[Registry] Skipping non-region file: ${filename}`)
        continue
      }

      // Load and validate the config
      const jsonConfig = (module as any).default || module

      // Validate that this looks like a region config (has required fields)
      if (!jsonConfig.id || !jsonConfig.territories) {
        console.warn(`[Registry] Skipping ${filename}: missing required fields (id, territories)`)
        continue
      }

      registry[regionId] = loadRegionConfig(jsonConfig)

      console.info(`[Registry] Loaded region config: ${regionId}`)
    }
    catch (error) {
      const filename = path.split('/').pop() || path
      console.error(`[Registry] Failed to load config from ${filename}:`, error)
    }
  }

  // Verify at least one region was loaded
  if (Object.keys(registry).length === 0) {
    throw new Error('[Registry] No region configurations found in configs/ folder')
  }

  console.info(`[Registry] Loaded ${Object.keys(registry).length} region(s): ${Object.keys(registry).join(', ')}`)

  return registry
}

// Build registry on module load
const REGISTRY = buildRegistry()

/**
 * Default region ID
 */
export const DEFAULT_REGION = 'france'

/**
 * Get complete loaded configuration for a region
 */
export function getLoadedConfig(regionId: string): LoadedRegionConfig {
  return REGISTRY[regionId] || REGISTRY[DEFAULT_REGION]!
}

/**
 * Get region configuration (for stores and UI)
 */
export function getRegionConfig(regionId: string): RegionConfig {
  const loaded = getLoadedConfig(regionId)
  return loaded.regionConfig
}

/**
 * Get region-specific configuration (projection params, modes, groups)
 */
export function getRegionSpecificConfig(regionId: string): RegionSpecificConfig {
  const loaded = getLoadedConfig(regionId)
  return loaded.regionSpecificConfig
}

/**
 * Get projection parameters for a region
 */
export function getProjectionParams(regionId: string): ProjectionParams {
  return getRegionSpecificConfig(regionId).projectionParams
}

/**
 * Get territories for a region
 */
export function getRegionTerritories(regionId: string) {
  const loaded = getLoadedConfig(regionId)
  return loaded.territories
}

/**
 * Get mainland territory for a region
 */
export function getMainlandTerritory(regionId: string) {
  return getRegionTerritories(regionId).mainland
}

/**
 * Get overseas territories for a region
 */
export function getOverseasTerritories(regionId: string) {
  return getRegionTerritories(regionId).overseas
}

/**
 * Get all territories (mainland + overseas) for a region
 */
export function getAllTerritories(regionId: string) {
  return getRegionTerritories(regionId).all
}

/**
 * Get all region configurations as a record
 */
export function getAllRegionConfigs(): Record<string, RegionConfig> {
  return Object.fromEntries(
    Object.entries(REGISTRY).map(([id, loaded]) => [id, loaded.regionConfig]),
  )
}

/**
 * Get list of available regions for UI selector
 */
export function getAvailableRegions() {
  return Object.values(REGISTRY).map(loaded => ({
    value: loaded.regionConfig.id,
    label: loaded.regionConfig.name,
  }))
}

/**
 * Check if a region exists in the registry
 */
export function hasRegion(regionId: string): boolean {
  return regionId in REGISTRY
}

/**
 * Get list of all region IDs
 */
export function getRegionIds(): string[] {
  return Object.keys(REGISTRY)
}
