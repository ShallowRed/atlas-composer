import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { Point } from '@/__tests__/composite-utils'
import type { AtlasId, PresetId } from '@/types/branded'
import { readdirSync, readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { distance, importIntoApplication, loadPresetIntoApplication, loadWithLoader, pointsInBounds } from '@/__tests__/composite-utils'
import { readPresetFiles } from '@/__tests__/test-utils'

const TOLERANCE = 1e-6

const presets = readPresetFiles()
  .filter(preset => preset.type === 'composite-custom')
  .map(preset => ({ ...preset, presetId: preset.id as PresetId, config: JSON.parse(preset.json) as CompositeProjectionConfig }))

// A configuration for each family of the catalog that the presets do not cover, and for the rendering parameters
const families = readdirSync('src/__tests__/fixtures/families').map((file) => {
  const json = readFileSync(`src/__tests__/fixtures/families/${file}`, 'utf8')
  const config = JSON.parse(json) as CompositeProjectionConfig
  return { id: file, atlasId: config.metadata.atlasId as AtlasId, json, config, presetId: undefined }
})

describe.each([...presets, ...families])('$id', ({ atlasId, json, config, presetId }) => {
  const deviations = new Map<string, number>()

  beforeAll(async () => {
    const importedPoints = new Map<string, Array<Point | null>>()
    const imported = await importIntoApplication(json)
    for (const territory of config.territories) {
      importedPoints.set(territory.code, pointsInBounds(territory.bounds!).map(point => imported.project(territory.code, point)))
    }
    const exported = JSON.parse(JSON.stringify(imported.exportToJSON())) as CompositeProjectionConfig

    const loadedPoints = new Map<string, Array<Point | null>>()
    if (presetId) {
      const loaded = await loadPresetIntoApplication(atlasId, presetId)
      for (const territory of config.territories) {
        loadedPoints.set(territory.code, pointsInBounds(territory.bounds!).map(point => loaded.project(territory.code, point)))
      }
    }

    for (const territory of config.territories) {
      const fromPreset = loadWithLoader(config, territory.code)
      const fromExport = loadWithLoader(exported, territory.code)
      const reference = importedPoints.get(territory.code)!
      const loaded = loadedPoints.get(territory.code)

      const deviation = Math.max(...pointsInBounds(territory.bounds!).flatMap((point, i) => [
        distance(reference[i]!, fromPreset(point)),
        distance(reference[i]!, fromExport(point)),
        ...(loaded ? [distance(reference[i]!, loaded[i]!)] : []),
      ]))
      deviations.set(territory.code, deviation)
    }
  })

  it.each(config.territories.map(({ code }) => code))('%s', (code) => {
    expect(deviations.get(code)).toBeLessThanOrEqual(TOLERANCE)
  })
})
