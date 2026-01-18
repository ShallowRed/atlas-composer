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

interface AtlasRegistryEntry {
  id: string
  configPath: string
}

interface AtlasRegistryConfig {
  atlases: AtlasRegistryEntry[]
}

let registryCache: AtlasRegistryConfig | null = null

function getProjectRoot(): string {
  return process.cwd()
}

function getConfigsDir(): string {
  return path.join(getProjectRoot(), 'configs')
}

async function loadRegistry(): Promise<AtlasRegistryConfig> {
  if (registryCache) {
    return registryCache
  }

  const registryPath = path.join(getConfigsDir(), 'atlas-registry.json')
  const registryContent = await fs.readFile(registryPath, 'utf-8')
  registryCache = JSON.parse(registryContent)
  return registryCache!
}

async function getAtlasConfigPath(atlasName: string): Promise<string> {
  const registry = await loadRegistry()
  const entry = registry.atlases.find(a => a.id === atlasName)

  if (!entry) {
    throw new Error(`Atlas '${atlasName}' not found in registry`)
  }

  const relativePath = entry.configPath.replace(/^\.\//, '')
  return path.join(getConfigsDir(), relativePath)
}

export async function loadConfig(atlasName: string): Promise<LoadedConfig> {
  try {
    const configPath = await getAtlasConfigPath(atlasName)
    const configContent = await fs.readFile(configPath, 'utf-8')
    const unified = JSON.parse(configContent)

    await validateConfigSchema(unified, atlasName)

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
    const registry = await loadRegistry()
    return registry.atlases.map(a => a.id).sort()
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to list configs: ${message}`)
    return []
  }
}

export async function configExists(atlasName: string): Promise<boolean> {
  try {
    await getAtlasConfigPath(atlasName)
    return true
  }
  catch {
    return false
  }
}
