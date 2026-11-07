import type { CompositeProjectionConfig } from '@atlas-composer/specification'

import type { AtlasRegistry, PresetDefinition } from '../../../types/atlas-registry'
import type { PresetCatalog, PresetFilterOptions, PresetMetadata, PresetRegion, PresetType } from './types.js'
import registry from '../../../configs/atlas-registry.json'
import { version } from '../package.json'
import { PRESET_TYPES } from './types.js'

export type { PresetCatalog, PresetEntry, PresetFilterOptions, PresetMetadata, PresetRegion, PresetType } from './types.js'

const { atlases } = registry as AtlasRegistry

function english(label: PresetDefinition['name']): string {
  return typeof label === 'string' ? label : label.en
}

function toPresetType(type: string): PresetType {
  const presetType = PRESET_TYPES.find(known => known === type)
  if (!presetType) {
    throw new Error(`Unknown preset type "${type}"`)
  }
  return presetType
}

export const catalog: PresetCatalog = {
  version,
  presets: Object.fromEntries(atlases.flatMap(atlas => (atlas.presets ?? []).map((preset): [string, PresetMetadata] => [preset.id, {
    id: preset.id,
    name: english(preset.name),
    description: preset.description && english(preset.description),
    atlasId: atlas.id,
    type: toPresetType(preset.type),
    region: atlas.id,
    tags: preset.isDefault ? ['default'] : [],
  }]))),
}

export function getAllPresets(): PresetMetadata[] {
  return Object.values(catalog.presets)
}

export function getPresetMetadata(id: string): PresetMetadata | undefined {
  return catalog.presets[id]
}

const VIEW_MODE_TYPES: PresetType[] = ['unified', 'split', 'built-in-composite']

export function listPresets(options: PresetFilterOptions = {}): PresetMetadata[] {
  let results = getAllPresets()

  if (!options.includeViewModes && !options.type) {
    results = results.filter(p => !VIEW_MODE_TYPES.includes(p.type))
  }

  if (options.atlasId) {
    results = results.filter(p => p.atlasId === options.atlasId)
  }

  if (options.type) {
    results = results.filter(p => p.type === options.type)
  }

  if (options.region) {
    results = results.filter(p => p.region === options.region)
  }

  if (options.tags && options.tags.length > 0) {
    results = results.filter(p =>
      p.tags?.some(tag => options.tags!.includes(tag)),
    )
  }

  return results
}

export function getPresetsForAtlas(atlasId: string): PresetMetadata[] {
  return listPresets({ atlasId })
}

export function getDefaultPreset(atlasId: string): PresetMetadata | undefined {
  const presets = getPresetsForAtlas(atlasId)
  return presets.find(p => p.tags?.includes('default')) || presets[0]
}

export async function getPreset(id: string): Promise<CompositeProjectionConfig | undefined> {
  const metadata = getPresetMetadata(id)
  if (!metadata) {
    return undefined
  }

  if (metadata.type !== 'composite-custom') {
    console.warn(`Preset "${id}" is type "${metadata.type}" - only composite-custom presets can be loaded directly`)
    return undefined
  }

  try {
    const module = await import(`../../../configs/presets/${metadata.atlasId}/${id}.json`)
    return module.default as CompositeProjectionConfig
  }
  catch {
    console.error(`Failed to load preset "${id}" from ${getPresetPath(id)}`)
    return undefined
  }
}

export function getPresetPath(id: string): string | undefined {
  const metadata = getPresetMetadata(id)
  return metadata && `${metadata.atlasId}/${id}.json`
}

export function listAtlases(): string[] {
  const atlases = new Set<string>()
  for (const preset of getAllPresets()) {
    atlases.add(preset.atlasId)
  }
  return Array.from(atlases).sort()
}

export function listRegions(): PresetRegion[] {
  return atlases.map(atlas => atlas.id)
}

export function listTypes(): PresetType[] {
  return [...PRESET_TYPES]
}

export function isViewModeType(type: PresetType): boolean {
  return VIEW_MODE_TYPES.includes(type)
}

export function listCompositePresets(): PresetMetadata[] {
  return listPresets({ type: 'composite-custom', includeViewModes: true })
}

export function listViewModePresets(): PresetMetadata[] {
  return getAllPresets().filter(p => VIEW_MODE_TYPES.includes(p.type))
}
