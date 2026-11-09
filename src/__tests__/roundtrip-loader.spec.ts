import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { Point } from '@/__tests__/composite-utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { distance, importIntoApplication, loadPresetIntoApplication, loadWithLoader, pointsInBounds } from '@/__tests__/composite-utils'
import { readCompositeSources } from '@/__tests__/test-utils'

const TOLERANCE = 1e-6

describe.each(readCompositeSources())('$id', ({ atlasId, json, config, presetId }) => {
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
