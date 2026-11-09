import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { GeoProjection } from 'd3-geo'
import { readdirSync, readFileSync } from 'node:fs'
import { boundsFromArray, calculateClipExtentFromBounds } from '@atlas-composer/projection-core'
import { ProjectionLoader } from '@atlas-composer/projection-loader'
import { d3ProjectionFactories } from '@atlas-composer/projection-loader/helpers'
import { describe, expect, it } from 'vitest'
import { importIntoApplication } from '@/__tests__/composite-utils'
import { readPresetFiles } from '@/__tests__/test-utils'

const TOLERANCE = 1e-6
const RENDERING_PARAMETERS = 'rendering-parameters.json'

interface Source {
  id: string
  json: string
  config: CompositeProjectionConfig
}

const presets: Source[] = readPresetFiles()
  .filter(preset => preset.type === 'composite-custom')
  .map(preset => ({ id: preset.id, json: preset.json, config: JSON.parse(preset.json) as CompositeProjectionConfig }))

const families: Source[] = readdirSync('src/__tests__/fixtures/families').map((file) => {
  const json = readFileSync(`src/__tests__/fixtures/families/${file}`, 'utf8')
  return { id: file, json, config: JSON.parse(json) as CompositeProjectionConfig }
})

const renderingParameters = families.find(family => family.id === RENDERING_PARAMETERS)!

function loadSubProjection(config: CompositeProjectionConfig, territoryCode: string): GeoProjection {
  let created: unknown
  const loader = new ProjectionLoader()
  loader.registerAll(Object.fromEntries(Object.entries(d3ProjectionFactories).map(([id, factory]) => [id, () => {
    created = factory()
    return created as ReturnType<typeof factory>
  }])))
  const { width, height } = config.canvasDimensions
  const territories = config.territories.filter(t => t.code === territoryCode)
  loader.loadFromJSON(JSON.stringify({ ...config, territories }), { width, height })
  return created as GeoProjection
}

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

async function expectSameRendering({ json, config }: Source) {
  const application = await importIntoApplication(json, config.canvasDimensions)
  for (const territory of config.territories) {
    expectSameValues(
      renderingValues(loadSubProjection(config, territory.code)),
      renderingValues(application.subProjection(territory.code)),
    )
  }
}

describe('rendering parameters of the application and of the loader', () => {
  it.each([...presets, ...families.filter(family => family.id !== RENDERING_PARAMETERS)])('$id', expectSameRendering)

  it.fails(RENDERING_PARAMETERS, () => expectSameRendering(renderingParameters))
})

describe('clipping of a territory without pixelClipExtent', () => {
  const { config } = renderingParameters
  const unclipped = config.territories.find(territory => !territory.layout.pixelClipExtent)!

  it.fails('the loader clips it at its bounds', () => {
    const projection = loadSubProjection(config, unclipped.code)
    const expected = calculateClipExtentFromBounds(projection as never, boundsFromArray(unclipped.bounds!))!
    expectSameValues(projection.clipExtent()?.flat() ?? [], expected.flat())
  })

  it('the loader leaves it without clipExtent when it has no bounds', () => {
    const { bounds: _bounds, ...territory } = unclipped
    const projection = loadSubProjection({ ...config, territories: [territory] }, unclipped.code)
    expect(projection.clipExtent()).toBeNull()
  })
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
