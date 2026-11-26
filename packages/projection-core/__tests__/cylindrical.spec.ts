import { describe, expect, it } from 'vitest'
import { placeCylindrical } from '../src'

describe('placeCylindrical', () => {
  it.each([
    ['mercator', -175],
    ['mercator', 0],
    ['mercator', 179],
    ['equirectangular', -175],
  ])('turns a %s placed by its center at %d° by minus this longitude', (projectionId, longitude) => {
    expect(placeCylindrical(projectionId, { center: [longitude, 52] })).toEqual({ center: [0, 52], rotate: [-longitude + 0, 0, 0] })
  })

  it.each([[[0, 0]], [[0, 0, 0]]] as const)('reads the rotate %j as zero', (rotate) => {
    expect(placeCylindrical('mercator', { center: [-175, 52], rotate: [...rotate] })).toEqual({ center: [0, 52], rotate: [175, 0, 0] })
  })

  it.each([
    ['a rotate other than zero', 'mercator', { center: [-175, 52] as [number, number], rotate: [10, 0, 0] as [number, number, number] }],
    ['a clipAngle', 'mercator', { center: [-175, 52] as [number, number], clipAngle: 80 }],
    ['a transverse mercator', 'transverse-mercator', { center: [-175, 52] as [number, number] }],
    ['a conic', 'conic-conformal', { center: [-175, 52] as [number, number] }],
    ['no center', 'mercator', { rotate: [175, 0, 0] as [number, number, number] }],
  ])('keeps the parameters of a projection with %s', (_case, projectionId, parameters) => {
    const { clipAngle: _clipAngle, ...positioning } = parameters as typeof parameters & { clipAngle?: number }
    expect(placeCylindrical(projectionId, parameters)).toEqual({ center: positioning.center, rotate: positioning.rotate })
  })
})
