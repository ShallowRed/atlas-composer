import type { GeoProjection } from 'd3-geo'
import type { CompositeSource } from '@/__tests__/test-utils'
import { describe, expect, it } from 'vitest'
import { importIntoApplication, loadSubProjection } from '@/__tests__/composite-utils'
import { readCompositeSources } from '@/__tests__/test-utils'

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
})
