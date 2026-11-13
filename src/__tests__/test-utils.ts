import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { PresetType } from '#types'
import type { AtlasId, PresetId } from '@/types/branded'
import { readdirSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { vi } from 'vitest'
import atlasRegistry from '#configs/atlas-registry.json'
import { loadAtlasConfiguration } from '@/services/atlas/atlas-config-loader'

export async function loadAtlasFromConfigs(atlasId: AtlasId) {
  vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(`.${url}`, 'utf8')))
  const result = await loadAtlasConfiguration(atlasId, 'en')
  if (!result.ok) {
    throw new Error(`${atlasId}: ${result.error.code}`)
  }
}

interface PresetFile {
  id: string
  atlasId: AtlasId
  type: PresetType
  path: string
  json: string
}

// Every file of configs/presets, which scripts/validate-configs.ts keeps declared once in the registry
export function readPresetFiles(): PresetFile[] {
  const registryIds = new Map<string, string>(atlasRegistry.atlases.flatMap(atlas => (atlas.presets ?? [])
    .map(({ id, configPath }) => [`configs/${configPath.replace(/^\.\//, '')}`, id] as const)))

  return readdirSync('configs/presets').flatMap(atlasId => readdirSync(`configs/presets/${atlasId}`).map((file) => {
    const path = `configs/presets/${atlasId}/${file}`
    const json = readFileSync(path, 'utf8')
    return {
      id: registryIds.get(path)!,
      atlasId: atlasId as AtlasId,
      // A composite-custom preset has no type field
      type: (JSON.parse(json).type ?? 'composite-custom') as PresetType,
      path,
      json,
    }
  }))
}

export interface CompositeSource {
  id: string
  atlasId: AtlasId
  presetId?: PresetId
  json: string
  config: CompositeProjectionConfig
}

// Each composite-custom preset, and each fixture: a projection family or a case that the presets leave out, or the rendering parameters
export function readCompositeSources(): CompositeSource[] {
  const presets = readPresetFiles()
    .filter(preset => preset.type === 'composite-custom')
    .map(({ id, atlasId, json }) => ({ id, atlasId, presetId: id as PresetId, json, config: JSON.parse(json) as CompositeProjectionConfig }))

  const families = readdirSync('src/__tests__/fixtures/families').map((file) => {
    const json = readFileSync(`src/__tests__/fixtures/families/${file}`, 'utf8')
    const config = JSON.parse(json) as CompositeProjectionConfig
    return { id: file, atlasId: config.metadata.atlasId as AtlasId, json, config }
  })

  return [...presets, ...families]
}
