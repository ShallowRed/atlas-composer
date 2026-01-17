/**
 * @atlas-composer/preset-library
 *
 * Curated collection of composite map projection presets for Atlas Composer.
 *
 * @example
 * ```typescript
 * import { listPresets, getPreset } from '@atlas-composer/preset-library'
 *
 * // List all France presets
 * const francePresets = listPresets({ atlasId: 'france' })
 *
 * // Load a specific preset
 * const config = await getPreset('france-standard')
 * ```
 *
 * @packageDocumentation
 */

import type { CompositeProjectionConfig } from '@atlas-composer/specification'

import type { PresetFilterOptions, PresetMetadata, PresetRegion, PresetType } from './types.js'
import { catalog, getAllPresets, getPresetMetadata } from './catalog.js'

// Re-export types
export type { PresetCatalog, PresetEntry, PresetFilterOptions, PresetMetadata, PresetRegion, PresetType } from './types.js'

// Re-export catalog utilities
export { catalog, getAllPresets, getPresetMetadata }

/**
 * View mode preset types (designed for Atlas Composer web app, not external consumers).
 */
const VIEW_MODE_TYPES: PresetType[] = ['unified', 'split', 'built-in-composite']

/**
 * List presets matching the given filter options.
 *
 * By default, only `composite-custom` presets are returned. These are the
 * curated, exportable composite projection configurations that work with
 * `@atlas-composer/projection-loader`.
 *
 * Set `includeViewModes: true` to also include view mode presets (unified,
 * split, built-in-composite) which are designed for the Atlas Composer web app.
 *
 * @param options - Filter options
 * @returns Array of matching preset metadata
 *
 * @example
 * ```typescript
 * // All composite presets (default behavior)
 * listPresets()
 *
 * // All France composite presets
 * listPresets({ atlasId: 'france' })
 *
 * // Include view mode presets
 * listPresets({ includeViewModes: true })
 *
 * // Filter by specific type
 * listPresets({ type: 'composite-custom', includeViewModes: true })
 * ```
 */
