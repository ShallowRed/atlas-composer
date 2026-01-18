import type { ProjectionParameterProvider } from '../composite-projection'
import type { CompositeProjectionConfig } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { beforeEach, describe, expect, it } from 'vitest'
import { createProjectionId, createTerritoryCode } from '@/types/branded'
import { CompositeProjection } from '../composite-projection'

describe('compositeProjection - invert/forward chain', () => {
  let compositeProjection: CompositeProjection
  let builtProjection: any

  beforeEach(() => {
    const config: CompositeProjectionConfig = {
      territories: [
        {
          code: createTerritoryCode('FR'),
          name: 'France Metropolitan',
          center: [2, 46],
          bounds: [[-5, 42], [8, 51]],
        },
        {
          code: createTerritoryCode('FR-GF'),
          name: 'French Guiana',
          center: [-53, 4],
          bounds: [[-55, 2], [-51, 6]],
        },
      ],
    }

    const mockParameterProvider: ProjectionParameterProvider = {
      getEffectiveParameters: (territoryCode) => {
        const params: ProjectionParameters = {
          scaleMultiplier: 1.0,
        }
        if (territoryCode === 'FR') {
          params.projectionId = createProjectionId('conic-conformal')
          params.focusLongitude = 2
          params.focusLatitude = 46
        }
        else if (territoryCode === 'FR-GF') {
          params.projectionId = createProjectionId('mercator')
          params.focusLongitude = -53
          params.focusLatitude = 4
          params.pixelClipExtent = [0, 450, 150, 600]
        }
        return params
      },
      getExportableParameters: territoryCode => mockParameterProvider.getEffectiveParameters(territoryCode),
    }

    compositeProjection = new CompositeProjection(config, mockParameterProvider)
    builtProjection = compositeProjection.build(800, 600)
  })

  describe('basic Invert Functionality', () => {
    it('should have invert method', () => {
      expect(builtProjection.invert).toBeDefined()
      expect(typeof builtProjection.invert).toBe('function')
    })

    it('should invert center points correctly', () => {
      const franceCenter = builtProjection([2, 46])
      expect(franceCenter).toBeDefined()

      if (franceCenter) {
        const inverted = builtProjection.invert(franceCenter)
        expect(inverted).toBeDefined()

        if (inverted) {
          expect(inverted[0]).toBeCloseTo(2, 1)
          expect(inverted[1]).toBeCloseTo(46, 1) // latitude
        }
      }
    })

    it('should project secondary territory points', () => {
      const guianaCenter = builtProjection([-53, 4])
      expect(guianaCenter).toBeDefined()

      if (guianaCenter) {
        expect(typeof guianaCenter[0]).toBe('number')
        expect(typeof guianaCenter[1]).toBe('number')
        expect(Number.isFinite(guianaCenter[0])).toBe(true)
        expect(Number.isFinite(guianaCenter[1])).toBe(true)
      }
    })
  })

  describe('round-trip Conversion', () => {
    const testPoints = [
      [2, 46], // France metropolitan center
      [0, 47], // Near France
      [5, 45], // Southeast France
    ]

    testPoints.forEach(([lon, lat]) => {
      it(`should round-trip convert point [${lon}, ${lat}]`, () => {
        const screenPoint = builtProjection([lon, lat])
        expect(screenPoint).toBeDefined()

        if (screenPoint) {
          const backToGeo = builtProjection.invert(screenPoint)
          expect(backToGeo).toBeDefined()

          if (backToGeo && Array.isArray(backToGeo) && backToGeo.length === 2) {
            expect(backToGeo[0] as number).toBeCloseTo(lon as number, 2)
            expect(backToGeo[1] as number).toBeCloseTo(lat as number, 2)
          }
        }
      })
    })
  })

  describe('territory Movement Simulation', () => {
    it('should correctly handle territory translation through invert/forward chain', () => {
      const startScreen = [100, 100] as [number, number]
      const endScreen = [150, 120] as [number, number]

      const startGeo = builtProjection.invert(startScreen)
      const endGeo = builtProjection.invert(endScreen)

      expect(startGeo).toBeDefined()
      expect(endGeo).toBeDefined()

      if (startGeo && endGeo) {
        const startScreenBack = builtProjection(startGeo) as [number, number]
        const endScreenBack = builtProjection(endGeo) as [number, number]

        expect(startScreenBack).toBeDefined()
        expect(endScreenBack).toBeDefined()

        if (startScreenBack && endScreenBack) {
          const screenDx = endScreenBack[0] - startScreenBack[0]
          const screenDy = endScreenBack[1] - startScreenBack[1]

          const expectedDx = endScreen[0] - startScreen[0]
          const expectedDy = endScreen[1] - startScreen[1]

          expect(Math.abs(screenDx - expectedDx)).toBeLessThan(5)
          expect(Math.abs(screenDy - expectedDy)).toBeLessThan(5) // within 5 pixels
        }
      }
    })

    it('should handle points outside territory bounds gracefully', () => {
      const outsidePoint = [100, 100]
      const inverted = builtProjection.invert(outsidePoint)

      if (inverted) {
        expect(Array.isArray(inverted)).toBe(true)
        expect(inverted).toHaveLength(2)
        expect(typeof inverted[0]).toBe('number')
        expect(typeof inverted[1]).toBe('number')
      }
    })
  })

  describe('translation Offset Effects', () => {
    it('should maintain invert accuracy after translation offset changes', () => {
      compositeProjection.updateTranslationOffset(createTerritoryCode('FR'), [50, -30])

      const newBuiltProjection = compositeProjection.build(800, 600, true)

      const franceGeo = [2, 46]
      const screenPoint = newBuiltProjection(franceGeo as [number, number])

      expect(screenPoint).toBeDefined()

      if (screenPoint) {
        const backToGeo = newBuiltProjection.invert?.(screenPoint)
        expect(backToGeo).toBeDefined()

        if (backToGeo) {
          expect(backToGeo[0]).toBeCloseTo(2, 2)
          expect(backToGeo[1]).toBeCloseTo(46, 2)
        }
      }
    })

    it('should show expected screen coordinate changes after translation', () => {
      const franceGeo = [2, 46] as [number, number]

      compositeProjection.updateTranslationOffset(createTerritoryCode('FR'), [0, 0])
      const projection1 = compositeProjection.build(800, 600, true)
      const screen1 = projection1(franceGeo)

      const offsetX = 100
      const offsetY = -50
      compositeProjection.updateTranslationOffset(createTerritoryCode('FR'), [offsetX, offsetY])
      const projection2 = compositeProjection.build(800, 600, true)
      const screen2 = projection2(franceGeo)

      expect(screen1).toBeDefined()
      expect(screen2).toBeDefined()

      if (screen1 && screen2) {
        const actualDx = screen2[0] - screen1[0]
        const actualDy = screen2[1] - screen1[1]

        expect(actualDx).toBeCloseTo(offsetX, 1)
        expect(actualDy).toBeCloseTo(offsetY, 1)
      }
    })
  })
})
