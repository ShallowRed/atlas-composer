/**
 * Export Helper Utilities
 *
 * Common utilities for export/import CLI scripts
 */

import type { AtlasConfig } from '../../types/atlas-config'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { logger } from './logger'
import { validateAtlasConfig } from './schema-validator'

/**
 * Load and validate an atlas configuration file
 */
export async function loadAtlasConfig(atlasId: string): Promise<AtlasConfig> {
  const configPath = resolve(process.cwd(), `configs/${atlasId}.json`)

  if (!existsSync(configPath)) {
    throw new Error(`Atlas configuration not found: ${configPath}`)
  }

  logger.info(`Loading configuration: ${configPath}`)

  const jsonContent = readFileSync(configPath, 'utf-8')
  const config = JSON.parse(jsonContent) as AtlasConfig

  // Validate against schema
  const validation = validateAtlasConfig(config)

  if (validation.errors.length > 0) {
    logger.error('Configuration validation failed:')
    validation.errors.forEach((error) => {
      logger.error(`  - ${error}`)
    })
    throw new Error('Invalid atlas configuration')
  }

  if (validation.warnings.length > 0) {
    logger.warn('Configuration warnings:')
    validation.warnings.forEach((warning) => {
      logger.warn(`  - ${warning}`)
    })
  }

  return config
}

/**
 * Get list of available atlases
 */
export function getAvailableAtlases(): string[] {
  const configsDir = resolve(process.cwd(), 'configs')
  if (!existsSync(configsDir)) {
    return []
  }

  const fs = require('node:fs')
  return fs.readdirSync(configsDir)
    .filter((file: string) => file.endsWith('.json') && file !== 'schema.json')
    .map((file: string) => file.replace('.json', ''))
}
