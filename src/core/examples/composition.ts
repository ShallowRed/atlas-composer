import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { ExampleSource } from './definitions'
import type { BasemapFrame } from '@/core/basemap'
import type { PresetId } from '@/types/branded'
import { geoCentroid, geoContains, geoDistance } from 'd3-geo'
import { inExtent, invertOnGlobe } from '@/core/basemap'
import { createPresetId } from '@/types/branded'

type Point = [number, number]
type Bounds = [[number, number], [number, number]]

// A place of examples/world-places.json: longitude, latitude, population, name, 1 for a capital, ISO code of the country (adm0_a3)
export type Place = [number, number, number, string, number, string]

export interface Earthquake {
  longitude: number
  latitude: number
  magnitude: number
  label: string
  time: number
}

// The contours of an atlas: one feature per territory code, with the ISO code of its country
export type TerritoryContours = GeoJSON.FeatureCollection<GeoJSON.Geometry, { code: string, iso: string }>
type TerritoryContour = TerritoryContours['features'][number]

export interface CompositionDemoInput {
  config: CompositeProjectionConfig
  territories: TerritoryContours
  places: Place[]
}

export interface CompositionMark {
  kind: 'place' | 'earthquake'
  label: string
  // Population of a place, magnitude of an earthquake
  value: number
  territory: string
  radius: number
  raw: Point
  composite: Point
}

export interface PointerLocation {
  longitude: number
  latitude: number
  territory: string | null
}

// Presets of the demo: territories far from each other, cities on each of them, and earthquakes on several
export const COMPOSITION_PRESETS: PresetId[] = [
  createPresetId('japan-standard'),
  createPresetId('france-standard'),
  createPresetId('portugal-standard'),
  createPresetId('norway-standard'),
  createPresetId('chile-standard'),
  createPresetId('ecuador-standard'),
]

export const COMPOSITION_SOURCES: ExampleSource[] = [
  { label: 'Natural Earth, Populated Places', url: 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/' },
  { label: 'USGS, Earthquake Hazards Program', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php' },
]

export function interpolate([x0, y0]: Point, [x1, y1]: Point, progress: number): Point {
  return [x0 + (x1 - x0) * progress, y0 + (y1 - y0) * progress]
}

function inBounds([[west, south], [east, north]]: Bounds, [longitude, latitude]: Point) {
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north
}

// The territory of the preset whose contour contains the point; else, among those whose bounds contain it, the one with the nearest contour center
export function territoryOf(config: CompositeProjectionConfig, territories: TerritoryContour[], point: Point): string | null {
  const codes = new Set(config.territories.map(({ code }) => code))
  const candidates = territories.filter(({ properties }) => codes.has(properties.code))
  const containing = candidates.find(contour => geoContains(contour, point))
  if (containing) {
    return containing.properties.code
  }
  const bounds = new Map(config.territories.flatMap(({ code, bounds }) => (bounds ? [[code, bounds]] : [])))
  const nearest = candidates
    .filter(({ properties }) => {
      const territoryBounds = bounds.get(properties.code)
      return territoryBounds !== undefined && inBounds(territoryBounds, point)
    })
    .map(contour => ({ code: contour.properties.code, distance: geoDistance(geoCentroid(contour), point) }))
    .sort((a, b) => a.distance - b.distance)[0]
  return nearest?.code ?? null
}

// The longitude and latitude of a pixel, taken in the topmost frame that contains it, and the territory of that frame when its contour contains the point
export function locate(frames: BasemapFrame[], territories: Array<GeoJSON.Feature<GeoJSON.Geometry, { code: string }>>, [x, y]: Point): PointerLocation | null {
  const frame = [...frames].reverse().find(({ extent }) => inExtent(extent, [x, y]))
  const point = frame && invertOnGlobe(frame.projection, [x, y])
  if (!frame || !point) {
    return null
  }
  const contour = territories.find(({ properties }) => properties.code === frame.code)
  return { longitude: point[0], latitude: point[1], territory: contour && geoContains(contour, point) ? frame.code : null }
}
