import type { AtlasRegistry, AtlasRegistryBehavior, AtlasRegistryEntry, I18nValue } from '#types'
import type { AtlasSpecificConfig, LoadedAtlasConfig } from '@/core/atlases/loader'
import type { AtlasConfig, ViewMode } from '@/types'
import type { AtlasId, PresetId } from '@/types/branded'
import atlasRegistryData from '#configs/atlas-registry.json'
import { logger } from '@/utils/logger'

const debug = logger.atlas.loader

const REGISTRY_METADATA: AtlasRegistry = atlasRegistryData as AtlasRegistry

const LOADED_CONFIGS: Map<string, LoadedAtlasConfig> = new Map()

const CONFIG_PATHS: Map<string, string> = new Map(
  REGISTRY_METADATA.atlases.map(entry => [entry.id, entry.configPath]),
)

export function resolveConfigPath(configPath: string): string {
  return configPath.replace(/^\.\//, 'configs/')
}

export function getAtlasConfigPath(atlasId: AtlasId): string | undefined {
  return CONFIG_PATHS.get(atlasId)
}

export function setLoadedConfig(atlasId: AtlasId, config: LoadedAtlasConfig): void {
  LOADED_CONFIGS.set(atlasId, config)
}

function getDefaultAtlas(): AtlasRegistryEntry {
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

export function isAtlasLoaded(atlasId: string): boolean {
  return LOADED_CONFIGS.has(atlasId)
}

export function getLoadedConfig(atlasId: string): LoadedAtlasConfig {
  const loaded = LOADED_CONFIGS.get(atlasId)
  if (loaded) {
    return loaded
  }

  debug('Atlas %s not cached, falling back to %s', atlasId, DEFAULT_ATLAS)
  const fallback = LOADED_CONFIGS.get(DEFAULT_ATLAS)
  if (!fallback) {
    throw new Error(
      `[Registry] Neither '${atlasId}' nor default atlas '${DEFAULT_ATLAS}' are loaded yet`,
    )
  }
  return fallback
}

export function getAtlasConfig(atlasId: string): AtlasConfig {
  const loaded = getLoadedConfig(atlasId)
  return loaded.atlasConfig
}

export function getAtlasSpecificConfig(atlasId: string): AtlasSpecificConfig {
  const loaded = getLoadedConfig(atlasId)
  return loaded.atlasSpecificConfig
}

export function getAtlasBehavior(atlasId: string): AtlasRegistryBehavior | undefined {
  const entry = REGISTRY_METADATA.atlases.find(e => e.id === atlasId)
  return entry?.behavior
}

function getAtlasTerritories(atlasId: string) {
  const loaded = getLoadedConfig(atlasId)
  return loaded.territories
}

export function getAllTerritories(atlasId: string) {
  return getAtlasTerritories(atlasId).all
}

export interface AtlasGroup {
  id: string
  label: I18nValue
  options: Array<{
    value: string
    label: I18nValue
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
        label: group.label,
        options: groupAtlases
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(entry => ({
            value: entry.id,
            label: entry.name,
          })),
      }
    })
}

export function getAtlasPresets(atlasId: string) {
  const entry = REGISTRY_METADATA.atlases.find(e => e.id === atlasId)
  return entry?.presets ?? []
}

function getDefaultPreset(atlasId: string) {
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
  viewMode: ViewMode,
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

export function getAvailableViewModes(atlasId: AtlasId): ViewMode[] {
  const presets = getAtlasPresets(atlasId)
  const uniqueTypes = new Set(presets.map(p => p.type))
  return Array.from(uniqueTypes)
}

export function getDefaultViewMode(atlasId: AtlasId): ViewMode {
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
