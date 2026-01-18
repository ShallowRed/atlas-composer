import type { BackendConfig, JSONAtlasConfig } from '#types'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { createBackendConfig } from '#scripts/config/adapter'
import { logger } from '#scripts/utils/logger'
import { validateConfigSchema } from '#scripts/utils/schema-validator'

export interface LoadedConfig {
  unified: JSONAtlasConfig
  backend: BackendConfig
}

function getProjectRoot(): string {
  return process.cwd()
}

function getConfigsDir(): string {
  return path.join(getProjectRoot(), 'configs')
}

export async function loadConfig(atlasName: string): Promise<LoadedConfig> {
  try {
    const configPath = path.join(getConfigsDir(), `${atlasName}.json`)
    const configContent = await fs.readFile(configPath, 'utf-8')
    const unified = JSON.parse(configContent)

    await validateConfigSchema(unified, atlasName)

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
      catch {}

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
