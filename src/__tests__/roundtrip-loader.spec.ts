import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { BuiltComposite, ClipExtent, Point } from '@/__tests__/composite-utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { distance, gridAcrossBounds, importIntoApplication, loadCompositeWithLoader, loadPresetIntoApplication, loadWithLoader, pointsInBounds } from '@/__tests__/composite-utils'
import { readAtlasConfig, readCompositeSources } from '@/__tests__/test-utils'
import { getAtlasConfig } from '@/core/atlases/registry'

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

const ANGLE_TOLERANCE = 1e-6

function samePoint(a: Point | null, b: Point | null, tolerance: number): boolean {
  return a === null || b === null ? a === b : Math.abs(a[0] - b[0]) <= tolerance && Math.abs(a[1] - b[1]) <= tolerance
}

function sameClipExtent(a: ClipExtent, b: ClipExtent): boolean {
  return a === null || b === null ? a === b : a.every((corner, i) => samePoint(corner, b[i]!, TOLERANCE))
}

// The composite of the application routes, inverts and clips each point as the loader does, inside and outside each box
describe.each(readCompositeSources())('$id, composite', ({ atlasId, json, config, presetId }) => {
  const { territories: declared } = readAtlasConfig<{ territories: Array<{ code: string }> | string }>(atlasId)
  const catalogueCodes = Array.isArray(declared) ? declared.map(({ code }) => code) : []
  const codes = [...new Set([...config.territories.map(({ code }) => code), ...catalogueCodes])]
  const failures = new Map<string, string[]>(codes.map(code => [code, []]))

  beforeAll(async () => {
    const reference = loadCompositeWithLoader(config)
    const applications: Array<[string, BuiltComposite]> = [['import', (await importIntoApplication(json, config.canvasDimensions)).composite(config.canvasDimensions)]]
    if (presetId) {
      applications.push(['preset', (await loadPresetIntoApplication(atlasId, presetId)).composite(config.canvasDimensions)])
    }
    const catalogue = getAtlasConfig(atlasId).compositeTerritories?.territories ?? []
    const boxes = [
      ...config.territories.filter(({ bounds }) => bounds).map(({ code, bounds }) => ({ code, source: 'file', bounds: bounds! })),
      ...catalogue.map(({ code, bounds }) => ({ code, source: 'catalogue', bounds })),
    ]

    for (const [path, application] of applications) {
      for (const { code } of config.territories) {
        if (!sameClipExtent(application.clipExtents.get(code) ?? null, reference.clipExtents.get(code) ?? null)) {
          failures.get(code)!.push(`${path}: clipExtent`)
        }
      }
      for (const { code, source, bounds } of boxes) {
        for (const point of gridAcrossBounds(bounds as [Point, Point])) {
          const projected = application.project(point)
          const expected = reference.project(point)
          if (!samePoint(projected, expected, TOLERANCE)) {
            failures.get(code)!.push(`${path}: ${source} ${point} projects to ${projected}, loader ${expected}`)
          }
          else if (projected && !samePoint(application.invert(projected), reference.invert(expected!), ANGLE_TOLERANCE)) {
            failures.get(code)!.push(`${path}: ${source} ${point} inverts to ${application.invert(projected)}, loader ${reference.invert(expected!)}`)
          }
        }
      }
    }
  })

  it.each(codes)('%s', (code) => {
    expect(failures.get(code)).toEqual([])
  })
})
