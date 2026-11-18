import type { CanvasDimensions } from '@atlas-composer/specification'
import type { GeoProjection } from 'd3-geo'
import type { CompositionState } from '@/core/presets/composition-state'
import type { TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { projectionRegistry } from '@/core/projections/registry'

export type GeoBoundsArray = [[number, number], [number, number]]

export type SuggestedArrangement = 'insets-right' | 'insets-bottom'
export type SuggestedScaleMode = 'uniform' | 'readable'

type ProjectionReason = 'polar' | 'northSouth' | 'equatorial' | 'eastWest' | 'midLatitude'

export interface SuggestedProjection {
  projectionId: string
  parameters: Pick<ProjectionParameters, 'center' | 'rotate' | 'parallels'>
  reason: ProjectionReason
}

export interface SuggestedTerritory {
  code: TerritoryCode
  bounds: GeoBoundsArray
  center: [number, number]
}

export interface CompositionProposalInput {
  territories: SuggestedTerritory[]
  canvas: CanvasDimensions
  arrangement: SuggestedArrangement
  scaleMode: SuggestedScaleMode
}

const POLAR_LATITUDE = 60
const EQUATORIAL_LATITUDE = 25
const NORTH_SOUTH_RATIO = 1.6
const NORTH_SOUTH_MIN_SPAN = 8

const INSET_MAX_SIZE = 150
const ZONE_GAP = 8
const FIT_PADDING = 6

function extent([[minLon, minLat], [maxLon, maxLat]]: GeoBoundsArray) {
  const meanLatitude = (minLat + maxLat) / 2
  const latitudeSpan = maxLat - minLat
  const longitudeSpan = (maxLon - minLon) * Math.cos(meanLatitude * Math.PI / 180)
  return { meanLatitude, latitudeSpan, longitudeSpan }
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function suggestProjection(bounds: GeoBoundsArray): SuggestedProjection {
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  const longitude = round((minLon + maxLon) / 2)
  const { meanLatitude, latitudeSpan, longitudeSpan } = extent(bounds)
  const latitude = round(meanLatitude)

  if (Math.abs(meanLatitude) >= POLAR_LATITUDE) {
    return {
      projectionId: 'azimuthal-equal-area',
      parameters: { rotate: [-longitude, -latitude, 0], center: [0, 0] },
      reason: 'polar',
    }
  }

  if (latitudeSpan >= NORTH_SOUTH_MIN_SPAN && latitudeSpan > NORTH_SOUTH_RATIO * longitudeSpan) {
    return {
      projectionId: 'transverse-mercator',
      parameters: { rotate: [-longitude, -latitude, 0], center: [0, 0] },
      reason: 'northSouth',
    }
  }

  if (Math.abs(meanLatitude) < EQUATORIAL_LATITUDE) {
    return {
      // The fallback projection is the Mercator
      projectionId: FALLBACK_PROJECTION_ID,
      parameters: { center: [longitude, latitude], rotate: [0, 0, 0] },
      reason: 'equatorial',
    }
  }

  // Standard parallels at one sixth of the latitude span from each edge
  const sixth = latitudeSpan / 6
  return {
    projectionId: 'conic-conformal',
    parameters: {
      rotate: [-longitude, 0, 0],
      center: [0, latitude],
      parallels: [round(minLat + sixth), round(maxLat - sixth)],
    },
    reason: longitudeSpan >= latitudeSpan ? 'eastWest' : 'midLatitude',
  }
}

type Zone = [number, number, number, number]

function arrangeZones(count: number, { width, height }: CanvasDimensions, arrangement: SuggestedArrangement): { main: Zone, insets: Zone[] } {
  if (count === 0) {
    return { main: [0, 0, width, height], insets: [] }
  }

  if (arrangement === 'insets-right') {
    const columns = count > 6 ? 2 : 1
    const rows = Math.ceil(count / columns)
    const size = Math.min(INSET_MAX_SIZE, height / rows)
    const stripLeft = width - columns * size
    const top = (height - rows * size) / 2
    return {
      main: [0, 0, stripLeft - ZONE_GAP, height],
      insets: Array.from({ length: count }, (_, index) => {
        const x = stripLeft + Math.floor(index / rows) * size
        const y = top + (index % rows) * size
        return [x, y, x + size - ZONE_GAP, y + size - ZONE_GAP]
      }),
    }
  }

  const rowCount = count > 8 ? 2 : 1
  const perRow = Math.ceil(count / rowCount)
  const size = Math.min(INSET_MAX_SIZE, width / perRow)
  const stripTop = height - rowCount * size
  const left = (width - perRow * size) / 2
  return {
    main: [0, 0, width, stripTop - ZONE_GAP],
    insets: Array.from({ length: count }, (_, index) => {
      const x = left + (index % perRow) * size
      const y = stripTop + Math.floor(index / perRow) * size
      return [x + ZONE_GAP / 2, y, x + size - ZONE_GAP / 2, y + size - ZONE_GAP]
    }),
  }
}

function boundsGrid([[minLon, minLat], [maxLon, maxLat]]: GeoBoundsArray): GeoJSON.MultiPoint {
  const steps = 8
  const coordinates: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      coordinates.push([minLon + (maxLon - minLon) * i / steps, minLat + (maxLat - minLat) * j / steps])
    }
  }
  return { type: 'MultiPoint', coordinates }
}

