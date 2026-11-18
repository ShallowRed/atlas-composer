import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import { readFileSync } from 'node:fs'

export function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

interface RegistryPreset { id: string, type: string, configPath: string }
const registry: { atlases: { presets: RegistryPreset[] }[] } = readJson('configs/atlas-registry.json')

/** The composite-custom presets of the registry, each with its identifier */
export const compositePresets = registry.atlases
  .flatMap(atlas => atlas.presets)
  .filter(preset => preset.type === 'composite-custom')
  .map((preset): [string, CompositeProjectionConfig] => [preset.id, readJson(`configs/${preset.configPath}`)])

export function presetOf(presetId: string): CompositeProjectionConfig {
  return compositePresets.find(([id]) => id === presetId)![1]
}
