import type { JSONAtlasConfig } from '../../../types/atlas-config'
import type { SourceFeature } from '../src'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { geoArea } from 'd3-geo'
import { feature } from 'topojson-client'
import { describe, expect, it } from 'vitest'
import { buildTerritories, createNaturalEarthSource, TerritoryBuildError } from '../src'

const require = createRequire(import.meta.url)
const TOPOLOGY_PATHS = {
  '10m': require.resolve('world-atlas/countries-10m.json'),
  '50m': require.resolve('world-atlas/countries-50m.json'),
  '110m': require.resolve('world-atlas/countries-110m.json'),
} as const
type Resolution = keyof typeof TOPOLOGY_PATHS

const naturalEarthFeatures = new Map<Resolution, SourceFeature[]>()
function naturalEarth(resolution: Resolution) {
  if (!naturalEarthFeatures.has(resolution)) {
    const topology = JSON.parse(readFileSync(TOPOLOGY_PATHS[resolution], 'utf8'))
    naturalEarthFeatures.set(resolution, (feature(topology, topology.objects.countries) as unknown as { features: SourceFeature[] }).features)
  }
  return createNaturalEarthSource(naturalEarthFeatures.get(resolution)!, resolution)
}

const registry = JSON.parse(readFileSync('configs/atlas-registry.json', 'utf8')) as { atlases: Array<{ id: string, configPath: string }> }
function atlasConfig(id: string): JSONAtlasConfig {
  const entry = registry.atlases.find(atlas => atlas.id === id)!
  return JSON.parse(readFileSync(`configs/${entry.configPath.replace('./', '')}`, 'utf8'))
}

function issuesOf(run: () => unknown) {
  try {
    run()
  }
  catch (error) {
    if (error instanceof TerritoryBuildError)
      return error.issues
    throw error
  }
  throw new Error('The build did not fail')
}

function square(lon: number, lat: number, counterclockwise: boolean) {
  const ring = [[lon, lat], [lon + 1, lat], [lon + 1, lat + 1], [lon, lat + 1], [lon, lat]]
  return counterclockwise ? ring : ring.reverse()
}

describe('buildTerritories', () => {
  it.each(registry.atlases.map(atlas => atlas.id))('builds every territory of %s from Natural Earth', (id) => {
    const config = atlasConfig(id)
    const { collection } = buildTerritories(config, naturalEarth(config.territories === '*' ? '110m' : '50m'))

    if (config.territories !== '*') {
      expect(collection.features.map(territory => territory.properties.code).sort())
        .toEqual(config.territories.map(territory => territory.code).sort())
    }
    for (const territory of collection.features) {
      expect(geoArea(territory)).toBeLessThanOrEqual(2 * Math.PI)
    }
  })

  it('refuses another resolution than 50m for an atlas with extraction rules', () => {
    expect(issuesOf(() => buildTerritories(atlasConfig('france'), naturalEarth('110m')))).toEqual({ unsupportedResolution: '110m' })
  })

  it.each(['10m', '50m', '110m'] as const)('gives the world a territory per id at %s', (resolution) => {
    const { collection, skippedFeatures } = buildTerritories(atlasConfig('world'), naturalEarth(resolution))
    const codes = collection.features.map(territory => territory.properties.code)

    expect(new Set(codes).size).toBe(codes.length)
    expect(collection.features.every(territory => territory.properties.name !== '')).toBe(true)
    expect(skippedFeatures.length).toBeGreaterThan(0)
    if (resolution !== '110m') {
      expect(collection.features.find(territory => territory.properties.code === 'WD-036')?.properties.name).toBe('Australia')
    }
    for (const territory of collection.features) {
      expect(geoArea(territory)).toBeLessThanOrEqual(2 * Math.PI)
    }
  })

  it('extracts a territory by its bounds when its rule has no polygon indices', () => {
    const config = {
      territories: [
        { id: '1', code: 'MAIN', name: 'Main', iso: 'MAI', bounds: [[0, 0], [10, 10]], center: [5, 5] },
        { id: '1-I', code: 'ISLAND', name: 'Island', iso: 'MAI', bounds: [[20, 20], [22, 22]], center: [21, 21], extraction: { extractFrom: '1' } },
      ],
    } as Pick<JSONAtlasConfig, 'territories'>
    const source = createNaturalEarthSource([{
      type: 'Feature',
      id: '001',
      properties: { name: 'Main' },
      geometry: { type: 'MultiPolygon', coordinates: [[square(1, 1, false)], [square(20.5, 20.5, false)]] },
    }], '50m')

    const { collection } = buildTerritories(config, source)

    expect(collection.features.find(territory => territory.properties.code === 'ISLAND')?.geometry.coordinates).toEqual([[square(20.5, 20.5, false)]])
    expect(collection.features.find(territory => territory.properties.code === 'MAIN')?.geometry.coordinates).toEqual([[square(1, 1, false)]])
  })

  describe('features by code', () => {
    const portugal = atlasConfig('portugal')
    const byCode = (features: SourceFeature[]) => ({ kind: 'by-code' as const, features })
    const territory = (code: string, ring: number[][]): SourceFeature => ({ type: 'Feature', properties: { code }, geometry: { type: 'Polygon', coordinates: [ring] } })

    it('gathers the features of a code and turns rings of RFC 7946 into the order of d3', () => {
      const { collection } = buildTerritories(portugal, byCode([
        territory('PT-CONT', square(-9, 38, true)),
        territory('PT-CONT', square(-8, 40, true)),
        territory('PT-20', square(-17, 32, true)),
        territory('PT-30', square(-28, 38, false)),
      ]))

      const mainland = collection.features.find(feature => feature.properties.code === 'PT-CONT')!
      expect(mainland.geometry.coordinates).toEqual([[square(-9, 38, false)], [square(-8, 40, false)]])
      expect(mainland.properties).toEqual({ id: '620', code: 'PT-CONT', name: 'Portugal Continental', iso: 'PRT' })
      for (const feature of collection.features) {
        expect(geoArea(feature)).toBeLessThan(0.01)
      }
    })

    it('names the unknown and the missing codes', () => {
      expect(issuesOf(() => buildTerritories(portugal, byCode([territory('XX', square(0, 0, true))])))).toMatchObject({ unknownCodes: ['XX'] })
      expect(issuesOf(() => buildTerritories(portugal, byCode([territory('PT-CONT', square(-9, 38, true))])))).toEqual({ missingCodes: ['PT-20', 'PT-30'] })
    })

    it('refuses a ring that crosses the antimeridian and an atlas of every country', () => {
      const wide = [[170, 0], [-170, 0], [-170, 1], [170, 1], [170, 0]]
      expect(issuesOf(() => buildTerritories(portugal, byCode([territory('PT-CONT', wide)])))).toMatchObject({ antimeridianRings: ['PT-CONT'] })
      expect(issuesOf(() => buildTerritories(atlasConfig('world'), byCode([])))).toEqual({ byCodeOnWildcard: true })
    })
  })

  it('refuses an unknown Natural Earth resolution', () => {
    expect(issuesOf(() => createNaturalEarthSource([], '1m'))).toEqual({ unsupportedResolution: '1m' })
  })
})