function positionedProjection(suggestion: SuggestedProjection): GeoProjection {
  const projection = projectionRegistry.get(suggestion.projectionId)!.create()
  const { center, rotate, parallels } = suggestion.parameters
  projection.center(center ?? [0, 0])
  projection.rotate(rotate ?? [0, 0, 0])
  if (parallels) {
    (projection as GeoProjection & { parallels: (value: [number, number]) => GeoProjection }).parallels(parallels)
  }
  return projection
}

interface FittedTerritory {
  territory: SuggestedTerritory
  suggestion: SuggestedProjection
  zone: Zone
  fitScale: number
  rawCenter: [number, number]
}

function fitToZone(territory: SuggestedTerritory, zone: Zone): FittedTerritory {
  const suggestion = suggestProjection(territory.bounds)
  const projection = positionedProjection(suggestion)
  const grid = boundsGrid(territory.bounds)
  const [x0, y0, x1, y1] = zone
  projection.fitExtent([[x0 + FIT_PADDING, y0 + FIT_PADDING], [x1 - FIT_PADDING, y1 - FIT_PADDING]], grid)
  const fitScale = projection.scale()

  // Center of the projected bounds at scale 1 and translate [0, 0]
  projection.scale(1).translate([0, 0])
  const projected = grid.coordinates.map(point => projection(point as [number, number])).filter(point => point !== null)
  const xs = projected.map(([x]) => x)
  const ys = projected.map(([, y]) => y)
  const rawCenter: [number, number] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]

  return { territory, suggestion, zone, fitScale, rawCenter }
}

function boundsArea(bounds: GeoBoundsArray): number {
  const { latitudeSpan, longitudeSpan } = extent(bounds)
  return latitudeSpan * longitudeSpan
}

export function proposeComposition({ territories, canvas, arrangement, scaleMode }: CompositionProposalInput): CompositionState {
  const ordered = [...territories].sort((a, b) => boundsArea(b.bounds) - boundsArea(a.bounds))
  const { main, insets } = arrangeZones(Math.max(ordered.length - 1, 0), canvas, arrangement)
  const fitted = ordered.map((territory, index) => fitToZone(territory, index === 0 ? main : insets[index - 1]!))

  const uniformScale = Math.min(...fitted.map(({ fitScale }) => fitScale))
  // Rounded down, so that the territories at the reference scale stay inside their frame
  const referenceScale = Math.max(Math.floor(scaleMode === 'uniform' ? uniformScale : fitted[0]?.fitScale ?? 1), 1)

  const territoryParameters: Record<TerritoryCode, ProjectionParameters> = {}
  for (const [index, { territory, suggestion, zone, fitScale, rawCenter }] of fitted.entries()) {
    const scaleMultiplier = scaleMode === 'uniform' || index === 0 ? 1 : Math.floor(fitScale / referenceScale * 1e4) / 1e4
    const scale = referenceScale * scaleMultiplier
    const [x0, y0, x1, y1] = zone
    const translate: [number, number] = [(x0 + x1) / 2 - scale * rawCenter[0], (y0 + y1) / 2 - scale * rawCenter[1]]

    territoryParameters[territory.code] = {
      projectionId: suggestion.projectionId,
      ...suggestion.parameters,
      scaleMultiplier,
      translateOffset: [round(translate[0] - canvas.width / 2), round(translate[1] - canvas.height / 2)],
      pixelClipExtent: [round(x0 - translate[0]), round(y0 - translate[1]), round(x1 - translate[0]), round(y1 - translate[1])],
    }
  }

  return {
    territoryParameters,
    activeTerritories: ordered.map(({ code }) => code),
    canvas: { referenceScale, dimensions: { ...canvas } },
  }
}
