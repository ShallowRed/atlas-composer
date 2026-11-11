// @vitest-environment node
import type { TerritoryFeature } from '@atlas-composer/preset-library'
import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { ComposedTerritories } from '../src'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getPreset, listPresets } from '@atlas-composer/preset-library'
import { ProjectionLoader } from '@atlas-composer/projection-loader'
import { registerAllD3Projections } from '@atlas-composer/projection-loader/helpers'
import { afterAll, describe, expect, it } from 'vitest'
import { composeTerritories } from '../src'
import { ringsOf, signedArea } from './geometry'

const CLI = 'packages/cli/dist/cli.js'
const RADIANS = Math.PI / 180
const TOLERANCE = 1e-6

const loader = new ProjectionLoader()
registerAllD3Projections(factories => loader.registerAll(factories))

async function readPreset(presetId: string): Promise<CompositeProjectionConfig> {
  return (await getPreset(presetId))!
}

const directory = mkdtempSync(join(tmpdir(), 'atlas-composer-cli-'))
afterAll(() => rmSync(directory, { recursive: true, force: true }))

function runCompose(target: string, name: string) {
  const out = join(directory, `${name}.geojson`)
  execFileSync('node', [CLI, 'compose', target, '--out', out], { stdio: 'pipe' })
  return {
    collection: JSON.parse(readFileSync(out, 'utf8')) as ComposedTerritories['collection'],
    composition: JSON.parse(readFileSync(`${out}.json`, 'utf8')) as Omit<ComposedTerritories, 'collection'>,
  }
}

function failureOf(args: string[]): string {
  try {
    execFileSync('node', [CLI, ...args], { encoding: 'utf8', stdio: 'pipe' })
  }
  catch (error) {
    const { status, stderr } = error as { status: number, stderr: string }
    expect(status).toBe(1)
    return stderr
  }
  throw new Error(`atlas-composer ${args.join(' ')} exits with the code 0`)
}

/** Each vertex of the collection, converted back to the pixels of the composition, with the frame it stays in */
function expectVerticesInFrames(config: CompositeProjectionConfig, collection: ComposedTerritories['collection']) {
  const { referenceScale, canvasDimensions: { width, height } } = config
  const subProjections = loader.createSubProjections(config, { scale: referenceScale, translate: [width / 2, height / 2] })
  const k = 2 * Math.PI / Math.max(width, height)

  for (const feature of collection.features) {
    const [[x0, y0], [x1, y1]] = subProjections.get(feature.properties.code)!.clipExtent!() ?? [[0, 0], [width, height]]
    const frame = [Math.max(x0, 0), Math.max(y0, 0), Math.min(x1, width), Math.min(y1, height)] as const
    for (const [longitude, latitude] of ringsOf(feature.geometry).flat().flat()) {
      const x = longitude! * RADIANS / k + width / 2
      const y = height / 2 - Math.log(Math.tan(Math.PI / 4 + latitude! * RADIANS / 2)) / k
      expect(x).toBeGreaterThanOrEqual(frame[0] - TOLERANCE)
      expect(y).toBeGreaterThanOrEqual(frame[1] - TOLERANCE)
      expect(x).toBeLessThanOrEqual(frame[2] + TOLERANCE)
      expect(y).toBeLessThanOrEqual(frame[3] + TOLERANCE)
    }
  }
}

function expectRfc7946(collection: ComposedTerritories['collection']) {
  for (const feature of collection.features) {
    expect(Object.keys(feature).sort()).toEqual(['geometry', 'properties', 'type'])
    for (const [exterior, ...holes] of ringsOf(feature.geometry)) {
      expect(signedArea(exterior!)).toBeGreaterThan(0)
      for (const hole of holes)
        expect(signedArea(hole)).toBeLessThan(0)
      for (const [longitude, latitude] of [exterior!, ...holes].flat()) {
        expect(Math.abs(longitude!)).toBeLessThanOrEqual(180)
        expect(Math.abs(latitude!)).toBeLessThanOrEqual(85.06)
      }
    }
  }
}

