import type { CompositeProjectionConfig } from '@atlas-composer/specification'

import type { PresetFilterOptions, PresetMetadata, PresetRegion, PresetType } from './types.js'
import { catalog, getAllPresets, getPresetMetadata } from './catalog.js'

export type { PresetCatalog, PresetEntry, PresetFilterOptions, PresetMetadata, PresetRegion, PresetType } from './types.js'

export { catalog, getAllPresets, getPresetMetadata }

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

const presetPaths: Record<string, string> = {
  'france-standard': 'france/france-customcomposite-nsp.json',
  'france-proportional': 'france/france-customcomposite-proportionnald3cp.json',
  'france-pseudo-d3cp': 'france/france-customcomposite-pseudod3cp.json',
  'france-builtin-d3cp': 'france/france-builtincomposite-d3cp.json',
  'france-split': 'france/france-split.json',
  'france-unified': 'france/france-unified.json',

  'portugal-standard': 'portugal/portugal-default.json',
  'portugal-builtin': 'portugal/portugal-built-in-composite.json',
  'portugal-split': 'portugal/portugal-split.json',
  'portugal-unified': 'portugal/portugal-unified.json',

  'usa-albers': 'usa/usa-builtincomposite-albersusa.json',
  'usa-pseudo-d3cp': 'usa/usa-customcompsite-pseudod3cp.json',
  'usa-builtin-d3cp': 'usa/usa-builtincomposite-d3cp.json',
  'usa-builtin-territories': 'usa/usa-builtincomposite-d3cpterritories.json',
  'usa-split': 'usa/usa-split.json',
  'usa-unified': 'usa/usa-unified.json',

  'europe-builtin': 'europe/europe-builtincomposite-d3cp.json',
  'europe-split': 'europe/europe-split.json',
  'europe-unified': 'europe/europe-unified.json',

  'world-unified': 'world/world-unified.json',
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

  const path = presetPaths[id]
  if (!path) {
    return undefined
  }

  try {
    const module = await import(`../presets/${path}`)
    return module.default as CompositeProjectionConfig
  }
  catch {
    console.error(`Failed to load preset "${id}" from ${path}`)
    return undefined
  }
}

export function getPresetPath(id: string): string | undefined {
  return presetPaths[id]
}

export function listAtlases(): string[] {
  const atlases = new Set<string>()
  for (const preset of getAllPresets()) {
    atlases.add(preset.atlasId)
  }
  return Array.from(atlases).sort()
}

export function listRegions(): PresetRegion[] {
  return ['france', 'portugal', 'usa', 'europe', 'world']
}

export function listTypes(): PresetType[] {
  return ['composite-custom', 'built-in-composite', 'split', 'unified']
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
