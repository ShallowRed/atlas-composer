import type { GeoProjection } from 'd3-geo'
import type { CompositeSource } from '@/__tests__/test-utils'
import type { TerritoryCode } from '@/types/branded'
import { describe, expect, it } from 'vitest'
import { importIntoApplication, loadSubProjection } from '@/__tests__/composite-utils'
import { readCompositeSources } from '@/__tests__/test-utils'
import { useParameterStore } from '@/stores/parameters'

const TOLERANCE = 1e-6
const RENDERING_PARAMETERS = 'rendering-parameters.json'

const sources = readCompositeSources()
const renderingParameters = sources.find(source => source.id === RENDERING_PARAMETERS)!

function renderingValues(projection: GeoProjection): number[] {
  return [
    projection.clipAngle() ?? 0,
    projection.precision(),
    ...(projection.clipExtent()?.flat() ?? []),
  ]
}

function expectSameValues(actual: number[], expected: number[]) {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((value, i) => expect(Math.abs(value - expected[i]!)).toBeLessThanOrEqual(TOLERANCE))
}

async function expectSameRendering({ json, config }: CompositeSource) {
  const application = await importIntoApplication(json, config.canvasDimensions)
  for (const territory of config.territories) {
    expectSameValues(
      renderingValues(loadSubProjection(config, territory.code)),
      renderingValues(application.subProjection(territory.code)),
    )
  }
}

describe('rendering parameters of the application and of the loader', () => {
  it.each(sources)('$id', expectSameRendering)
})

describe('import then export', () => {
  it('keeps clipAngle and precision', async () => {
    const { json, config } = renderingParameters
    const application = await importIntoApplication(json)
    const exported = application.exportToJSON()
    const [source] = config.territories
    const { parameters } = exported.territories.find(territory => territory.code === source!.code)!.projection
    expect(parameters.clipAngle).toBe(source!.projection.parameters.clipAngle)
    expect(parameters.precision).toBe(source!.projection.parameters.precision)
  })

  // A mercator placed by its center keeps in the file the center and rotate of the store, whatever the rotation that places its cut
  it.each(sources)('writes the center and the rotate of the store, rotate with three values, for $id', async ({ json, config }) => {
    const application = await importIntoApplication(json, config.canvasDimensions)
    const exported = application.exportToJSON()
    const parameterStore = useParameterStore()
    for (const territory of exported.territories) {
      const { center, rotate } = parameterStore.getEffectiveParameters(territory.code as TerritoryCode)
      const [lambda = 0, phi = 0, gamma = 0] = rotate ?? []
      // The export rounds the floating-point noise at 1e-9
      expect(territory.projection.parameters.rotate, territory.code).toHaveLength(3)
      expectSameValues(territory.projection.parameters.rotate!, [lambda, phi, gamma])
      expectSameValues(territory.projection.parameters.center!, center ?? [0, 0])
    }
  })
})
