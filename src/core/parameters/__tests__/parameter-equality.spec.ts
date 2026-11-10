import { describe, expect, it } from 'vitest'
import { areParametersEqual } from '../parameter-equality'

describe('areParametersEqual', () => {
  it('compares the values in depth', () => {
    expect(areParametersEqual({ rotate: [10, 20, 0], scaleMultiplier: 1 }, { scaleMultiplier: 1, rotate: [10, 20, 0] })).toBe(true)
    expect(areParametersEqual({ rotate: [10, 20, 0] }, { rotate: [10, 21, 0] })).toBe(false)
  })

  it('finds a difference when a key is missing on one side', () => {
    expect(areParametersEqual({ scaleMultiplier: 1, precision: 0.1 }, { scaleMultiplier: 1 })).toBe(false)
    expect(areParametersEqual({ scaleMultiplier: 1 }, { scaleMultiplier: 1, precision: 0.1 })).toBe(false)
  })

  it('ignores a key whose value is undefined', () => {
    expect(areParametersEqual({ scaleMultiplier: 1, rotate: undefined }, { scaleMultiplier: 1 })).toBe(true)
    expect(areParametersEqual({ center: undefined }, { rotate: undefined })).toBe(true)
  })

  it('finds a difference between arrays of different lengths', () => {
    expect(areParametersEqual({ rotate: [10, 20] }, { rotate: [10, 20, 0] })).toBe(false)
  })

  it('compares the pixel clip extent', () => {
    expect(areParametersEqual({ pixelClipExtent: [0, 0, 100, 50] }, { pixelClipExtent: [0, 0, 100, 50] })).toBe(true)
    expect(areParametersEqual({ pixelClipExtent: [0, 0, 100, 50] }, { pixelClipExtent: [0, 0, 100, 51] })).toBe(false)
  })
})
