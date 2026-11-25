import { describe, expect, it } from 'vitest'
import { parameterRegistry } from '@/core/parameters'
import { cornerHitSize, edgesBeyond, frameFromRect, frameHandles, framesOfTerritories, moveOffset, nearestTerritory, rectFromCorners, rectFromFrame, resizeFrame, visiblePart } from '../frame'

const CANVAS = { width: 960, height: 500 }

describe('visible part of a frame', () => {
  it('keeps a frame inside the canvas', () => {
    const rect = { left: 10, top: 20, right: 130, bottom: 180 }
    expect(visiblePart(rect, CANVAS)).toEqual(rect)
  })

  it('cuts a frame larger than the canvas, as the frame of mainland Portugal', () => {
    const rect = rectFromCorners([[431.7, -228], [1364.1, 532.7]])
    expect(visiblePart(rect, CANVAS)).toEqual({ left: 431.7, top: 0, right: 960, bottom: 500 })
    expect(edgesBeyond(rect, CANVAS)).toEqual({ left: false, top: true, right: true, bottom: true })
  })

  it('has no visible part outside the canvas or without area', () => {
    expect(visiblePart({ left: 1000, top: 0, right: 1100, bottom: 50 }, CANVAS)).toBeNull()
    expect(visiblePart({ left: 480, top: 0, right: 480, bottom: 0 }, CANVAS)).toBeNull()
  })
})

describe('handles of a frame', () => {
  const beyondNone = { left: false, top: false, right: false, bottom: false }

  it('puts eight handles on a large frame', () => {
    const handles = frameHandles({ left: 0, top: 0, right: 120, bottom: 160 }, beyondNone, 14)
    expect(handles.map(handle => handle.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(handles[5]).toEqual({ index: 5, x: 120, y: 80, beyond: false })
  })

  it('hides the handles of the sides of a small frame', () => {
    expect(frameHandles({ left: 0, top: 0, right: 30, bottom: 30 }, beyondNone, 14).map(handle => handle.index)).toEqual([0, 1, 2, 3])
  })

  it('marks the handles of an edge beyond the canvas', () => {
    const handles = frameHandles({ left: 0, top: 0, right: 120, bottom: 160 }, { ...beyondNone, right: true }, 14)
    expect(handles.filter(handle => handle.beyond).map(handle => handle.index)).toEqual([1, 2, 5])
  })

  it('keeps the inside of a small frame to grab', () => {
    expect(cornerHitSize({ left: 0, top: 0, right: 50, bottom: 33 }, 32)).toBe(11)
    expect(cornerHitSize({ left: 0, top: 0, right: 500, bottom: 300 }, 32)).toBe(32)
  })
})

describe('frame relative to its territory', () => {
  it('reads the frame of a territory from the rectangle on the map', () => {
    expect(frameFromRect({ left: 100, top: 300, right: 220, bottom: 460 }, [160, 410])).toEqual([-60, -110, 60, 50])
    expect(rectFromFrame([-60, -110, 60, 50], [160, 410])).toEqual({ left: 100, top: 300, right: 220, bottom: 460 })
  })
})

describe('resizing a frame', () => {
  const start: [number, number, number, number] = [-60, -80, 60, 80]
  const frameControls = parameterRegistry.getAxisControls('pixelClipExtent', 'CONIC')!

  it('moves the edges that the handle holds', () => {
    expect(resizeFrame(start, 2, 10, 5, frameControls)).toEqual([-60, -80, 70, 85])
    expect(resizeFrame(start, 5, 10, 5, frameControls)).toEqual([-60, -80, 70, 80])
    expect(resizeFrame(start, 4, 10, -5, frameControls)).toEqual([-60, -85, 60, 80])
  })

  it('resizes from the centre with Alt', () => {
    expect(resizeFrame(start, 5, 10, 0, frameControls, true)).toEqual([-70, -80, 70, 80])
  })

  it('stops an edge at the one it faces', () => {
    expect(resizeFrame(start, 7, 200, 0, frameControls)).toEqual([60, -80, 60, 80])
    expect(resizeFrame(start, 5, -200, 0, frameControls, true)).toEqual([0, -80, 0, 80])
  })

  it('keeps the empty frame of a preset valid', () => {
    expect(resizeFrame([0, -250, 0, -250], 2, -5, -5, frameControls)).toEqual([0, -250, 0, -250])
  })

  it('rounds the edges to the writing of their axis and stops them at its domain', () => {
    expect(resizeFrame([-60.004, -80, 1990, 80], 2, 20, 0.006, frameControls)).toEqual([-60, -80, 2000, 80.01])
  })
})

describe('moving a territory', () => {
  const controls = parameterRegistry.getAxisControls('translateOffset', 'CONIC')!

  it('adds the move to the position, rounded to the writing of the axis', () => {
    // Twenty presses of the arrow from -526.44 give -506.44000000000005 in floating point
    expect(moveOffset([-526.44, 10], 20, -20, controls)).toEqual([-506.44, -10])
  })

  it('stops at the bounds of the domain', () => {
    expect(moveOffset([1995, -1995], 10, -10, controls)).toEqual([2000, -2000])
  })

  it('keeps to the axis where the pointer went further', () => {
    expect(moveOffset([0, 0], 30, -20, controls, true)).toEqual([30, 0])
    expect(moveOffset([0, 0], 5, -20, controls, true)).toEqual([0, -20])
  })
})

describe('frame shared by territories', () => {
  const bounds: [[number, number], [number, number]] = [[100, 120], [209, 174]]

  it('holds the territories when their frames have the same rectangle, as Saint Martin and Saint Barthélemy', () => {
    const frames = framesOfTerritories([
      { territoryCode: 'FR-MF', bounds, point: [154, 141] },
      { territoryCode: 'FR-GP', bounds: [[100, 180], [209, 320]], point: [154, 250] },
      { territoryCode: 'FR-BL', bounds, point: [154, 141] },
    ])
    expect(frames.map(frame => frame.territoryCodes)).toEqual([['FR-MF', 'FR-BL'], ['FR-GP']])
    expect(frames[0]!.rect).toEqual({ left: 100, top: 120, right: 209, bottom: 174 })
  })

  const martin = { territoryCode: 'FR-MF', rect: { left: 140, top: 130, right: 150, bottom: 140 }, holdsPoint: false }
  const barthelemy = { territoryCode: 'FR-BL', rect: { left: 160, top: 145, right: 166, bottom: 150 }, holdsPoint: false }

  it('gives the pointer to the territory whose box is nearest', () => {
    expect(nearestTerritory([145, 135], [martin, barthelemy])).toBe('FR-MF')
    expect(nearestTerritory([170, 152], [martin, barthelemy])).toBe('FR-BL')
    expect(nearestTerritory([200, 170], [martin, barthelemy], 'FR-MF')).toBe('FR-BL')
  })

  it('gives the pointer to the territory whose shape holds it, though the box of another territory contains its box', () => {
    const around = { ...martin, rect: { left: 100, top: 120, right: 209, bottom: 174 } }
    expect(nearestTerritory([162, 147], [around, { ...barthelemy, holdsPoint: true }], 'FR-MF')).toBe('FR-BL')
  })

  it('keeps the selected territory at an equal distance, then the first', () => {
    const overlapping = [martin, { ...barthelemy, rect: martin.rect }] as const
    expect(nearestTerritory([145, 135], overlapping, 'FR-BL')).toBe('FR-BL')
    expect(nearestTerritory([145, 135], overlapping)).toBe('FR-MF')
    expect(nearestTerritory([145, 135], [{ ...martin, rect: null }, barthelemy])).toBe('FR-BL')
  })
})
