import type { GeographicTerritory } from '../geographic'
import type { TerritoryCode } from '@/types/branded'
import { geoPath } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { commonProjectionFor, detachAsInset, freeInsetSlot, geographicComposition, geographicProjection, insetSlots, isAtGeographicPosition, isInsideCanvas, mapExtent } from '../geographic'

const CANVAS = { width: 960, height: 500 }

function square(code: string, [lon, lat]: [number, number], size: number, area: number): GeographicTerritory {
  const half = size / 2
  return {
    code: code as TerritoryCode,
    center: [lon, lat],
    area,
    geometry: {
      type: 'Polygon',
      coordinates: [[[lon - half, lat - half], [lon - half, lat + half], [lon + half, lat + half], [lon + half, lat - half], [lon - half, lat - half]]],
    },
  }
}

const mainland = square('FR-MET', [2.5, 46.5], 10, 100)
const nearby = square('FR-NEAR', [4, 44], 1, 1)
const island = square('FR-RE', [55.5, -21.1], 0.6, 0.3)
const PROJECTION = { projectionId: 'natural-earth', rotate: [10, -45, 0] as [number, number, number] }

describe('geographic composition', () => {
  const composition = geographicComposition({ territories: [island, mainland, nearby], projection: PROJECTION, canvas: CANVAS })

  it('gives every territory the common projection, rotate, scale and offset', () => {
    expect(composition.activeTerritories).toEqual(['FR-RE', 'FR-MET', 'FR-NEAR'])
    for (const parameters of Object.values(composition.territoryParameters)) {
      expect(parameters).toEqual(composition.reference)
      expect(isAtGeographicPosition(parameters, composition.reference)).toBe(true)
    }
    expect(composition.reference).toMatchObject({ projectionId: 'natural-earth', rotate: [10, -45, 0], scaleMultiplier: 1 })
  })

  it('fits the largest territory to the part of the canvas left of the insets', () => {
    const projection = geographicProjection(composition.reference, composition.canvas.referenceScale, CANVAS)
    const [[left, top], [right, bottom]] = geoPath(projection).bounds(mainland.geometry)
    const extent = mapExtent(CANVAS)
    const touches = [Math.abs(left - extent.left), Math.abs(right - extent.right), Math.abs(top - extent.top), Math.abs(bottom - extent.bottom)]
    expect(Math.min(...touches)).toBeLessThan(1)
    expect(left).toBeGreaterThanOrEqual(extent.left - 1)
    expect(right).toBeLessThanOrEqual(extent.right + 1)
  })

  it('tells the territories inside the canvas from the territories outside it', () => {
    const projection = geographicProjection(composition.reference, composition.canvas.referenceScale, CANVAS)
    expect(isInsideCanvas(mainland.geometry, projection, CANVAS)).toBe(true)
    expect(isInsideCanvas(nearby.geometry, projection, CANVAS)).toBe(true)
    expect(isInsideCanvas(island.geometry, projection, CANVAS)).toBe(false)
  })
})

describe('inset of a detached territory', () => {
  const composition = geographicComposition({ territories: [mainland, island], projection: PROJECTION, canvas: CANVAS })
  const referenceScale = composition.canvas.referenceScale
  const [slot] = insetSlots(CANVAS)

  it('centers the projection on the territory and fits it to the slot', () => {
    const inset = detachAsInset({ ...island, projectionId: 'natural-earth' }, slot!, CANVAS, referenceScale)
    expect(inset.rotate).toEqual([-55.5, 21.1, 0])
    expect(isAtGeographicPosition(inset, composition.reference)).toBe(false)

    const projection = geographicProjection(inset, referenceScale, CANVAS)
    const [[left, top], [right, bottom]] = geoPath(projection).bounds(island.geometry)
    expect(left).toBeGreaterThanOrEqual(slot!.left)
    expect(right).toBeLessThanOrEqual(slot!.right)
    expect(top).toBeGreaterThanOrEqual(slot!.top)
    expect(bottom).toBeLessThanOrEqual(slot!.bottom)
  })

  it('frames the inset with the slot, relative to the point of the territory', () => {
    const inset = detachAsInset({ ...island, projectionId: 'natural-earth' }, slot!, CANVAS, referenceScale)
    const [x, y] = inset.translateOffset!
    const [left, top, right, bottom] = inset.pixelClipExtent!
    expect(CANVAS.width / 2 + x + left).toBeCloseTo(slot!.left, 1)
    expect(CANVAS.height / 2 + y + top).toBeCloseTo(slot!.top, 1)
    expect(CANVAS.width / 2 + x + right).toBeCloseTo(slot!.right, 1)
    expect(CANVAS.height / 2 + y + bottom).toBeCloseTo(slot!.bottom, 1)
  })

  it('takes the next slot once an inset covers the first one, and none once the grid is full', () => {
    const slots = insetSlots(CANVAS)
    const first = detachAsInset({ ...island, projectionId: 'natural-earth' }, slots[0]!, CANVAS, referenceScale)
    expect(freeInsetSlot([], CANVAS)).toEqual(slots[0])
    expect(freeInsetSlot([first], CANVAS)).toEqual(slots[1])

    const all = slots.map(each => detachAsInset({ ...island, projectionId: 'natural-earth' }, each, CANVAS, referenceScale))
    expect(freeInsetSlot(all, CANVAS)).toBeNull()
  })
})

describe('common projection of the geographic map', () => {
  it('keeps the projection of the unified view when a composition offers it', () => {
    expect(commonProjectionFor({ id: 'conic-conformal', parameters: { rotate: [-3, -46.2, 0], parallels: [44, 49] } }, [2.5, 46.5]))
      .toEqual({ projectionId: 'conic-conformal', center: undefined, rotate: [-3, -46.2, 0], parallels: [44, 49] })
  })

  it('centers an equal-area projection on the largest territory otherwise', () => {
    expect(commonProjectionFor({ id: 'natural-earth', parameters: { rotate: [10, -45, 0] } }, [2.5, 46.5]))
      .toMatchObject({ projectionId: 'azimuthal-equal-area', rotate: [-2.5, -46.5, 0] })
  })
})
