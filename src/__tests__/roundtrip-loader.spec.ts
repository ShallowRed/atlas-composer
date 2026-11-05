import type { Point } from '@/__tests__/composite-utils'
import type { PresetId } from '@/types/branded'
import type { ExportedCompositeConfig } from '@/types/export-config'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { distance, importIntoApplication, loadPresetIntoApplication, loadWithLoader, pointsInBounds } from '@/__tests__/composite-utils'
import { readPresetFiles } from '@/__tests__/test-utils'

// The import modal requires the composite-custom view, which the usa atlas does not declare
vi.mock('@/core/atlases/registry', async importOriginal => ({
  ...await importOriginal<typeof import('@/core/atlases/registry')>(),
  getDefaultViewMode: vi.fn(() => 'composite-custom'),
}))

const TOLERANCE = 1e-6

const presets = readPresetFiles()
  .filter(preset => preset.type === 'composite-custom')
  .map(preset => ({ ...preset, config: JSON.parse(preset.json) as ExportedCompositeConfig }))

// Territories whose projections differ on the current code: the application
// applies either center or rotate and creates albers with the center of
// geoConicEqualArea, while the loader applies both and geoAlbers keeps its center.
const DIVERGENT_TERRITORIES = new Set([
  'usa-customcompsite-pseudod3cp/US-CONT',
  'usa-customcompsite-pseudod3cp/US-AK',
  'usa-customcompsite-pseudod3cp/US-HI',
  'usa-customcompsite-pseudod3cp/US-PR',
  'usa-customcompsite-pseudod3cp/US-GU',
  'usa-customcompsite-pseudod3cp/US-AS',
])

describe.each(presets)('$id', ({ id, atlasId, config, inRegistry }) => {
  const deviations = new Map<string, number>()

  beforeAll(async () => {
    const importedPoints = new Map<string, Array<Point | null>>()
    const imported = await importIntoApplication(config)
    for (const territory of config.territories) {
      importedPoints.set(territory.code, pointsInBounds(territory.bounds).map(point => imported.project(territory.code, point)))
    }
    const exported = JSON.parse(JSON.stringify(imported.exportToJSON())) as ExportedCompositeConfig

    const loadedPoints = new Map<string, Array<Point | null>>()
    if (inRegistry) {
      const loaded = await loadPresetIntoApplication(atlasId, id as PresetId)
      for (const territory of config.territories) {
        loadedPoints.set(territory.code, pointsInBounds(territory.bounds).map(point => loaded.project(territory.code, point)))
      }
    }

    for (const territory of config.territories) {
      const fromPreset = loadWithLoader(config, territory.code)
      const fromExport = loadWithLoader(exported, territory.code)
      const reference = importedPoints.get(territory.code)!
      const loaded = loadedPoints.get(territory.code)

      const deviation = Math.max(...pointsInBounds(territory.bounds).flatMap((point, i) => [
        distance(reference[i]!, fromPreset(point)),
        distance(reference[i]!, fromExport(point)),
        ...(loaded ? [distance(reference[i]!, loaded[i]!)] : []),
      ]))
      deviations.set(territory.code, deviation)
    }
  })

  it.each(config.territories.map(({ code }) => code))('%s', (code) => {
    if (DIVERGENT_TERRITORIES.has(`${id}/${code}`)) {
      expect(Number.isFinite(deviations.get(code))).toBe(true)
      expect(deviations.get(code)).toBeGreaterThan(TOLERANCE)
    }
    else {
      expect(deviations.get(code)).toBeLessThanOrEqual(TOLERANCE)
    }
  })
})
