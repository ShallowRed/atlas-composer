/**
 * Unified Config Loader
 * Loads unified JSON configs and applies backend adapter transformation
 */

import type { BackendConfig, JSONAtlasConfig } from '#types'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { createBackendConfig } from '#scripts/config/adapter'
import { logger } from '#scripts/utils/logger'
import { validateConfigSchema } from '#scripts/utils/schema-validator'

/**
 * Loaded config with both formats
 */
export interface LoadedConfig {
  unified: JSONAtlasConfig
  backend: BackendConfig
}

/**
 * Atlas registry entry
 */
interface AtlasRegistryEntry {
  id: string
  configPath: string
}

/**
 * Atlas registry configuration
 */
interface AtlasRegistryConfig {
  atlases: AtlasRegistryEntry[]
}

/**
 * Cache for registry data
 */
let registryCache: AtlasRegistryConfig | null = null

/**
 * Get project root directory
 */
function getProjectRoot(): string {
  return process.cwd()
}

/**
 * Get configs directory path
 */
function getConfigsDir(): string {
  return path.join(getProjectRoot(), 'configs')
}

/**
 * Load the atlas registry
 */
async function loadRegistry(): Promise<AtlasRegistryConfig> {
  if (registryCache) {
    return registryCache
  }

  const registryPath = path.join(getConfigsDir(), 'atlas-registry.json')
  const registryContent = await fs.readFile(registryPath, 'utf-8')
  registryCache = JSON.parse(registryContent)
  return registryCache!
}

/**
 * Get config path for an atlas from the registry
 */
async function getAtlasConfigPath(atlasName: string): Promise<string> {
  const registry = await loadRegistry()
  const entry = registry.atlases.find(a => a.id === atlasName)

  if (!entry) {
    throw new Error(`Atlas '${atlasName}' not found in registry`)
  }

  // configPath is relative like "./atlases/france.json"
  // Remove leading "./" and join with configs directory
  const relativePath = entry.configPath.replace(/^\.\//, '')
  return path.join(getConfigsDir(), relativePath)
}

/**
 * Load unified JSON config and transform to backend format
 *
 * @param atlasName - Name of the atlas (e.g., 'portugal', 'france', 'europe')
 * @returns Both unified and backend formats
 */
export async function loadConfig(atlasName: string): Promise<LoadedConfig> {
  try {
    // Get config path from registry
    const configPath = await getAtlasConfigPath(atlasName)
    const configContent = await fs.readFile(configPath, 'utf-8')
    const unified = JSON.parse(configContent)

    // Validate against JSON schema
    await validateConfigSchema(unified, atlasName)

    // Transform to backend format
    const backend = createBackendConfig(unified)

    return { unified, backend }
  }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      logger.error(`Config file not found: ${atlasName}`)
      logger.info(`Available configs:`)

      try {
        const configs = await listConfigs()
        configs.forEach(c => logger.log(`  - ${c}`))
      }
      catch {
        // Ignore
      }

      throw new Error(`Config '${atlasName}' not found`)
    }

    if (error instanceof SyntaxError) {
      logger.error(`Invalid JSON in config: ${atlasName}.json`)
      throw new Error(`Invalid JSON: ${error.message}`)
    }

    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to load config: ${message}`)
    throw error
  }
}

/**
 * List all available configs
 *
 * @returns Array of config names (atlas IDs from registry)
 */
export async function listConfigs(): Promise<string[]> {
  try {
    const registry = await loadRegistry()
    return registry.atlases.map(a => a.id).sort()
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to list configs: ${message}`)
    return []
  }
}

/**
 * Check if a config exists
 *
 * @param atlasName - Name of the atlas
 * @returns True if config exists
 */
export async function configExists(atlasName: string): Promise<boolean> {
  try {
    await getAtlasConfigPath(atlasName)
    return true
  }
  catch {
    return false
  }
}