export function listPresets(options: PresetFilterOptions = {}): PresetMetadata[] {
  let results = getAllPresets()

  // By default, exclude view mode presets (unified, split, built-in-composite)
  // These are designed for the Atlas Composer web app, not external consumers
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

/**
 * Get composite presets for a specific atlas.
 *
 * Returns only composite-custom presets by default.
 * Use `listPresets({ atlasId, includeViewModes: true })` to include view modes.
 *
 * @param atlasId - Atlas identifier
 * @returns Array of composite preset metadata for the atlas
 */
export function getPresetsForAtlas(atlasId: string): PresetMetadata[] {
  return listPresets({ atlasId })
}

/**
 * Get the default preset for an atlas.
 *
 * @param atlasId - Atlas identifier
 * @returns Default preset metadata or undefined
 */
export function getDefaultPreset(atlasId: string): PresetMetadata | undefined {
  const presets = getPresetsForAtlas(atlasId)
  return presets.find(p => p.tags?.includes('default')) || presets[0]
}

/**
 * Map of preset IDs to their JSON file paths (relative to presets/).
 */
const presetPaths: Record<string, string> = {
  // France
  'france-standard': 'france/france-customcomposite-nsp.json',
  'france-proportional': 'france/france-customcomposite-proportionnald3cp.json',
  'france-pseudo-d3cp': 'france/france-customcomposite-pseudod3cp.json',
  'france-builtin-d3cp': 'france/france-builtincomposite-d3cp.json',
  'france-split': 'france/france-split.json',
  'france-unified': 'france/france-unified.json',

  // Portugal
  'portugal-standard': 'portugal/portugal-default.json',
  'portugal-builtin': 'portugal/portugal-built-in-composite.json',
  'portugal-split': 'portugal/portugal-split.json',
  'portugal-unified': 'portugal/portugal-unified.json',

  // USA
  'usa-albers': 'usa/usa-builtincomposite-albersusa.json',
  'usa-pseudo-d3cp': 'usa/usa-customcompsite-pseudod3cp.json',
  'usa-builtin-d3cp': 'usa/usa-builtincomposite-d3cp.json',
  'usa-builtin-territories': 'usa/usa-builtincomposite-d3cpterritories.json',
  'usa-split': 'usa/usa-split.json',
  'usa-unified': 'usa/usa-unified.json',

  // Europe
  'europe-builtin': 'europe/europe-builtincomposite-d3cp.json',
  'europe-split': 'europe/europe-split.json',
  'europe-unified': 'europe/europe-unified.json',

  // World
  'world-unified': 'world/world-unified.json',
}

/**
 * Load a preset configuration by ID.
 *
 * Note: This function is designed for bundler environments that support
 * dynamic imports of JSON files. In Node.js, use `getPresetPath()` and
 * load the file directly.
 *
 * @param id - Preset identifier
 * @returns Promise resolving to the configuration, or undefined if not found
 *
 * @example
 * ```typescript
 * const config = await getPreset('france-standard')
 * if (config) {
 *   const projection = loadCompositeProjection(config, { width: 800, height: 600 })
 * }
 * ```
 */
export async function getPreset(id: string): Promise<CompositeProjectionConfig | undefined> {
  const metadata = getPresetMetadata(id)
  if (!metadata) {
    return undefined
  }

  // Only composite-custom presets have full configurations
  // Other types (built-in, split, unified) require the Atlas Composer app
  if (metadata.type !== 'composite-custom') {
    console.warn(`Preset "${id}" is type "${metadata.type}" - only composite-custom presets can be loaded directly`)
    return undefined
  }

  const path = presetPaths[id]
  if (!path) {
    return undefined
  }

  try {
    // Dynamic import - works in bundler environments
    const module = await import(`../presets/${path}`)
    return module.default as CompositeProjectionConfig
  }
  catch {
    console.error(`Failed to load preset "${id}" from ${path}`)
    return undefined
  }
}

/**
 * Get the file path for a preset (for direct file loading).
 *
 * @param id - Preset identifier
 * @returns Relative path to the preset JSON file, or undefined
 *
 * @example
 * ```typescript
 * import { readFileSync } from 'fs'
 * import { getPresetPath } from '@atlas-composer/preset-library'
 *
 * const path = getPresetPath('france-standard')
 * if (path) {
 *   const config = JSON.parse(readFileSync(`node_modules/@atlas-composer/preset-library/presets/${path}`, 'utf-8'))
 * }
 * ```
 */
export function getPresetPath(id: string): string | undefined {
  return presetPaths[id]
}

/**
 * List available atlas IDs.
 */
export function listAtlases(): string[] {
  const atlases = new Set<string>()
  for (const preset of getAllPresets()) {
    atlases.add(preset.atlasId)
  }
  return Array.from(atlases).sort()
}

/**
 * List available regions.
 */
export function listRegions(): PresetRegion[] {
  return ['france', 'portugal', 'usa', 'europe', 'world']
}

/**
 * List available preset types.
 */
export function listTypes(): PresetType[] {
  return ['composite-custom', 'built-in-composite', 'split', 'unified']
}

/**
 * Check if a preset type is a view mode (designed for Atlas Composer web app).
 */
export function isViewModeType(type: PresetType): boolean {
  return VIEW_MODE_TYPES.includes(type)
}

/**
 * List only composite-custom presets.
 * Alias for `listPresets()` with explicit intent.
 */
export function listCompositePresets(): PresetMetadata[] {
  return listPresets({ type: 'composite-custom', includeViewModes: true })
}

/**
 * List view mode presets (unified, split, built-in-composite).
 * These are designed for the Atlas Composer web app.
 */
export function listViewModePresets(): PresetMetadata[] {
  return getAllPresets().filter(p => VIEW_MODE_TYPES.includes(p.type))
}
