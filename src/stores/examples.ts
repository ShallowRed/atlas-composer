import type { Topology } from 'topojson-specification'
import type { ExampleDefinition, ExampleMap } from '@/core/examples'
import type { PresetError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import { defineStore } from 'pinia'
import { err, ok } from '@/core/types/result'
import { JsonFileLoader } from '@/services/data/json-file-loader'
import { PresetLoader } from '@/services/presets/preset-loader'
import { renderExampleMap } from '@/services/rendering/example-map'

export const useExamplesStore = defineStore('examples', () => {
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

  return { loadExampleMap }
})
