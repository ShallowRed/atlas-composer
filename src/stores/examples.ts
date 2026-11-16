import type { Topology } from 'topojson-specification'
import type { I18nValue } from '#types'
import type { CompositionDemoInput, Earthquake, ExampleDefinition, ExampleMap, Place, TerritoryContours } from '@/core/examples'
import type { AtlasConfigError, PresetError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { PresetId } from '@/types/branded'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { EARTHQUAKE_FEED } from '@/core/examples'
import { err, ok } from '@/core/types/result'
import { loadAtlasConfiguration } from '@/services/atlas/atlas-config-loader'
import { JsonFileLoader } from '@/services/data/json-file-loader'
import { PresetLoader } from '@/services/presets/preset-loader'
import { renderExampleMap } from '@/services/rendering/example-map'

export interface CompositionDemoSource {
  input: CompositionDemoInput
  territoryNames: Map<string, I18nValue>
}

interface EarthquakeFeature {
  geometry?: { coordinates?: unknown }
  properties?: { mag?: unknown, place?: unknown, time?: unknown }
}

// The feed is read without a schema: a feature without a position or a magnitude is left out
function earthquakeOf({ geometry, properties }: EarthquakeFeature): Earthquake[] {
  const [longitude, latitude] = Array.isArray(geometry?.coordinates) ? geometry.coordinates : []
  const magnitude = properties?.mag
  if (typeof longitude !== 'number' || typeof latitude !== 'number' || typeof magnitude !== 'number') {
    return []
  }
  return [{ longitude, latitude, magnitude, label: String(properties?.place ?? ''), time: Number(properties?.time ?? 0) }]
}

export const useExamplesStore = defineStore('examples', () => {
  const earthquakesUnavailable = ref(false)
  let earthquakes: Promise<Earthquake[]> | null = null

  async function loadExampleMap(example: ExampleDefinition): Promise<Result<ExampleMap, PresetError>> {
    const preset = await PresetLoader.loadPreset(example.presetId)
    if (!preset.ok) {
      return preset
    }
    if (preset.value.type !== 'composite-custom') {
      throw new Error(`[ExamplesStore] Example ${example.id}: preset ${example.presetId} is not a composite-custom preset`)
    }

    const data = await JsonFileLoader.loadJSON<Topology>(example.dataPath)
    if (!data.ok) {
      return err(data.error)
    }

    return ok(renderExampleMap(preset.value.config, data.value, example))
  }

  async function loadCompositionDemo(presetId: PresetId): Promise<Result<CompositionDemoSource, PresetError | AtlasConfigError>> {
    const preset = await PresetLoader.loadPreset(presetId)
    if (!preset.ok) {
      return preset
    }
    if (preset.value.type !== 'composite-custom') {
      throw new Error(`[ExamplesStore] Composition demo: preset ${presetId} is not a composite-custom preset`)
    }
    const atlas = await loadAtlasConfiguration(preset.value.atlasId)
    if (!atlas.ok) {
      return atlas
    }

    const [territories, places] = await Promise.all([
      JsonFileLoader.loadUrl<TerritoryContours>(atlas.value.atlasConfig.geoDataConfig.dataPath),
      JsonFileLoader.loadJSON<Place[]>('examples/world-places.json'),
    ])
    if (!territories.ok) {
      return territories
    }
    if (!places.ok) {
      return places
    }

    return ok({
      input: { config: preset.value.config, territories: territories.value, places: places.value },
      territoryNames: new Map(atlas.value.territories.all.map(({ code, name }) => [code as string, name])),
    })
  }

  // The store keeps the feed while the app runs, whichever preset the demo draws: a failed read is retried on reload
  function loadEarthquakes(): Promise<Earthquake[]> {
    earthquakes ??= JsonFileLoader.loadUrl<{ features?: unknown }>(EARTHQUAKE_FEED).then((feed) => {
      const features = feed.ok && Array.isArray(feed.value?.features) ? feed.value.features as EarthquakeFeature[] : null
      earthquakesUnavailable.value = features === null
      return features?.flatMap(earthquakeOf) ?? []
    })
    return earthquakes
  }

  return { earthquakesUnavailable, loadExampleMap, loadCompositionDemo, loadEarthquakes }
})
