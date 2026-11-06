import type { CompositeProjectionConfig, ProjectionParameters } from '@atlas-composer/specification'
import type { GeoConicProjection } from 'd3-geo'

import { geoConicConformal } from 'd3-geo'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { d3ProjectionFactories } from '../src/d3-projection-helpers'
import { ProjectionLoader, validateConfig } from '../src/projection-loader'

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
    it('should validate a correct configuration', () => {
      expect(() => validateConfig(mockConfig)).not.toThrow()
    })

    it('should reject null/undefined', () => {
      expect(() => validateConfig(null)).toThrow('Configuration must be an object')
      expect(() => validateConfig(undefined)).toThrow('Configuration must be an object')
    })

    it('should reject configuration without version', () => {
      const invalid = { ...mockConfig, version: undefined }
      expect(() => validateConfig(invalid)).toThrow('must have a version')
    })

    it('should reject configuration without metadata', () => {
      const invalid = { ...mockConfig, metadata: undefined }
      expect(() => validateConfig(invalid)).toThrow('must have metadata')
    })

    it('should reject configuration without territories', () => {
      const invalid = { ...mockConfig, territories: undefined }
      expect(() => validateConfig(invalid)).toThrow('must have territories array')
    })

    it('should reject configuration with empty territories', () => {
      const invalid = { ...mockConfig, territories: [] }
      expect(() => validateConfig(invalid)).toThrow('at least one territory')
    })

    it('should reject territories without required fields', () => {
      const invalid = {
        ...mockConfig,
        territories: [{ name: 'Test' }],
      }
      expect(() => validateConfig(invalid)).toThrow('missing required field')
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

    it('should reject unsupported version', () => {
      const invalid = { ...mockConfig, version: '2.0' }
      expect(() =>
        loader.load(invalid, { width: 800, height: 600 }),
      ).toThrow('Unsupported configuration version')
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

    it('should reject malformed configuration in JSON', () => {
      const invalid = JSON.stringify({ version: '1.0' })
      expect(() => loader.loadFromJSON(invalid, { width: 800, height: 600 })).toThrow()
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
    function loadTerritory(parameters: ProjectionParameters): GeoConicProjection {
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
        { ...mockConfig, territories: [{ ...territory, projection: { ...territory.projection, parameters } }] },
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

    it('should apply a zero clip angle', () => {
      const projection = loadTerritory({ clipAngle: 0 })

      expect(projection.clipAngle).toHaveBeenCalledWith(0)
    })

    it('should apply the precision of the configuration', () => {
      const projection = loadTerritory({ precision: 0.1 })

      expect(projection.precision()).toBe(0.1)
    })

    it('should keep the factory values of the parameters the configuration omits', () => {
      const projection = loadTerritory({})
      const factory = geoConicConformal()

      expect(projection.center()).toEqual(factory.center())
      expect(projection.rotate()).toEqual(factory.rotate())
      expect(projection.parallels()).toEqual(factory.parallels())
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
            code: 'TEST',
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

    it('should handle null pixelClipExtent (fallback to default bounds)', () => {
      const configWithNullClipExtent = {
        version: '1.0',
        metadata: {
          atlasId: 'test',
          atlasName: 'Test',
        },
        referenceScale: 2700,
        canvasDimensions: { width: 800, height: 600 },
        territories: [
          {
            code: 'TEST',
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
              pixelClipExtent: null,
            },
            bounds: [
              [-10, -10],
              [10, 10],
            ] as [[number, number], [number, number]],
          },
        ],
      }

      const projection = loader.load(configWithNullClipExtent, {
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
  })
})
