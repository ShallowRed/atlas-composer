// @vitest-environment node
import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { GeoProjection } from 'd3-geo'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import Ajv from 'ajv'
import { describe, expect, it } from 'vitest'
import { ProjectionLoader } from '../src'
import { d3ProjectionFactories } from '../src/d3-projection-helpers'
import { describeComposite } from '../src/neutral'

const SCHEMAS = 'packages/specification/schemas'
const TOLERANCE = 1e-6

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

interface RegistryPreset { id: string, type: string, configPath: string }
const registry: { atlases: { presets: RegistryPreset[] }[] } = readJson('configs/atlas-registry.json')
const compositePresets = registry.atlases
  .flatMap(atlas => atlas.presets)
  .filter(preset => preset.type === 'composite-custom')
  .map((preset): [string, CompositeProjectionConfig] => [preset.id, readJson(`configs/${preset.configPath}`)])

function presetOf(presetId: string): CompositeProjectionConfig {
  return compositePresets.find(([id]) => id === presetId)![1]
}

/** A copy of portugal-standard reduced to its first territory, with another projection */
function withProjection(projection: CompositeProjectionConfig['territories'][number]['projection']): CompositeProjectionConfig {
  const config = presetOf('portugal-standard')
  return { ...config, territories: [{ ...config.territories[0], projection }] }
}

const hasCct = !spawnSync('cct', ['--version']).error
const requiresCct = process.env.REQUIRE_GIS_TOOLS === '1'

/** The pixels that cct gives for each point through the pipeline */
function runCct(pipeline: string, points: [number, number][]): [number, number][] {
  const { error, stdout, stderr, status } = spawnSync('cct', ['-d', '9', ...pipeline.split(' ')], {
    input: points.map(([longitude, latitude]) => `${longitude} ${latitude} 0 0\n`).join(''),
    encoding: 'utf8',
  })
  if (error || status !== 0) {
    throw new Error(`cct fails: ${error?.message ?? stderr}`)
  }
  return stdout.trim().split('\n').map((line) => {
    const [x, y] = line.trim().split(/\s+/).map(Number)
    return [x, y]
  })
}

describe('neutral description', () => {
  const validate = new Ajv()
    .addSchema(readJson(`${SCHEMAS}/definitions.schema.json`))
    .compile(readJson(`${SCHEMAS}/neutral-composite.schema.json`))

  it('lists at least one composite preset of the registry', () => {
    expect(compositePresets.length).toBeGreaterThan(0)
  })

  it.each(compositePresets)('passes the schema for %s', (_presetId, config) => {
    const description = describeComposite(config)

    expect(validate(description), JSON.stringify(validate.errors)).toBe(true)
    expect([
      ...description.territories.map(territory => territory.code),
      ...description.unsupported.map(territory => territory.code),
      ...description.emptyClipCodes,
    ].sort()).toEqual(config.territories.map(territory => territory.code).sort())
  })

  it.skipIf(!hasCct && !requiresCct).each(compositePresets)('gives through cct the pixels of the sub-projections of %s', (_presetId, config) => {
    const { referenceScale, canvasDimensions: { width, height } } = config
    const loader = new ProjectionLoader()
    loader.registerAll(d3ProjectionFactories)
    const subProjections = loader.createSubProjections(config, { scale: referenceScale, translate: [width / 2, height / 2] })

    const { territories } = describeComposite(config)
    expect(territories.length).toBeGreaterThan(0)

    for (const { code, pipeline, clip } of territories) {
      const sub = subProjections.get(code) as unknown as GeoProjection
      const [longitude, latitude] = sub.invert!([(clip[0][0] + clip[2][0]) / 2, (clip[0][1] + clip[2][1]) / 2])!
      const points = [-1, 0, 1].flatMap(dx => [-1, 0, 1].map((dy): [number, number] => [longitude + dx, latitude + dy]))

      const pixels = runCct(pipeline, points)
      expect(pixels).toHaveLength(points.length)
      for (const [index, point] of points.entries()) {
        const [x, y] = sub(point)!
        expect(Math.abs(pixels[index][0] - x), `${code} ${point} x`).toBeLessThan(TOLERANCE)
        expect(Math.abs(pixels[index][1] - y), `${code} ${point} y`).toBeLessThan(TOLERANCE)
      }
    }
  })

  it('writes the pipeline and the clip ring of the mainland of portugal-standard', () => {
    const territory = describeComposite(presetOf('portugal-standard')).territories.find(({ code }) => code === 'PT-CONT')

    expect(territory).toEqual({
      code: 'PT-CONT',
      pipeline: '+proj=pipeline +step +proj=unitconvert +xy_in=deg +xy_out=rad'
        + ' +step +proj=ob_tran +o_proj=lcc +o_lon_p=0 +o_lat_p=50.7 +lon_0=-10 +lat_1=0 +lat_2=60 +R=1'
        + ' +step +proj=affine +s11=4200 +s22=-4200 +xoff=480 +yoff=250',
      // The frame of the configuration goes beyond the canvas on three sides
      clip: [[431.700001, 0], [960, 0], [960, 500], [431.700001, 500], [431.700001, 0]],
      bounds: [[-9.5, 37], [-6.2, 42.2]],
    })
  })

  it('names in emptyClipCodes a territory whose frame has a zero area', () => {
    const description = describeComposite(presetOf('france-proportional'))

    expect(description.emptyClipCodes).toEqual(['FR-TF'])
    expect(description.territories.map(territory => territory.code)).not.toContain('FR-TF')
  })

  it('names in unsupported a conic projection with parallels symmetric about the equator', () => {
    const description = describeComposite(withProjection({
      id: 'conic-conformal',
      family: 'CONIC',
      parameters: { rotate: [10, 0, 0], parallels: [-20, 20] },
    }))

    expect(description.unsupported).toEqual([{ code: 'PT-CONT', reason: 'symmetric-parallels' }])
    expect(description.territories).toEqual([])
  })

  it('throws the error of the loader on a projection without factory', () => {
    const config = withProjection({ id: 'robinson', family: 'CYLINDRICAL', parameters: {} })

    expect(() => describeComposite(config)).toThrow('Projection "robinson" is not registered')
  })
})
