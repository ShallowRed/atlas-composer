import type { GeoBounds, SubProjectionEntry } from '@atlas-composer/projection-core'
import type { CompositeProjectionConfig, ProjectionParameters } from '@atlas-composer/specification'
import type { GeoConicProjection } from 'd3-geo'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { applyRenderingParameters, boundsToArray, buildCompositeProjection, calculateClipExtentFromBounds, CENTER_PLACED_CYLINDRICAL_IDS, invertWithBoundsValidation } from '@atlas-composer/projection-core'
import { DEFAULT_SCALE_MULTIPLIER, PROJECTION_CATALOG } from '@atlas-composer/specification'
import { geoConicConformal, geoConicEqualArea, geoEquirectangular, geoMercator } from 'd3-geo'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { ConfigValidationError, ProjectionLoader, validateConfig } from '../src'
import { d3ProjectionFactories } from '../src/d3-projection-helpers'
import { presetOf } from './presets'

function readFormatFixture(name: string): CompositeProjectionConfig {
  return JSON.parse(readFileSync(resolve(import.meta.dirname, `../../specification/__tests__/fixtures/valid/${name}.json`), 'utf8'))
}

describe('projection-loader', () => {
  const loader = new ProjectionLoader()

  beforeAll(() => {
    loader.registerAll(d3ProjectionFactories)
  })

  const mockConfig: CompositeProjectionConfig = {
    version: '1.0',
    metadata: {
      atlasId: 'france',
      atlasName: 'France',
      exportDate: '2025-10-16T16:00:00.000Z',
      createdWith: 'atlas-composer',
    },
    referenceScale: 2700,
    canvasDimensions: {
      width: 960,
      height: 500,
    },
    territories: [
      {
        code: 'FR-MET',
        name: 'France Métropolitaine',
        projection: {
          id: 'conic-conformal',
          family: 'CONIC',
          parameters: {
            rotate: [-3, -46.2, 0],
            parallels: [0, 60],
            scaleMultiplier: 1,
          },
        },
        layout: {
          translateOffset: [0, 0],
          pixelClipExtent: [-280, -250, 270, 250],
        },
        bounds: [
          [-6.5, 41],
          [10, 51.5],
        ],
      },
      {
        code: 'FR-GP',
        name: 'Guadeloupe',
        projection: {
          id: 'mercator',
          family: 'CYLINDRICAL',
          parameters: {
            center: [-61.46, 16.14],
            scaleMultiplier: 1.4,
          },
        },
        layout: {
          translateOffset: [-324, -38],
          pixelClipExtent: [-54, -48, 55, 38],
        },
        bounds: [
          [-61.81, 15.83],
          [-61, 16.52],
        ],
      },
    ],
  }

  describe('validateConfig', () => {
    it('should accept a correct configuration', () => {
      expect(validateConfig(mockConfig)).toEqual({ valid: true, errors: [], warnings: [] })
    })

    it('should report a missing field', () => {
      const { valid, errors } = validateConfig({ ...mockConfig, metadata: undefined })

      expect(valid).toBe(false)
      expect(errors).toEqual([expect.objectContaining({ path: 'metadata', code: 'MISSING_FIELD' })])
    })

    it('should report a value outside the format', () => {
      const { valid, errors } = validateConfig({ ...mockConfig, territories: [] })

      expect(valid).toBe(false)
      expect(errors).toEqual([expect.objectContaining({ path: 'territories', code: 'INVALID_VALUE' })])
    })
  })

  describe('load', () => {
    it('should create a projection from valid configuration', () => {
      const projection = loader.load(mockConfig, {
        width: 800,
        height: 600,
      })

      expect(projection).toBeDefined()
      expect(typeof projection).toBe('function')
      expect(projection.scale).toBeDefined()
      expect(projection.translate).toBeDefined()
    })

    it('should accept any version of major 1', () => {
      expect(() => loader.load({ ...mockConfig, version: '1.1' }, { width: 800, height: 600 })).not.toThrow()
    })

    it('should throw a ConfigValidationError for a configuration the format refuses', () => {
      const invalid = { ...mockConfig, version: '2.0' }

      expect(() => loader.load(invalid, { width: 800, height: 600 })).toThrow(ConfigValidationError)
      expect(() => loader.load(invalid, { width: 800, height: 600 })).toThrow('version: must match pattern')
    })

    it('should load a territory without bounds, whose points the composite does not project', () => {
      const projection = loader.load(readFormatFixture('without-bounds'), { width: 960, height: 500 })

      expect(projection([-61.46, 16.14])).toBeNull()
    })

    it('should prefer the factory registered under an alias', () => {
      const aliasLoader = new ProjectionLoader()
      const identifierFactory = vi.fn(() => geoConicEqualArea())
      const aliasFactory = vi.fn(() => geoConicEqualArea())
      aliasLoader.register('conic-equal-area', identifierFactory)
      aliasLoader.register('albers', aliasFactory)
      const territory = mockConfig.territories[0]

      aliasLoader.load(
        { ...mockConfig, territories: [{ ...territory, projection: { ...territory.projection, id: 'albers' } }] },
        { width: 960, height: 500 },
      )

      expect(aliasFactory).toHaveBeenCalled()
      expect(identifierFactory).not.toHaveBeenCalled()
    })

    it('should reject unregistered projection IDs', () => {
      const invalid = {
        ...mockConfig,
        territories: [
          {
            ...mockConfig.territories[0]!,
            projection: {
              ...mockConfig.territories[0]!.projection,
              id: 'unknown-projection',
            },
          },
        ],
      }
      expect(() =>
        loader.load(invalid, { width: 800, height: 600 }),
      ).toThrow('is not registered')
    })

    it('should handle debug mode', () => {
      const projection = loader.load(mockConfig, {
        width: 800,
        height: 600,
        debug: true,
      })

      expect(projection).toBeDefined()
    })
  })

  describe('loadFromJSON', () => {
    it('should load projection from JSON string', () => {
      const jsonString = JSON.stringify(mockConfig)
      const projection = loader.loadFromJSON(jsonString, {
        width: 800,
        height: 600,
      })

      expect(projection).toBeDefined()
    })

    it('should reject invalid JSON', () => {
      expect(() =>
        loader.loadFromJSON('not valid json', { width: 800, height: 600 }),
      ).toThrow('Invalid JSON')
    })

    it('should throw a ConfigValidationError for a configuration the format refuses', () => {
      const invalid = JSON.stringify({ version: '1.0' })
      expect(() => loader.loadFromJSON(invalid, { width: 800, height: 600 })).toThrow(ConfigValidationError)
    })

    it('should list the errors of the format in the ConfigValidationError', () => {
      const invalid = JSON.stringify({ ...mockConfig, referenceScale: undefined })

      expect(() => loader.loadFromJSON(invalid, { width: 800, height: 600 })).toThrow(expect.objectContaining({
        name: 'ConfigValidationError',
        message: expect.stringContaining('- referenceScale: must have required property \'referenceScale\''),
        errors: [expect.objectContaining({ path: 'referenceScale', code: 'MISSING_FIELD' })],
      }))
    })
  })

  describe('getRegistered', () => {
    it('should return array of registered projection IDs', () => {
      const projections = loader.getRegistered()

      expect(Array.isArray(projections)).toBe(true)
      expect(projections.length).toBeGreaterThan(0)
    })

    it('should include common projections', () => {
      const projections = loader.getRegistered()

      expect(projections).toContain('mercator')
      expect(projections).toContain('conic-conformal')
      expect(projections).toContain('azimuthal-equal-area')
    })
  })

  describe('projection functionality', () => {
    it('should project points correctly', () => {
      const projection = loader.load(mockConfig, {
        width: 800,
        height: 600,
      })

      // Project a point in France (Paris)
      const result = projection([2.35, 48.85])

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(typeof result![0]).toBe('number')
      expect(typeof result![1]).toBe('number')
    })

    it('should have scale and translate methods', () => {
      const projection = loader.load(mockConfig, {
        width: 800,
        height: 600,
      })

      expect(projection.scale).toBeDefined()
      expect(typeof projection.scale).toBe('function')
      expect(projection.translate).toBeDefined()
      expect(typeof projection.translate).toBe('function')
    })

    it('should have stream method for geometry', () => {
      const projection = loader.load(mockConfig, {
        width: 800,
        height: 600,
      })

      expect(projection.stream).toBeDefined()
      expect(typeof projection.stream).toBe('function')

      const mockStream = {
        point: () => {},
        lineStart: () => {},
        lineEnd: () => {},
        polygonStart: () => {},
        polygonEnd: () => {},
        sphere: () => {},
      }

      if (projection.stream) {
        const stream = projection.stream(mockStream)
        expect(stream).toBeDefined()
      }
    })
  })

  describe('dynamic scale and translate', () => {
    const paris: [number, number] = [2.35, 48.85]

    it('should scale the canvas dimensions to fit the requested size', () => {
      const projection = loader.load(mockConfig, { width: 800, height: 600 })

      expect(projection.scale()).toBeCloseTo(2700 * 800 / 960)
      expect(projection.translate()).toEqual([400, 300])
    })

    it('should scale every territory around the translate', () => {
      const projection = loader.load(mockConfig, { width: 800, height: 600 })
      const [x, y] = projection(paris)!

      projection.scale(projection.scale() * 2)
      const [x2, y2] = projection(paris)!

      expect(x2 - 400).toBeCloseTo((x - 400) * 2)
      expect(y2 - 300).toBeCloseTo((y - 300) * 2)
    })

    it('should move every territory with the translate', () => {
      const projection = loader.load(mockConfig, { width: 800, height: 600 })
      const [x, y] = projection(paris)!

      projection.translate([450, 320])
      const [x2, y2] = projection(paris)!

      expect(x2).toBeCloseTo(x + 50)
      expect(y2).toBeCloseTo(y + 20)
    })

    it('should invert a point after a scale change', () => {
      const projection = loader.load(mockConfig, { width: 800, height: 600 })
      projection.scale(5000)

      const [lon, lat] = projection.invert(projection(paris)!)!

      expect(lon).toBeCloseTo(paris[0])
      expect(lat).toBeCloseTo(paris[1])
    })

    it('should fit a size as a load with that size', () => {
      const fitted = loader.load(mockConfig, { width: 800, height: 600 }).fitSize([1200, 400], {})
      const loaded = loader.load(mockConfig, { width: 1200, height: 400 })

      expect(fitted.scale()).toBeCloseTo(loaded.scale())
      expect(fitted(paris)).toEqual(loaded(paris))
    })

    it('should fit an extent by centering the fitted size in it', () => {
      const projection = loader.load(mockConfig, { width: 800, height: 600 })
        .fitExtent([[20, 20], [780, 580]], {})

      expect(projection.scale()).toBeCloseTo(2700 * 760 / 960)
      expect(projection.translate()).toEqual([400, 300])
    })
  })

  describe('d3 parameters', () => {
    function loadTerritory(
      parameters: ProjectionParameters,
      overrides: Partial<CompositeProjectionConfig['territories'][number]> = {},
    ): GeoConicProjection {
      const created: GeoConicProjection[] = []
      const spyLoader = new ProjectionLoader()
      spyLoader.register('conic-conformal', () => {
        const projection = geoConicConformal()
        vi.spyOn(projection, 'clipAngle')
        created.push(projection)
        return projection
      })
      const territory = mockConfig.territories[0]!
      spyLoader.load(
        { ...mockConfig, territories: [{ ...territory, projection: { ...territory.projection, parameters }, ...overrides }] },
        { width: 960, height: 500 },
      )
      return created.at(-1)!
    }

    it('should apply the parameters of the configuration as given', () => {
      const projection = loadTerritory({ center: [1, 2], rotate: [-3, -46.2], parallels: [44, 49] })

      expect(projection.center()).toEqual([1, 2])
      expect(projection.rotate()).toEqual([expect.closeTo(-3), expect.closeTo(-46.2), 0])
      expect(projection.parallels()).toEqual([44, 49])
    })

    describe('clipping', () => {
      const layout = { translateOffset: [0, 0] as [number, number] }

      it('should clip around the translate of the territory with pixelClipExtent', () => {
        const projection = loadTerritory({}, { layout: { ...layout, pixelClipExtent: [-100, -50, 100, 50] } })
        const [[x0, y0], [x1, y1]] = projection.clipExtent()!

        expect([x0, y0, x1, y1]).toEqual([
          expect.closeTo(380),
          expect.closeTo(200),
          expect.closeTo(580),
          expect.closeTo(300),
        ])
      })

      it('should clip at the bounds of a territory without pixelClipExtent', () => {
        const projection = loadTerritory({ rotate: [-3, -46.2], parallels: [44, 49] }, { layout, bounds: [[-5, 42], [8, 51]] })
        const [topLeft, bottomRight] = projection.clipExtent()!

        expect(topLeft[0]).toBeCloseTo(projection([-5, 51])![0], 3)
        expect(bottomRight[1]).toBeCloseTo(projection([8, 42])![1], 3)
      })

      it('should leave a territory with neither pixelClipExtent nor bounds without clip extent', () => {
        const projection = loadTerritory({}, { layout, bounds: undefined })

        expect(projection.clipExtent()).toBeNull()
      })
    })

    it('should apply a zero clip angle', () => {
      const projection = loadTerritory({ clipAngle: 0 })

      expect(projection.clipAngle).toHaveBeenCalledWith(0)
    })

    it('should apply the precision of the configuration', () => {
      const projection = loadTerritory({ precision: 0.1 })

      expect(projection.precision()).toBe(0.1)
    })

    it('should give a territory without scaleMultiplier the reference scale', () => {
      const projection = loadTerritory({})

      expect(projection.scale()).toBe(mockConfig.referenceScale * DEFAULT_SCALE_MULTIPLIER)
    })

    it('should keep the factory values of the parameters the configuration omits', () => {
      const projection = loadTerritory({})
      const factory = geoConicConformal()

      expect(projection.center()).toEqual(factory.center())
      expect(projection.rotate()).toEqual(factory.rotate())
      expect(projection.parallels()).toEqual(factory.parallels())
    })
  })

  describe('createSubProjections', () => {
    const options = { scale: mockConfig.referenceScale, translate: [480, 250] as [number, number] }

    it('should return the sub-projection of each territory by code', () => {
      const subProjections = loader.createSubProjections(mockConfig, options)

      expect([...subProjections.keys()]).toEqual(['FR-MET', 'FR-GP'])
    })

    it('should project a point as the composite projection at the same scale and translate', () => {
      const subProjections = loader.createSubProjections(mockConfig, options)
      const composite = loader.load(mockConfig, { width: 960, height: 500 })
      const pointeAPitre: [number, number] = [-61.53, 16.24]

      expect(composite.scale()).toBe(options.scale)
      expect(subProjections.get('FR-GP')!(pointeAPitre)).toEqual(composite(pointeAPitre))
    })

    it('should clip each sub-projection around the translate of its territory', () => {
      const subProjections = loader.createSubProjections(mockConfig, options)

      const [[x0, y0], [x1, y1]] = subProjections.get('FR-GP')!.clipExtent!()!

      expect([x0, y0, x1, y1].map(Math.round)).toEqual([480 - 324 - 54, 250 - 38 - 48, 480 - 324 + 55, 250 - 38 + 38])
    })

    it('should refuse an invalid configuration', () => {
      expect(() => loader.createSubProjections({ ...mockConfig, territories: [] }, options)).toThrow(ConfigValidationError)
    })
  })

  describe('pixelClipExtent support', () => {
    it('should handle pixelClipExtent format', () => {
      const configWithPixelClipExtent: CompositeProjectionConfig = {
        version: '1.0',
        metadata: {
          atlasId: 'test',
          atlasName: 'Test',
        },
        referenceScale: 2700,
        canvasDimensions: { width: 800, height: 600 },
        territories: [
          {
            code: 'XX',
            name: 'Test Territory',
            projection: {
              id: 'mercator',
              family: 'CYLINDRICAL',
              parameters: {
                center: [0, 0] as [number, number],
                scaleMultiplier: 1,
              },
            },
            layout: {
              translateOffset: [0, 0] as [number, number],
              pixelClipExtent: [-100, -100, 100, 100] as [number, number, number, number],
            },
            bounds: [
              [-10, -10],
              [10, 10],
            ] as [[number, number], [number, number]],
          },
        ],
      }

      const projection = loader.load(configWithPixelClipExtent, {
        width: 800,
        height: 600,
      })

      expect(projection).toBeDefined()
      expect(typeof projection).toBe('function')
    })

    it('should load a territory without pixelClipExtent', () => {
      const configWithoutClipExtent: CompositeProjectionConfig = {
        version: '1.0',
        metadata: {
          atlasId: 'test',
          atlasName: 'Test',
        },
        referenceScale: 2700,
        canvasDimensions: { width: 800, height: 600 },
        territories: [
          {
            code: 'XX',
            name: 'Test Territory',
            projection: {
              id: 'mercator',
              family: 'CYLINDRICAL',
              parameters: {
                center: [0, 0] as [number, number],
                scaleMultiplier: 1,
              },
            },
            layout: {
              translateOffset: [0, 0] as [number, number],
            },
            bounds: [
              [-10, -10],
              [10, 10],
            ] as [[number, number], [number, number]],
          },
        ],
      }

      const projection = loader.load(configWithoutClipExtent, {
        width: 800,
        height: 600,
      })

      expect(projection).toBeDefined()
    })
  })

  describe('inversion with bounds validation', () => {
    it('should validate inverted coordinates against territory bounds', () => {
      const projection = loader.load(mockConfig, {
        width: 800,
        height: 600,
      })

      // Test with coordinates that should invert to France
      const parisCoords = projection([2.35, 48.85]) // Paris
      if (parisCoords && (projection as any).invert) {
        const inverted = (projection as any).invert(parisCoords)
        expect(inverted).toBeDefined()
        expect(Array.isArray(inverted)).toBe(true)
        if (inverted) {
          // Should be close to original coordinates
          expect(Math.abs(inverted[0] - 2.35)).toBeLessThan(0.1)
          expect(Math.abs(inverted[1] - 48.85)).toBeLessThan(0.1)
        }
      }
    })

    it('should return null for coordinates that cannot be inverted', () => {
      const projection = loader.load(mockConfig, {
        width: 800,
        height: 600,
      })

      if ((projection as any).invert) {
        // Coordinates far outside any territory
        const result = (projection as any).invert([10000, 10000])
        expect(result).toBeNull()
      }
    })

    it('should handle inversion with debug mode', () => {
      const projection = loader.load(mockConfig, {
        width: 800,
        height: 600,
        debug: true,
      })

      const coords = projection([2.35, 48.85])
      if (coords && (projection as any).invert) {
        // Should not throw and should log debug info
        const inverted = (projection as any).invert(coords)
        expect(inverted).toBeDefined()
      }
    })

    it('inverts Naha in the frame of the Ryukyu Islands, inside the frame of the mainland', () => {
      const projection = loader.load(presetOf('japan-standard'), { width: 960, height: 500 })
      const naha: [number, number] = [127.68, 26.21]

      const [lon, lat] = projection.invert!(projection(naha)!)!

      expect(lon).toBeCloseTo(naha[0], 6)
      expect(lat).toBeCloseTo(naha[1], 6)
    })

    it('returns null for a pixel of the frame of Hokkaido whose inverse leaves its bounds, over the frame of the mainland', () => {
      const config = presetOf('japan-standard')
      const mainland = { ...config, territories: config.territories.filter(({ code }) => code === 'JP-MAIN') }

      expect(loader.load(mainland, { width: 960, height: 500 }).invert!([240, 188])).not.toBeNull()
      expect(loader.load(config, { width: 960, height: 500 }).invert!([240, 188])).toBeNull()
    })
  })

  describe('bounds across the antimeridian', () => {
    // Fiji, whose box crosses the antimeridian, and Tonga, east of it, in two frames side by side
    const FIJI: GeoBounds = { minLon: 174.5, minLat: -21.8, maxLon: -178.2, maxLat: -12.4 }
    const TONGA: GeoBounds = { minLon: -176.3, minLat: -22.4, maxLon: -173.7, maxLat: -15.5 }
    const SCALE = 1000

    function entryOf(id: string, rotate: [number, number, number], bounds: GeoBounds, translate: [number, number]): SubProjectionEntry {
      const projection = geoMercator().rotate(rotate).scale(SCALE).translate(translate)
      applyRenderingParameters(projection, { bounds }, translate)
      return { id, projection, bounds }
    }

    const entries = [entryOf('FJ', [-178, 0, 0], FIJI, [300, 0]), entryOf('TO', [175, 0, 0], TONGA, [700, 0])]
    const composite = buildCompositeProjection({ entries })

    it.each([
      ['FJ', [179.9, -16.5]],
      ['FJ', [-179.9, -16.5]],
      ['TO', [-175, -21]],
    ] as const)('projects a point of %s by its sub-projection and inverts it back', (code, point) => {
      const result = invertWithBoundsValidation(composite([...point])!, entries)

      expect(result?.territoryId).toBe(code)
      expect(result!.coordinates[0]).toBeCloseTo(point[0], 6)
      expect(result!.coordinates[1]).toBeCloseTo(point[1], 6)
    })

    it('draws a frame from the corners of a box across the antimeridian that holds the image of the box', () => {
      const { projection } = entryOf('FJ', [-178, 0, 0], FIJI, [300, 0])
      const [[x0, y0], [x1, y1]] = calculateClipExtentFromBounds(projection, FIJI)!
      const wrap = (lon: number) => (lon > 180 ? lon - 360 : lon)
      const eastEdge = FIJI.maxLon + 360

      expect(x0).toBeLessThan(x1)
      expect(y0).toBeLessThan(y1)
      // The fraction 0.9 of the longitudes falls west of the antimeridian, at -179.93
      for (const fx of [0.25, 0.5, 0.75, 0.9]) {
        for (const fy of [0.25, 0.5, 0.75]) {
          const [x, y] = projection([wrap(FIJI.minLon + fx * (eastEdge - FIJI.minLon)), FIJI.minLat + fy * (FIJI.maxLat - FIJI.minLat)])!
          expect(x).toBeGreaterThan(x0)
          expect(x).toBeLessThan(x1)
          expect(y).toBeGreaterThan(y0)
          expect(y).toBeLessThan(y1)
        }
      }
    })

    it('inverts a point across the antimeridian through a loaded configuration', () => {
      const territory = (code: string, rotate: [number, number, number], bounds: GeoBounds, x: number) => ({
        code,
        name: code,
        projection: { id: 'mercator', family: 'CYLINDRICAL' as const, parameters: { rotate, scaleMultiplier: 1 } },
        layout: { translateOffset: [x, 0] as [number, number] },
        bounds: boundsToArray(bounds),
      })
      const config: CompositeProjectionConfig = {
        ...mockConfig,
        version: '1.1',
        referenceScale: SCALE,
        territories: [territory('FJ', [-178, 0, 0], FIJI, -180), territory('TO', [175, 0, 0], TONGA, 220)],
      }
      const projection = loader.load(config, { width: 960, height: 500 })

      for (const point of [[179.9, -16.5], [-179.9, -16.5], [-175, -21]] as [number, number][]) {
        const [lon, lat] = projection.invert!(projection(point)!)!
        expect(lon).toBeCloseTo(point[0], 6)
        expect(lat).toBeCloseTo(point[1], 6)
      }
    })
  })

  describe('cylindrical projections placed by their center', () => {
    it.each(CENTER_PLACED_CYLINDRICAL_IDS)('names %s, a cylindrical projection of the catalog', (projectionId) => {
      expect(PROJECTION_CATALOG[projectionId as keyof typeof PROJECTION_CATALOG]?.family).toBe('CYLINDRICAL')
    })

    // The Aleutian Islands, whose box crosses the antimeridian, placed by the center of a mercator or an equirectangular
    const ALEUTIANS: [[number, number], [number, number]] = [[172.49, 51.37], [-159.36, 63.73]]
    const SCALE = 1000

    function configOf(projectionId: string): CompositeProjectionConfig {
      return {
        ...mockConfig,
        version: '1.1',
        referenceScale: SCALE,
        territories: [{
          code: 'US-ALEU',
          name: 'Aleutian Islands',
          projection: { id: projectionId, family: 'CYLINDRICAL', parameters: { center: [-175, 52], scaleMultiplier: 1 } },
          layout: { translateOffset: [0, 0] },
          bounds: ALEUTIANS,
        }],
      }
    }

    it.each([
      ['mercator', geoMercator],
      ['equirectangular', geoEquirectangular],
    ] as const)('draws a %s with the image of its center alone, moved by a turn of the world across the old cut', (projectionId, factory) => {
      const projection = loader.load(configOf(projectionId), { width: 960, height: 500 })
      const alone = factory().center([-175, 52]).scale(SCALE).translate([480, 250])
      const sameSide = projection([-170, 55])!
      const across = projection([179.5, 52])!

      expect(sameSide[0]).toBeCloseTo(alone([-170, 55])![0], 6)
      expect(sameSide[1]).toBeCloseTo(alone([-170, 55])![1], 6)
      expect(across[0]).toBeCloseTo(alone([179.5, 52])![0] - 2 * Math.PI * SCALE, 6)
      expect(across[1]).toBeCloseTo(alone([179.5, 52])![1], 6)
    })

    it('draws Attu, at 173° E, inside the frame of the box of the Aleutian Islands', () => {
      const projection = loader.createSubProjections(configOf('mercator'), { scale: SCALE, translate: [480, 250] }).get('US-ALEU')!
      const [[x0, y0], [x1, y1]] = projection.clipExtent!()!
      const [x, y] = projection([173.2, 52.9])!

      expect(x0).toBeLessThan(x)
      expect(x).toBeLessThan(x1)
      expect(y0).toBeLessThan(y)
      expect(y).toBeLessThan(y1)
    })
  })
})
