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

// The smallest written value above an excluded bound
function aboveExcludedBound(min: number, format: AxisFormat): number {
  return 'maximumSignificantDigits' in format
    ? (min === 0 ? 10 ** -format.maximumSignificantDigits : min * (1 + 10 ** (1 - format.maximumSignificantDigits)))
    : min + 10 ** -format.maximumFractionDigits
}

export function toDomain(value: number, domain: AxisDomain, format: AxisFormat): number {
  if (domain.cyclic) {
    const span = domain.max - domain.min
    return roundToFormat(((((value - domain.min) % span) + span) % span) + domain.min, format)
  }
  const rounded = roundToFormat(Math.min(domain.max, Math.max(domain.min, value)), format)
  return domain.minExclusive && rounded <= domain.min ? aboveExcludedBound(domain.min, format) : rounded
}

// The domain of an axis narrowed by the axis it faces: a frame edge stops at the opposite edge
export function boundDomain(domain: AxisDomain, limits: { min?: number, max?: number }): AxisDomain {
  return {
    min: Math.max(domain.min, limits.min ?? domain.min),
    max: Math.min(domain.max, limits.max ?? domain.max),
    ...(domain.minExclusive && limits.min === undefined ? { minExclusive: true } : {}),
  }
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

// Standard parallels at one sixth and five sixths of the band, the usual rule for a conic
export function parallelsForBand([south, north]: LatitudeBand): LatitudeBand {
  const span = north - south
  return [Math.round((south + span / 6) * 10) / 10, Math.round((north - span / 6) * 10) / 10]
}
