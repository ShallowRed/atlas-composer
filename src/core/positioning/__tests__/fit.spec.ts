import { describe, expect, it } from 'vitest'
import { compositionSlots, fitTerritory, nextFreeSlot, territoryRect } from '../fit'

const CANVAS = { width: 960, height: 500 }
const REFERENCE_SCALE = 2700
const MAINLAND = { projectionId: 'mercator', center: [2.5, 46.5] as [number, number] }
const MAINLAND_BOUNDS: [[number, number], [number, number]] = [[-6.5, 41], [10, 51]]

describe('fit of a territory into a box', () => {
  it('fits mainland France into the middle slot and keeps it there once placed', () => {
    const [box] = compositionSlots(CANVAS)
    const fit = fitTerritory({ projection: MAINLAND, bounds: MAINLAND_BOUNDS, box: box!, referenceScale: REFERENCE_SCALE, canvas: CANVAS })
    const rect = territoryRect({ projection: MAINLAND, bounds: MAINLAND_BOUNDS, ...fit, referenceScale: REFERENCE_SCALE, canvas: CANVAS })

    expect(rect.left).toBeGreaterThanOrEqual(box!.left - 1)
    expect(rect.right).toBeLessThanOrEqual(box!.right + 1)
    expect(rect.top).toBeGreaterThanOrEqual(box!.top - 1)
    expect(rect.bottom).toBeLessThanOrEqual(box!.bottom + 1)
    // The height of the territory fills the box, the limiting side of a territory taller than wide
    expect(rect.bottom - rect.top).toBeCloseTo(box!.bottom - box!.top, -1)
  })

  it('scales a small island above a large territory in the same box', () => {
    const box = { left: 0, top: 0, right: 100, bottom: 100 }
    const island = fitTerritory({ projection: { projectionId: 'mercator', center: [-61.5, 16.2] }, bounds: [[-61.9, 15.8], [-61, 16.6]], box, referenceScale: REFERENCE_SCALE, canvas: CANVAS })
    const mainland = fitTerritory({ projection: MAINLAND, bounds: MAINLAND_BOUNDS, box, referenceScale: REFERENCE_SCALE, canvas: CANVAS })
    expect(island.scaleMultiplier).toBeGreaterThan(mainland.scaleMultiplier * 5)
  })
})

describe('free slot of the canvas', () => {
  it('gives the middle slot on an empty canvas', () => {
    expect(nextFreeSlot([], CANVAS)).toEqual(compositionSlots(CANVAS)[0])
  })

  it('gives the first side slot that no territory covers', () => {
    const [main, first] = compositionSlots(CANVAS)
    expect(nextFreeSlot([main!, first!], CANVAS)).toEqual(compositionSlots(CANVAS)[2])
  })

  it('gives null once each slot is covered', () => {
    expect(nextFreeSlot([{ left: 0, top: 0, right: 960, bottom: 500 }], CANVAS)).toBeNull()
  })

  it('places the side slots inside the canvas, right of the middle slot', () => {
    const [main, ...side] = compositionSlots(CANVAS)
    for (const slot of side) {
      expect(slot.left).toBeGreaterThan(main!.right)
      expect(slot.right).toBeLessThanOrEqual(CANVAS.width)
      expect(slot.bottom).toBeLessThanOrEqual(CANVAS.height)
    }
  })
})
