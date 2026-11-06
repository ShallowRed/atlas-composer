import type { Point } from '@/__tests__/composite-utils'
import type { TerritoryCode } from '@/types/branded'
import type { ExportedCompositeConfig } from '@/types/export-config'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { distance, importIntoApplication } from '@/__tests__/composite-utils'
import { getAtlasConfig } from '@/core/atlases/registry'
import { useParameterStore } from '@/stores/parameters'

const TOLERANCE = 1e-6

// Canvas of portugal-default.json, from which missing-scale-and-canvas.json is written
const CANVAS_DIMENSIONS = { width: 960, height: 500 }

// Files exported by the application at commit b36ab99, and files written by hand
// from portugal-default.json with one deprecated form each, with the coordinates
// their import gives at commit 0c8ac56.
const coordinates: Record<string, Record<string, Array<[Point, Point]>>> = JSON.parse(readFileSync('src/__tests__/fixtures/exports-coordinates.json', 'utf8'))

describe.each(Object.entries(coordinates))('import of %s', (name, territories) => {
  it('gives the coordinates of the application that wrote it', async () => {
    const config = JSON.parse(readFileSync(`src/__tests__/fixtures/exports/${name}.json`, 'utf8')) as ExportedCompositeConfig

    const application = await importIntoApplication(config, CANVAS_DIMENSIONS)

    for (const [code, points] of Object.entries(territories)) {
      for (const [point, expected] of points) {
        expect(distance(application.project(code, point), expected), `${code} ${point}`).toBeLessThanOrEqual(TOLERANCE)
      }
    }
  })
})

describe('import of a territory without positioning', () => {
  const code = 'FR-GP' as TerritoryCode

  it.each([
    { projectionId: 'mercator', family: 'cylindrical', parameter: 'center', other: 'rotate' },
    { projectionId: 'conic-conformal', family: 'conic', parameter: 'rotate', other: 'center' },
  ] as const)('gives the center of the atlas to a $family projection', async ({ projectionId, parameter, other }) => {
    const config = JSON.parse(readFileSync('src/__tests__/fixtures/exports/france-customcomposite-nsp.json', 'utf8')) as ExportedCompositeConfig
    const territory = config.territories.find(t => t.code === code)!
    const { focusLongitude, focusLatitude, rotate, center, ...parameters } = territory.projection.parameters
    territory.projection = { ...territory.projection, id: projectionId, parameters: { ...parameters, projectionId } }

    await importIntoApplication(config)

    const [longitude, latitude] = getAtlasConfig('france').compositeProjectionConfig!.territories.find(t => t.code === code)!.center!
    const expected = parameter === 'center' ? [longitude, latitude] : [-longitude, -latitude, 0]
    const effective = useParameterStore().getEffectiveParameters(code)
    expect(effective[other]).toBeUndefined()
    expect(effective[parameter]).toHaveLength(expected.length)
    expected.forEach((value, index) => expect(effective[parameter]![index]).toBeCloseTo(value, 9))
  })
})
