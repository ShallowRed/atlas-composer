import type { AxisControl } from '../index'
import { describe, expect, it } from 'vitest'
import { boundDomain, CANVAS_LENGTH_CONTROL, ceilToFormat, floorToFormat, formatValue, isOutsideTrack, orderedPairLimits, parallelsForBand, parameterRegistry, parseValue, REFERENCE_SCALE_CONTROL, roundToFormat, roundToStep, stepFactor, stepValue, toDomain, trackScale, valueAtTrackPosition } from '../index'

const [longitude, latitude] = parameterRegistry.getAxisControls('center', 'CYLINDRICAL')!
const [left] = parameterRegistry.getAxisControls('pixelClipExtent', 'CONIC')!
const [scaleMultiplier] = parameterRegistry.getAxisControls('scaleMultiplier', 'CONIC')!

function upThenDown(value: number, control: AxisControl, factor = 1): number {
  return stepValue(stepValue(value, control, 1, factor), control, -1, factor)
}

describe('domain of an axis', () => {
  it('wraps a longitude', () => {
    expect(toDomain(190, longitude!.domain, longitude!.format)).toBe(-170)
    expect(toDomain(-181.5, longitude!.domain, longitude!.format)).toBe(178.5)
  })

  it('stops a latitude at the pole', () => {
    expect(toDomain(95, latitude!.domain, latitude!.format)).toBe(90)
  })

  it('keeps a value above an excluded bound', () => {
    expect(toDomain(0, { min: 0, max: 10, minExclusive: true }, { maximumSignificantDigits: 3 })).toBe(0.001)
    expect(toDomain(0, { min: 0, max: 180, minExclusive: true }, { maximumFractionDigits: 2 })).toBe(0.01)
  })

  it('narrows a domain by the axis it faces', () => {
    expect(boundDomain({ min: -2000, max: 2000 }, { max: 60 })).toEqual({ min: -2000, max: 60 })
    expect(boundDomain({ min: 0, max: 10, minExclusive: true }, { max: 5 })).toEqual({ min: 0, max: 5, minExclusive: true })
  })
})

describe('ordered pair', () => {
  it('keeps the first value one unit of the writing below the second', () => {
    expect(orderedPairLimits([44, 49], { maximumFractionDigits: 2 })).toEqual([{ max: 48.99 }, { min: 44.01 }])
  })

  it('rounds a dragged value to the step of the axis', () => {
    expect(roundToStep(43.27, 0.1)).toBe(43.3)
  })
})

describe('step of an axis', () => {
  it('gives back a preset value after up then down', () => {
    expect(upThenDown(69.348, longitude!)).toBe(69.348)
    expect(upThenDown(-49.28, latitude!, 10)).toBe(-49.28)
    expect(upThenDown(398.13, left!)).toBe(398.13)
  })

  it.each([0.06, 0.3, 0.35, 0.5, 0.6, 1, 1.5, 2, 2.7, 4, 5])('gives back the scale factor %s after up then down', (value) => {
    expect(upThenDown(value, scaleMultiplier!)).toBe(value)
    expect(upThenDown(value, scaleMultiplier!, 10)).toBe(value)
  })

  it('multiplies a ratio upwards and divides it downwards', () => {
    expect(stepValue(1, scaleMultiplier!, 1)).toBe(1.01)
    expect(stepValue(1, scaleMultiplier!, -1)).toBe(0.99)
  })

  it('reads Shift and Alt as factors of the step', () => {
    expect(stepFactor({ shiftKey: true, altKey: false })).toBe(10)
    expect(stepFactor({ shiftKey: false, altKey: true })).toBe(0.1)
    expect(stepFactor({ shiftKey: false, altKey: false })).toBe(1)
  })
})

describe('controls of the composition', () => {
  it('accepts any canvas length from 1 px, in whole pixels', () => {
    expect(toDomain(0, CANVAS_LENGTH_CONTROL.domain, CANVAS_LENGTH_CONTROL.format)).toBe(1)
    expect(toDomain(12000.4, CANVAS_LENGTH_CONTROL.domain, CANVAS_LENGTH_CONTROL.format)).toBe(12000)
  })

  it.each([700, 1070, 2700, 4800])('gives back the reference scale %s after up then down', (value) => {
    expect(upThenDown(value, REFERENCE_SCALE_CONTROL)).toBe(value)
    expect(upThenDown(value, REFERENCE_SCALE_CONTROL, 10)).toBe(value)
  })
})

describe('writing and reading of a value', () => {
  it('rounds to the writing of the axis', () => {
    expect(roundToFormat(1.23456, { maximumSignificantDigits: 3 })).toBe(1.23)
    expect(roundToFormat(-0.0001, { maximumFractionDigits: 2 })).toBe(0)
  })

  it('writes with the decimal separator of the locale, without grouping', () => {
    expect(formatValue(-629.37, left!.format, 'fr')).toBe('-629,37')
    expect(formatValue(1234.5, left!.format, 'en')).toBe('1234.5')
  })

  it.each([['fr', '-629,37'], ['fr', '-629.37'], ['en', '−629.37'], ['en', ' -629.37 ']])('reads %s %s', (locale, text) => {
    expect(parseValue(text, locale)).toBe(-629.37)
  })

  it('reads nothing from a text that is not a number', () => {
    expect(parseValue('abc', 'fr')).toBeNull()
    expect(parseValue('', 'en')).toBeNull()
  })
})

describe('track of an axis', () => {
  const track = scaleMultiplier!.track as Extract<NonNullable<AxisControl['track']>, { scale: unknown }>

  it('places a ratio on a logarithmic track and back', () => {
    expect(trackScale(track)(1)).toBeCloseTo(0.5)
    expect(valueAtTrackPosition(track, trackScale(track)(2.7), 0)).toBeCloseTo(2.7)
  })

  it('snaps to a detent', () => {
    expect(valueAtTrackPosition(track, 0.51)).toBe(1)
  })

  it('tells a value outside the track', () => {
    expect(isOutsideTrack(30, track)).toBe(true)
    expect(isOutsideTrack(3, track)).toBe(false)
  })
})

describe('standard parallels of a band', () => {
  it('places them at one sixth and five sixths of the band', () => {
    expect(parallelsForBand([41, 51])).toEqual([42.7, 49.3])
  })

  it('takes the edges rounded outward on a band too narrow for two distinct tenths, which the validation of a conic accepts', () => {
    const parallels = parallelsForBand([18.04, 18.13])

    expect(parallels).toEqual([18, 18.2])
    expect(parameterRegistry.validate('parallels', parallels, 'CONIC').ok).toBe(true)
  })
})

describe('rounding toward a direction at the precision of a format', () => {
  it('rounds down and up to the fraction digits of a format, without the noise of the product', () => {
    expect(floorToFormat(-378.805, { maximumFractionDigits: 2 })).toBe(-378.81)
    expect(ceilToFormat(-378.805, { maximumFractionDigits: 2 })).toBe(-378.8)
    expect(ceilToFormat(0.1 + 0.2, { maximumFractionDigits: 1 })).toBe(0.3)
  })

  it('rounds down and up to the significant digits of a format', () => {
    expect(floorToFormat(18_934.7, { maximumSignificantDigits: 4 })).toBe(18_930)
    expect(ceilToFormat(0.08637, { maximumSignificantDigits: 3 })).toBe(0.0864)
    expect(floorToFormat(0, { maximumSignificantDigits: 3 })).toBe(0)
  })
})