describe('atlas-composer compose', () => {
  const presets = listPresets().map(preset => preset.id)

  it.each(presets)('should keep each territory of %s in its frame and in the canvas', async (presetId) => {
    const config = await readPreset(presetId)
    const { collection, composition } = runCompose(presetId, presetId)

    expect(collection.features.length).toBeGreaterThan(0)
    expect(composition.canvasDimensions).toEqual(config.canvasDimensions)
    expect(composition.referenceScale).toBe(config.referenceScale)
    expectVerticesInFrames(config, collection)
    expectRfc7946(collection)
  })

  it('should name the territories that the preset leaves out and those that their frame clips entirely', () => {
    expect(runCompose('usa-pseudo-d3cp', 'usa').composition.skippedCodes).toEqual(['US-ALEU', 'US-VI', 'US-MP'])

    const { collection, composition } = runCompose('france-proportional', 'france')
    expect(composition.emptyCodes).toEqual(['FR-TF'])
    expect(collection.features.map(feature => feature.properties.code)).not.toContain('FR-TF')
  })

  it('should clip to the canvas the territories of a file without pixelClipExtent', async () => {
    const config = await readPreset('portugal-standard')
    const withoutFrames = {
      ...config,
      territories: config.territories.map(({ layout: { pixelClipExtent, ...layout }, ...territory }) => ({ ...territory, layout })),
    } as CompositeProjectionConfig
    const file = join(directory, 'without-frames.json')
    writeFileSync(file, JSON.stringify(withoutFrames))

    const { collection } = runCompose(file, 'without-frames')
    expect(collection.features.map(feature => feature.properties.code)).toEqual(['PT-CONT', 'PT-20', 'PT-30'])
    expectVerticesInFrames(withoutFrames, collection)
    expectRfc7946(collection)
  })

  it('should exit with the code 1 for a target that it cannot compose', async () => {
    const out = join(directory, 'refused.geojson')

    expect(failureOf(['compose', 'atlantis', '--out', out])).toContain('Unknown preset "atlantis"')
    expect(failureOf(['compose', 'france-split', '--out', out])).toContain('composite-custom')
    expect(failureOf(['compose', 'france-standard'])).toContain('--out')
    expect(failureOf(['compose', 'france-standard', '--resolution', '10m', '--out', out])).toContain('at 50m')

    const config = await readPreset('portugal-standard')
    const unknownAtlas = join(directory, 'unknown-atlas.json')
    writeFileSync(unknownAtlas, JSON.stringify({ ...config, metadata: { ...config.metadata, atlasId: 'atlantis' } }))
    expect(failureOf(['compose', unknownAtlas, '--out', out])).toContain('Unknown atlas "atlantis"')

    const refused = join(directory, 'refused.json')
    writeFileSync(refused, JSON.stringify({ ...config, territories: [] }))
    expect(failureOf(['compose', refused, '--out', out])).toContain('Invalid composite projection configuration')
  })
})

describe('composeTerritories', async () => {
  const config = await readPreset('portugal-standard')

  function territory(code: string, coordinates: number[][][]): TerritoryFeature {
    return { type: 'Feature', id: code, properties: { id: code, code, name: code, iso: 'PRT' }, geometry: { type: 'Polygon', coordinates } }
  }
  // Clockwise in longitude and latitude, as d3-geo reads an exterior ring
  const square = (west: number, south: number, east: number, north: number) =>
    [[west, south], [west, north], [east, north], [east, south], [west, south]]

  it('should cut a territory at its frame', () => {
    // Mainland Portugal extended to the west, past the frame of PT-CONT
    const wide = territory('PT-CONT', [square(-30, 38, -7, 41)])
    const { collection } = composeTerritories(loader, config, { features: [wide] })

    const subProjection = loader.createSubProjections(config, {
      scale: config.referenceScale,
      translate: [config.canvasDimensions.width / 2, config.canvasDimensions.height / 2],
    }).get('PT-CONT')!
    expect(subProjection([-30, 39.5])![0]).toBeLessThan(subProjection.clipExtent!()![0][0])

    expect(collection.features).toHaveLength(1)
    expectVerticesInFrames(config, collection)
    expectRfc7946(collection)
  })

  it('should keep the hole of a territory', () => {
    const ring = square(-8.5, 39, -7.5, 40)
    const hole = [...square(-8.2, 39.3, -7.8, 39.7)].reverse()
    const { collection } = composeTerritories(loader, config, { features: [territory('PT-CONT', [ring, hole])] })

    const [polygon] = ringsOf(collection.features[0]!.geometry)
    expect(polygon).toHaveLength(2)
    expectRfc7946(collection)
  })
})
