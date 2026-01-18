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

export const REGISTRY_METADATA: AtlasRegistry = atlasRegistryData as AtlasRegistry

const LOADED_CONFIGS: Map<string, LoadedAtlasConfig> = new Map()

const CONFIG_PATHS: Map<string, string> = new Map(
  REGISTRY_METADATA.atlases.map(entry => [entry.id, entry.configPath]),
)

function getConfigBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}configs/`
}

export async function loadAtlasAsync(atlasId: AtlasId): Promise<LoadedAtlasConfig> {
  if (LOADED_CONFIGS.has(atlasId)) {
    debug('Atlas %s already loaded from cache', atlasId)
    return LOADED_CONFIGS.get(atlasId)!
  }

  const configPath = CONFIG_PATHS.get(atlasId)
  if (!configPath) {
    throw new Error(`[Registry] Atlas '${atlasId}' not found in registry`)
  }

  try {
    const relativePath = configPath.replace(/^\.\//, '')
    const url = `${getConfigBaseUrl()}${relativePath}`
    debug('Fetching atlas %s from %s', atlasId, url)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const jsonConfig: JSONAtlasConfig = await response.json()

    if (!jsonConfig.id || !jsonConfig.territories) {
      throw new Error(`Invalid atlas config: missing required fields (id, territories)`)
    }

    const behavior = getAtlasBehavior(atlasId)

    const loadedConfig = loadAtlasConfig(jsonConfig, behavior)
    LOADED_CONFIGS.set(atlasId, loadedConfig)

    debug('Successfully loaded atlas %s from network', atlasId)
    return loadedConfig
  }
  catch (error) {
    throw new Error(`[Registry] Failed to load atlas '${atlasId}': ${error}`)
  }
}

function loadAtlasSync(atlasId: string): LoadedAtlasConfig {
  if (LOADED_CONFIGS.has(atlasId)) {
    return LOADED_CONFIGS.get(atlasId)!
  }

  throw new Error(
    `[Registry] Atlas '${atlasId}' not loaded yet. Use await loadAtlasAsync('${atlasId}') or switch to a cached atlas.`,
  )
}

export function getDefaultAtlas(): AtlasRegistryEntry {
  const defaultEntry = REGISTRY_METADATA.atlases.find(e => e.isDefault)
  if (defaultEntry) {
    return defaultEntry
  }

  debug('No default atlas defined, using first atlas')
  if (REGISTRY_METADATA.atlases.length === 0) {
    throw new Error('[Registry] No atlases defined in registry')
  }
  return REGISTRY_METADATA.atlases[0]!
}

export const DEFAULT_ATLAS = getDefaultAtlas().id as AtlasId

export async function preloadDefaultAtlas(): Promise<void> {
  if (!LOADED_CONFIGS.has(DEFAULT_ATLAS)) {
    await loadAtlasAsync(DEFAULT_ATLAS)
  }
}

export function isAtlasLoaded(atlasId: string): boolean {
  return LOADED_CONFIGS.has(atlasId)
}

export function getLoadedConfig(atlasId: string): LoadedAtlasConfig {
  try {
    return loadAtlasSync(atlasId)
  }
  catch (error) {
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

export function getAtlasConfig(atlasId: string): AtlasConfig {
  const loaded = getLoadedConfig(atlasId)
  return loaded.atlasConfig
}

export function getAtlasSpecificConfig(atlasId: string): AtlasSpecificConfig {
  const loaded = getLoadedConfig(atlasId)
  return loaded.atlasSpecificConfig
}

export function getProjectionParams(atlasId: string): ProjectionParameters {
  return getAtlasSpecificConfig(atlasId).projectionParams
}

export function getAtlasBehavior(atlasId: string): AtlasRegistryBehavior | undefined {
  const entry = REGISTRY_METADATA.atlases.find(e => e.id === atlasId)
  return entry?.behavior
}

export function getAtlasTerritories(atlasId: string) {
  const loaded = getLoadedConfig(atlasId)
  return loaded.territories
}

export function getFirstTerritory(atlasId: string) {
  return getAtlasTerritories(atlasId).first
}

export function getAllTerritories(atlasId: string) {
  return getAtlasTerritories(atlasId).all
}

export function getAllAtlases(): Record<string, AtlasConfig> {
  const result: Record<string, AtlasConfig> = {}
  for (const atlasId of CONFIG_PATHS.keys()) {
    result[atlasId] = getAtlasConfig(atlasId)
  }
  return result
}

export function getAvailableAtlases() {
  return REGISTRY_METADATA.atlases.map(entry => ({
    value: entry.id,
    label: typeof entry.name === 'string' ? entry.name : resolveI18nValue(entry.name),
  }))
}

export interface AtlasGroup {
  id: string
  label: string
  options: Array<{
    value: string
    label: string
    icon?: string
  }>
}

export function getAvailableAtlasesGrouped(): AtlasGroup[] {
  const atlasesByGroup: Record<string, AtlasRegistryEntry[]> = {}

  REGISTRY_METADATA.atlases.forEach((entry) => {
    const groupId = entry.group
    if (!atlasesByGroup[groupId]) {
      atlasesByGroup[groupId] = []
    }
    atlasesByGroup[groupId].push(entry)
  })

  return REGISTRY_METADATA.groups
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter(group => (atlasesByGroup[group.id]?.length ?? 0) > 0)
    .map((group) => {
      const groupAtlases = atlasesByGroup[group.id]!
      return {
        id: group.id,
        label: typeof group.label === 'string' ? group.label : resolveI18nValue(group.label),
        options: groupAtlases
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(entry => ({
            value: entry.id,
            label: typeof entry.name === 'string' ? entry.name : resolveI18nValue(entry.name),
            translated: true,
          })),
      }
    })
}

export function hasAtlas(atlasId: string): boolean {
  return CONFIG_PATHS.has(atlasId)
}

export function getAtlasIds(): string[] {
  return Array.from(CONFIG_PATHS.keys())
}

export function getAtlasPresets(atlasId: string) {
  const entry = REGISTRY_METADATA.atlases.find(e => e.id === atlasId)
  return entry?.presets ?? []
}

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

  debug('No default preset found for atlas %s', atlasId)
  return undefined
}

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

  const defaultPreset = viewModePresets.find(p => p.isDefault)
  if (defaultPreset) {
    debug('Found default preset %s for view mode %s', defaultPreset.id, viewMode)
    return defaultPreset
  }

  const firstPreset = viewModePresets[0]
  debug('No default for view mode %s, using first preset %s', viewMode, firstPreset?.id)
  return firstPreset
}

export function getPresetById(atlasId: AtlasId, presetId: PresetId) {
  const presets = getAtlasPresets(atlasId)
  return presets.find(p => p.id === presetId)
}

export function getAvailableViewModes(atlasId: AtlasId): Array<'split' | 'built-in-composite' | 'composite-custom' | 'unified'> {
  const presets = getAtlasPresets(atlasId)
  const uniqueTypes = new Set(presets.map(p => p.type))
  return Array.from(uniqueTypes)
}

export function getDefaultViewMode(atlasId: AtlasId): 'split' | 'built-in-composite' | 'composite-custom' | 'unified' {
  const defaultPreset = getDefaultPreset(atlasId)
  if (defaultPreset) {
    return defaultPreset.type
  }

  const presets = getAtlasPresets(atlasId)
  if (presets.length > 0 && presets[0]) {
    return presets[0].type
  }

  return 'composite-custom'
}
