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
 * Load unified JSON config and transform to backend format
 *
 * @param atlasName - Name of the atlas (e.g., 'portugal', 'france', 'europe')
 * @returns Both unified and backend formats
 */
export async function loadConfig(atlasName: string): Promise<LoadedConfig> {
  try {
    // Load unified JSON config
    const configPath = path.join(getConfigsDir(), `${atlasName}.json`)
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
      logger.error(`Config file not found: ${atlasName}.json`)
      logger.info(`Available configs in ${getConfigsDir()}:`)

      try {
        const files = await fs.readdir(getConfigsDir())
        const configs = files
          .filter(f => f.endsWith('.json') && f !== 'schema.json')
          .map(f => f.replace('.json', ''))

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
 * @returns Array of config names (without .json extension)
 */
export async function listConfigs(): Promise<string[]> {
  try {
    const configsDir = getConfigsDir()
    const files = await fs.readdir(configsDir)

    return files
      .filter(f => f.endsWith('.json') && f !== 'schema.json')
      .map(f => f.replace('.json', ''))
      .sort()
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
    const configPath = path.join(getConfigsDir(), `${atlasName}.json`)
    await fs.access(configPath)
    return true
  }
  catch {
    return false
  }
}
