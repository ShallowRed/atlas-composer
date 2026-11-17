import type { AtlasTerritoriesInput } from '@atlas-composer/preset-library'
import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { Topology } from 'topojson-specification'
import type { PresetType } from '#types'
import type { CompositionDemoInput, Place, TerritoryContours } from '@/core/examples'
import type { CompositeTerritories } from '@/types'
import type { AtlasId, PresetId, TerritoryCode } from '@/types/branded'
import type { ActiveTerritoryProvider } from '@/types/territory'
import { readdirSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { buildTerritories, createNaturalEarthSource } from '@atlas-composer/preset-library'
import { mount } from '@vue/test-utils'
import { feature } from 'topojson-client'
import { vi } from 'vitest'
import { defineComponent } from 'vue'
import atlasRegistry from '#configs/atlas-registry.json'
import { getAtlasConfigPath } from '@/core/atlases/registry'
import i18n from '@/i18n'
import { loadAtlasConfiguration } from '@/services/atlas/atlas-config-loader'

export function withSetup<T>(composable: () => T): T {
  let result!: T
  mount(defineComponent({
    setup() {
      result = composable()
      return () => null
    },
  }), { global: { plugins: [i18n] } })
  return result
}

export async function loadAtlasFromConfigs(atlasId: AtlasId) {
  vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(`.${url}`, 'utf8')))
  const result = await loadAtlasConfiguration(atlasId)
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

// The configuration of an atlas, as configs/ holds it
export function readAtlasConfig<T>(atlasId: string): T {
  return JSON.parse(readFileSync(`configs/${getAtlasConfigPath(atlasId as AtlasId)!.replace('./', '')}`, 'utf8')) as T
}

const contoursByAtlas = new Map<string, TerritoryContours>()

// The contours of an atlas at 50m, built from world-atlas by the function that pnpm geodata:prepare calls at 10m to write src/public/data, which is not versioned
export function readAtlasContours(atlasId: string): TerritoryContours {
  if (!contoursByAtlas.has(atlasId)) {
    const atlas = readAtlasConfig<AtlasTerritoriesInput>(atlasId)
    const topology = JSON.parse(readFileSync(createRequire(import.meta.url).resolve('world-atlas/countries-50m.json'), 'utf8')) as Topology
    contoursByAtlas.set(atlasId, buildTerritories(atlas, createNaturalEarthSource(feature(topology, topology.objects.countries!), '50m')).collection)
  }
  return structuredClone(contoursByAtlas.get(atlasId)!)
}

// The entry of the composition demo for a preset, as loadCompositionDemo reads it
export function readCompositionDemoInput(presetId: string): CompositionDemoInput {
  const source = readCompositeSources().find(candidate => candidate.presetId === presetId)!
  return {
    config: structuredClone(source.config),
    territories: readAtlasContours(source.atlasId),
    places: JSON.parse(readFileSync('src/public/examples/world-places.json', 'utf8')) as Place[],
  }
}

// Every territory of the configuration is active, for a test of a service without the stores
export function allTerritoriesProvider(config: CompositeTerritories): ActiveTerritoryProvider {
  const codes: ReadonlySet<TerritoryCode> = new Set(config.territories.map(territory => territory.code as TerritoryCode))
  return { getActiveTerritoryCodes: () => codes }
}
