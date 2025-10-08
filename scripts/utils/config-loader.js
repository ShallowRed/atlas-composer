/**
 * Unified Config Loader
 * Loads unified JSON configs and applies backend adapter transformation
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { logger } from './logger.js'

/**
 * Get project root directory
 */
function getProjectRoot() {
  return process.cwd()
}

/**
 * Get configs directory path
 */
function getConfigsDir() {
  return path.join(getProjectRoot(), 'configs')
}

/**
 * Get backend adapter path
 */
function getAdapterPath() {
  return path.join(getProjectRoot(), 'scripts/utils', 'config-adapter.js')
}

/**
 * Load unified JSON config and transform to backend format
 *
 * @param {string} atlasName - Name of the atlas (e.g., 'portugal', 'france', 'eu')
 * @returns {Promise<{unified: object, backend: object}>} Both formats
 */
export async function loadConfig(atlasName) {
  try {
    // Load unified JSON config
    const configPath = path.join(getConfigsDir(), `${atlasName}.json`)
    const configContent = await fs.readFile(configPath, 'utf-8')
    const unified = JSON.parse(configContent)

    // Load backend adapter
    const adapterPath = getAdapterPath()
    const { createBackendConfig } = await import(adapterPath)

    // Transform to backend format
    const backend = createBackendConfig(unified)

    return { unified, backend }
  }
  catch (error) {
    if (error.code === 'ENOENT') {
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

    logger.error(`Failed to load config: ${error.message}`)
    throw error
  }
}

/**
 * List all available configs
 *
 * @returns {Promise<string[]>} Array of config names (without .json extension)
 */
export async function listConfigs() {
  try {
    const configsDir = getConfigsDir()
    const files = await fs.readdir(configsDir)

    return files
      .filter(f => f.endsWith('.json') && f !== 'schema.json')
      .map(f => f.replace('.json', ''))
      .sort()
  }
  catch (error) {
    logger.error(`Failed to list configs: ${error.message}`)
    return []
  }
}

/**
 * Check if a config exists
 *
 * @param {string} atlasName - Name of the atlas
 * @returns {Promise<boolean>} True if config exists
 */
export async function configExists(atlasName) {
  try {
    const configPath = path.join(getConfigsDir(), `${atlasName}.json`)
    await fs.access(configPath)
    return true
  }
  catch {
    return false
  }
}
