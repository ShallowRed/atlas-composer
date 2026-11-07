import type { PresetType } from '#types'
import type { AtlasId } from '@/types/branded'
import { readdirSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import atlasRegistry from '#configs/atlas-registry.json'
import { vi } from 'vitest'
import { loadAtlasConfiguration } from '@/services/atlas/atlas-config-loader'

export async function loadAtlasFromConfigs(atlasId: AtlasId) {
  vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(`.${url}`, 'utf8')))
  await loadAtlasConfiguration(atlasId, 'en')
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
