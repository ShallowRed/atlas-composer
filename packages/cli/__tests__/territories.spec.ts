// @vitest-environment node
import type { AreaGeometry, Ring } from '@atlas-composer/preset-library'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { failureOf, run } from './cli'
import { ringsOf, signedArea } from './geometry'

describe('atlas-composer territories', () => {
  const output = run(['territories', 'world'])
  const collection = JSON.parse(output) as { features: Array<{ properties: { code: string }, geometry: AreaGeometry }> }
  const polygons = collection.features.flatMap(feature => ringsOf(feature.geometry))

  it('should write every country of Natural Earth', () => {
    expect(collection.features.length).toBeGreaterThan(200)
  })

  it('should keep the longitudes within -180 and 180, with the rings cut at the antimeridian', () => {
    const longitudes = polygons.flat().flat().map(([longitude]) => longitude!)
    expect(Math.min(...longitudes)).toBeGreaterThanOrEqual(-180)
    expect(Math.max(...longitudes)).toBeLessThanOrEqual(180)

    const russia = collection.features.find(feature => feature.properties.code === 'WD-643')!
    const touchesAntimeridian = (ring: Ring) => ring.some(([longitude]) => Math.abs(longitude!) === 180)
    expect(ringsOf(russia.geometry).filter(([exterior]) => touchesAntimeridian(exterior!)).length).toBeGreaterThanOrEqual(2)
  })

  it('should orient the exterior rings counterclockwise and the holes clockwise, as RFC 7946 asks', () => {
    for (const [exterior, ...holes] of polygons) {
      expect(signedArea(exterior!)).toBeGreaterThan(0)
      for (const hole of holes)
        expect(signedArea(hole)).toBeLessThan(0)
    }
  })

  it('should keep a hole in the polygon that it pierces', () => {
    // Lesotho in South Africa
    const southAfrica = collection.features.find(feature => feature.properties.code === 'WD-710')!
    expect(ringsOf(southAfrica.geometry).filter(polygon => polygon.length === 2)).toHaveLength(1)
  })

  it('should keep the two ends of a run of vertices along the antimeridian', () => {
    for (const ring of polygons.flat()) {
      const onAntimeridian = ring.slice(0, -1).map(([longitude]) => Math.abs(longitude!) === 180)
      const runOfThree = onAntimeridian.some((on, index) => on && onAntimeridian.at(index - 1) && onAntimeridian.at(index - 2))
      expect(runOfThree).toBe(false)
      expect(ring.some(([longitude]) => 180 - Math.abs(longitude!) > 0 && 180 - Math.abs(longitude!) < 1e-3)).toBe(false)
    }
  })

  it('should leave a feature without the id member of the built territory', () => {
    expect(collection.features.every(feature => !('id' in feature))).toBe(true)
    expect(collection.features[0]!.properties).toHaveProperty('id')
  })

  it('should read the geometries of --data by the code of the territory', () => {
    const directory = mkdtempSync(join(tmpdir(), 'atlas-composer-cli-'))
    const data = join(directory, 'data.json')
    const square = [[[-9, 37], [-9, 42], [-6, 42], [-6, 37], [-9, 37]]]
    writeFileSync(data, JSON.stringify(['PT-CONT', 'PT-20', 'PT-30'].map(code =>
      ({ type: 'Feature', properties: { code }, geometry: { type: 'Polygon', coordinates: square } }))))

    const written = JSON.parse(run(['territories', 'portugal', '--data', data])) as typeof collection
    rmSync(directory, { recursive: true, force: true })

    expect(written.features.map(feature => feature.properties.code)).toEqual(['PT-CONT', 'PT-20', 'PT-30'])
    const [[exterior]] = ringsOf(written.features[0]!.geometry)
    expect(exterior).toHaveLength(5)
    expect(signedArea(exterior!)).toBeCloseTo(30)
  })

  it('should refuse --out, which compose reads', () => {
    expect(failureOf(['territories', 'portugal', '--out', 'portugal.geojson'])).toContain('standard output')
  })

  it('should name the atlases for an unknown atlas', () => {
    expect(failureOf(['territories', 'atlantis'])).toContain('Unknown atlas "atlantis"')
  })
})
