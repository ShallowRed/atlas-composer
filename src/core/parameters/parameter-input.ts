import type { AxisControl, AxisDomain, AxisFormat, AxisTrack } from '@/core/parameters/parameter-registry'
import { scaleLinear, scaleLog } from 'd3'

export type LatitudeBand = [south: number, north: number]

type ScaleTrack = Extract<AxisTrack, { scale: unknown }>

// Shift and Alt multiply the step of the arrows and of the scrub of a field
export function stepFactor(event: { shiftKey: boolean, altKey: boolean }): number {
  return event.shiftKey ? 10 : event.altKey ? 0.1 : 1
}

export function roundToFormat(value: number, format: AxisFormat): number {
  if ('maximumSignificantDigits' in format) {
    return value === 0 ? 0 : Number(value.toPrecision(format.maximumSignificantDigits))
  }
  const factor = 10 ** format.maximumFractionDigits
  // Adding zero turns -0 into 0
  return Math.round(value * factor) / factor + 0
}

// Rounds down or up at the precision of a format; toFixed drops the noise of the product before the rounding
function roundToFormatToward(value: number, format: AxisFormat, round: (value: number) => number): number {
  const decimals = 'maximumSignificantDigits' in format
    ? (value === 0 ? 0 : format.maximumSignificantDigits - 1 - Math.floor(Math.log10(Math.abs(value))))
    : format.maximumFractionDigits
  const rounded = round(Number((value * 10 ** decimals).toFixed(6)))
  // Adding zero turns -0 into 0
  return (decimals >= 0 ? rounded / 10 ** decimals : rounded * 10 ** -decimals) + 0
}

export function floorToFormat(value: number, format: AxisFormat): number {
  return roundToFormatToward(value, format, Math.floor)
}

export function ceilToFormat(value: number, format: AxisFormat): number {
  return roundToFormatToward(value, format, Math.ceil)
}

// The smallest written value above a bound that the value may not reach
function writtenAbove(bound: number, format: AxisFormat): number {
  return 'maximumSignificantDigits' in format
    ? (bound === 0 ? 10 ** -format.maximumSignificantDigits : bound + Math.abs(bound) * 10 ** (1 - format.maximumSignificantDigits))
    : roundToFormat(bound + 10 ** -format.maximumFractionDigits, format)
}

function writtenBelow(bound: number, format: AxisFormat): number {
  return -writtenAbove(-bound, format)
}

export function roundToStep(value: number, step: number): number {
  const decimals = String(step).split('.')[1]?.length ?? 0
  return Number((Math.round(value / step) * step).toFixed(decimals))
}

export function toDomain(value: number, domain: AxisDomain, format: AxisFormat): number {
  if (domain.cyclic) {
    const span = domain.max - domain.min
    return roundToFormat(((((value - domain.min) % span) + span) % span) + domain.min, format)
  }
  const rounded = roundToFormat(Math.min(domain.max, Math.max(domain.min, value)), format)
  return domain.minExclusive && rounded <= domain.min ? writtenAbove(domain.min, format) : rounded
}

// The domain of an axis narrowed by the axis it faces: a frame edge stops at the opposite edge
export function boundDomain(domain: AxisDomain, limits: { min?: number, max?: number }): AxisDomain {
  return {
    min: Math.max(domain.min, limits.min ?? domain.min),
    max: Math.min(domain.max, limits.max ?? domain.max),
    ...(domain.minExclusive && limits.min === undefined ? { minExclusive: true } : {}),
  }
}

// The limits that keep the first value of an ordered pair strictly below the second one
export function orderedPairLimits([low, high]: [number, number], format: AxisFormat): [{ max: number }, { min: number }] {
  return [{ max: writtenBelow(high, format) }, { min: writtenAbove(low, format) }]
}

// A multiplicative step multiplies upwards and divides downwards, so that up then down gives the value back
export function stepValue(value: number, control: AxisControl, direction: 1 | -1, factor = 1): number {
  const next = control.multiplicative
    ? (direction > 0 ? value * (1 + control.step * factor) : value / (1 + control.step * factor))
    : value + direction * control.step * factor
  return toDomain(next, control.domain, control.format)
}

export function formatValue(value: number, format: AxisFormat, locale: string): string {
  return new Intl.NumberFormat(locale, { ...format, useGrouping: false }).format(value)
}

// Reads the decimal separator of the locale, a point or a comma, and either minus sign
export function parseValue(text: string, locale: string): number | null {
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.5).find(part => part.type === 'decimal')?.value ?? '.'
  const normalized = text
    .trim()
    .replace(/\s/g, '')
    .replace(/−/g, '-')
    .replaceAll(decimal, '.')
    .replace(/,/g, '.')
  if (!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    return null
  }
  return Number(normalized)
}

export function trackScale(track: ScaleTrack) {
  return (track.scale === 'log' ? scaleLog() : scaleLinear()).domain([track.min, track.max]).range([0, 1]).clamp(true)
}

export function valueAtTrackPosition(track: ScaleTrack, position: number, detentDistance = 0.015): number {
  const scale = trackScale(track)
  const detent = track.detents.find(value => Math.abs(scale(value) - position) < detentDistance)
  return detent ?? scale.invert(position)
}

export function isOutsideTrack(value: number, track: ScaleTrack): boolean {
  return value < track.min || value > track.max
}

// Standard parallels at one sixth and five sixths of the band, the usual rule for a conic, rounded to the tenth; on a band too narrow for two distinct tenths, the edges of the band rounded outward
export function parallelsForBand([south, north]: LatitudeBand): LatitudeBand {
  const span = north - south
  const parallels: LatitudeBand = [Math.round((south + span / 6) * 10) / 10, Math.round((north - span / 6) * 10) / 10]
  return parallels[0] < parallels[1] ? parallels : [Math.floor(south * 10) / 10, Math.ceil(north * 10) / 10]
}
