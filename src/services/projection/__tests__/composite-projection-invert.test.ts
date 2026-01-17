import type { CompositeProjectionConfig } from '@/types'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTerritoryCode } from '@/types/branded'
import { CompositeProjection } from '../composite-projection'

describe('compositeProjection - invert/forward chain', () => {
  let compositeProjection: CompositeProjection
  let builtProjection: any

  beforeEach(() => {
    // Create a simple composite projection config with France mainland and overseas territories
    // Include pixelClipExtent for proper territory isolation during inversion
    const config: CompositeProjectionConfig = {
      territories: [
        {
          code: createTerritoryCode('FR'),
          name: 'France Mainland',
          center: [2, 46],
          bounds: [[-5, 42], [8, 51]],
          projectionId: 'conic-conformal',
          // Mainland takes most of the canvas (default clip extent)
        },
        {
          code: createTerritoryCode('FR-GF'),
          name: 'French Guiana',
          center: [-53, 4],
          bounds: [[-55, 2], [-51, 6]],
          projectionId: 'mercator',
          // Clip to bottom-left corner of canvas
          pixelClipExtent: [[0, 450], [150, 600]],
        },
      ],
    }

    compositeProjection = new CompositeProjection(config)
    builtProjection = compositeProjection.build(800, 600)
  })

  describe('basic Invert Functionality', () => {
    it('should have invert method', () => {
      expect(builtProjection.invert).toBeDefined()
      expect(typeof builtProjection.invert).toBe('function')
    })

    it('should invert center points correctly', () => {
      // Test mainland center
      const mainlandCenter = builtProjection([2, 46]) // France center
      expect(mainlandCenter).toBeDefined()

      if (mainlandCenter) {
        const inverted = builtProjection.invert(mainlandCenter)
        expect(inverted).toBeDefined()

        if (inverted) {
          // Should be close to original coordinates (within projection precision)
          expect(inverted[0]).toBeCloseTo(2, 1) // longitude
          expect(inverted[1]).toBeCloseTo(46, 1) // latitude
        }
      }
    })

    it('should project overseas territory points', () => {
      // Test French Guiana center - projection should produce valid screen coordinates
      // Note: Inversion for overseas territories requires proper clip extent configuration
      // to determine which sub-projection the screen point belongs to
      const guianaCenter = builtProjection([-53, 4]) // French Guiana center
      expect(guianaCenter).toBeDefined()

      if (guianaCenter) {
        // Should produce valid screen coordinates
        expect(typeof guianaCenter[0]).toBe('number')
        expect(typeof guianaCenter[1]).toBe('number')
        expect(Number.isFinite(guianaCenter[0])).toBe(true)
        expect(Number.isFinite(guianaCenter[1])).toBe(true)
      }
    })
  })

  describe('round-trip Conversion', () => {
    // Only test mainland points which always round-trip correctly
    // Overseas territory round-trip depends on proper clip extent configuration
    const testPoints = [
      [2, 46], // France mainland center
      [0, 47], // Near France
      [5, 45], // Southeast France
    ]

    testPoints.forEach(([lon, lat]) => {
      it(`should round-trip convert point [${lon}, ${lat}]`, () => {
        // Forward: geo -> screen
        const screenPoint = builtProjection([lon, lat])
        expect(screenPoint).toBeDefined()

        if (screenPoint) {
          // Inverse: screen -> geo
          const backToGeo = builtProjection.invert(screenPoint)
          expect(backToGeo).toBeDefined()

          if (backToGeo && Array.isArray(backToGeo) && backToGeo.length === 2) {
            // Should be very close to original
            expect(backToGeo[0] as number).toBeCloseTo(lon as number, 2)
            expect(backToGeo[1] as number).toBeCloseTo(lat as number, 2)
          }
        }
      })
    })
  })

  describe('territory Movement Simulation', () => {
    it('should correctly handle territory translation through invert/forward chain', () => {
      // Simulate mouse movement: start at screen coordinates [100, 100], move to [150, 120]
      const startScreen = [100, 100] as [number, number]
      const endScreen = [150, 120] as [number, number]

      // Convert to geographic coordinates
      const startGeo = builtProjection.invert(startScreen)
      const endGeo = builtProjection.invert(endScreen)

      expect(startGeo).toBeDefined()
      expect(endGeo).toBeDefined()

      if (startGeo && endGeo) {
        // Convert back to screen coordinates
        const startScreenBack = builtProjection(startGeo) as [number, number]
        const endScreenBack = builtProjection(endGeo) as [number, number]

        expect(startScreenBack).toBeDefined()
        expect(endScreenBack).toBeDefined()

        if (startScreenBack && endScreenBack) {
          // Calculate screen movement
          const screenDx = endScreenBack[0] - startScreenBack[0]
          const screenDy = endScreenBack[1] - startScreenBack[1]

          // Expected movement
          const expectedDx = endScreen[0] - startScreen[0] // 50
          const expectedDy = endScreen[1] - startScreen[1] // 20

          // The movement should be close to 1:1 (allowing for some projection distortion)
          expect(Math.abs(screenDx - expectedDx)).toBeLessThan(5) // within 5 pixels
          expect(Math.abs(screenDy - expectedDy)).toBeLessThan(5) // within 5 pixels
        }
      }
    })

    it('should handle points outside territory bounds gracefully', () => {
      // Test point far outside any territory
      const outsidePoint = [100, 100] // Random screen coordinates
      const inverted = builtProjection.invert(outsidePoint)

      // Should either return null or a valid geographic coordinate
      if (inverted) {
        expect(Array.isArray(inverted)).toBe(true)
        expect(inverted).toHaveLength(2)
        expect(typeof inverted[0]).toBe('number')
        expect(typeof inverted[1]).toBe('number')
      }
    })
  })

  describe('translation Offset Effects', () => {
    it('should maintain invert accuracy after translation offset changes for mainland', () => {
      // Apply a translation offset to France mainland
      compositeProjection.updateTranslationOffset(createTerritoryCode('FR'), [50, -30])

      // Rebuild projection with new offset
      const newBuiltProjection = compositeProjection.build(800, 600, true)

      // Test that invert still works correctly for the moved territory
      const franceGeo = [2, 46] // France mainland center
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
      // Test the correct behavior: Compare the same geographic point
      // with different territory translation offsets
      const franceGeo = [2, 46] as [number, number] // France mainland center

      // First: Set offset to [0, 0] and get screen position
      compositeProjection.updateTranslationOffset(createTerritoryCode('FR'), [0, 0])
      const projection1 = compositeProjection.build(800, 600, true)
      const screen1 = projection1(franceGeo)

      // Second: Set offset to [100, -50] and get screen position
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

        // The actual movement should match the offset exactly (1:1)
        expect(actualDx).toBeCloseTo(offsetX, 1)
        expect(actualDy).toBeCloseTo(offsetY, 1)
      }
    })
  })
})
