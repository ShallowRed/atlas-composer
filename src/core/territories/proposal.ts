import type { CanvasDimensions } from '@atlas-composer/specification'
import type { GeoPermissibleObjects } from 'd3-geo'
import type { LatitudeBand } from '@/core/parameters'
import type { CanvasRect } from '@/core/positioning'
import type { CompositionState } from '@/core/presets/composition-state'
import type { ProjectionReason } from '@/core/projections/defaults'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { geoArea, geoBounds } from 'd3-geo'
import { floorToFormat, parallelsForBand, parameterRegistry, REFERENCE_SCALE_CONTROL, roundToFormat } from '@/core/parameters'
import { fittedScale, fitTerritory } from '@/core/positioning/fit'
import { PROPOSED_PROJECTION_IDS } from '@/core/projections/defaults'
import { projectionRegistry } from '@/core/projections/registry'
import { defaultTerritoryParameters } from './territory-reset-service'

export const ARRANGEMENTS = ['insets-right', 'insets-bottom'] as const
export type Arrangement = typeof ARRANGEMENTS[number]

export const SCALE_MODES = ['readable', 'uniform'] as const
export type ScaleMode = typeof SCALE_MODES[number]

// A territory checked for a proposal: its geometry, the center of its configuration and the latitudes of its bounds
export interface ProposedTerritory {
  code: TerritoryCode
  geometry: GeoPermissibleObjects
  center: [number, number]
  band: LatitudeBand
}

export interface ProposalOptions {
  arrangement: Arrangement
  scaleMode: ScaleMode
  canvas: CanvasDimensions
}

// The territories composed by a proposal, those added after it in the order of their addition, its options and the reason of the projection of each territory
export interface CompositionProposal {
  codes: TerritoryCode[]
  additions: TerritoryCode[]
  arrangement: Arrangement
  scaleMode: ScaleMode
  reasons: Partial<Record<TerritoryCode, ProjectionReason>>
}

// Thresholds of the rule of projection, in degrees and in ratio of the north-south extent to the east-west extent
const POLAR_LATITUDE = 60
const NORTH_SOUTH_MIN_SPAN = 8
const NORTH_SOUTH_RATIO = 1.6
const EQUATORIAL_LATITUDE = 25

// Largest side of the cell of an inset, and space between two zones, in pixels
const INSET_MAX_SIZE = 150
const ZONE_GAP = 8

// Columns of insets on the right beyond this count, rows of insets at the bottom beyond this count
const ONE_COLUMN_MAX = 6
const ONE_ROW_MAX = 8

// The mean latitude and the extents of a geometry, from geoBounds, whose west edge is east of its east edge across the antimeridian
function extentOf(geometry: GeoPermissibleObjects) {
  const [[west, south], [east, north]] = geoBounds(geometry)
  const meanLatitude = (south + north) / 2
  const longitudeSpan = east >= west ? east - west : east + 360 - west
  return {
    meanLatitude,
    latitudeSpan: north - south,
    eastWestSpan: longitudeSpan * Math.cos(meanLatitude * Math.PI / 180),
  }
}

export function suggestProjection(geometry: GeoPermissibleObjects): { projectionId: ProjectionId, reason: ProjectionReason } {
  const { meanLatitude, latitudeSpan, eastWestSpan } = extentOf(geometry)
  const reason: ProjectionReason = Math.abs(meanLatitude) > POLAR_LATITUDE
    ? 'polar'
    : latitudeSpan >= NORTH_SOUTH_MIN_SPAN && latitudeSpan >= NORTH_SOUTH_RATIO * eastWestSpan
      ? 'northSouth'
      : Math.abs(meanLatitude) < EQUATORIAL_LATITUDE
        ? 'equatorial'
        : eastWestSpan >= latitudeSpan ? 'eastWest' : 'midLatitude'
  return { projectionId: PROPOSED_PROJECTION_IDS[reason], reason }
}

// The parameters of a territory in a projection, before its placement: positioned on its center, with the parallels of its band for a conic; each axis is rounded to the format of its control, so that its field shows it without loss
function proposedParameters({ center, band }: ProposedTerritory, projectionId: ProjectionId): ProjectionParameters {
  const family = projectionRegistry.get(projectionId)!.family
  const parameters: ProjectionParameters = { ...defaultTerritoryParameters(center, projectionId), ...(family === 'CONIC' ? { parallels: parallelsForBand(band) } : {}) }
  const rounded = <T extends number[]>(key: string, values: T | undefined): T | undefined => {
    const controls = parameterRegistry.getAxisControls(key, family)
    return values && controls ? values.map((value, index) => roundToFormat(value, controls[index]!.format)) as T : values
  }
  const proposed = { ...parameters, center: rounded('center', parameters.center), rotate: rounded('rotate', parameters.rotate), parallels: rounded('parallels', parameters.parallels) }
  // The positioning of one family leaves the parameter of the other undefined
  return Object.fromEntries(Object.entries(proposed).filter(([, value]) => value !== undefined)) as ProjectionParameters
}

// The strip of the insets along the edge of an arrangement: the side of a cell, the number of lines of cells and of cells in a line, and where the cells of a line start, centered along the edge
function stripOf(insetCount: number, { width, height }: CanvasDimensions, arrangement: Arrangement) {
  const count = Math.max(insetCount, 1)
  const lineCount = count > (arrangement === 'insets-right' ? ONE_COLUMN_MAX : ONE_ROW_MAX) ? 2 : 1
  const perLine = Math.ceil(count / lineCount)
  const edge = arrangement === 'insets-right' ? height : width
  const size = Math.min(INSET_MAX_SIZE, edge / perLine)
  return { size, lineCount, perLine, start: (edge - perLine * size) / 2 }
}

// The zone of a cell, inside the gap that separates it from its neighbors
function cellZone(x: number, y: number, size: number, arrangement: Arrangement): CanvasRect {
  return arrangement === 'insets-right'
    ? { left: x, top: y, right: x + size - ZONE_GAP, bottom: y + size - ZONE_GAP }
    : { left: x + ZONE_GAP / 2, top: y, right: x + size - ZONE_GAP / 2, bottom: y + size - ZONE_GAP }
}

export function arrangeZones(insetCount: number, canvas: CanvasDimensions, arrangement: Arrangement): { main: CanvasRect, insets: CanvasRect[] } {
  const { width, height } = canvas
  if (insetCount === 0) {
    return { main: { left: 0, top: 0, right: width, bottom: height }, insets: [] }
  }
  const { size, lineCount, perLine, start } = stripOf(insetCount, canvas, arrangement)
  if (arrangement === 'insets-right') {
    const stripLeft = width - lineCount * size
    return {
      main: { left: 0, top: 0, right: stripLeft - ZONE_GAP, bottom: height },
      insets: Array.from({ length: insetCount }, (_, index) =>
        cellZone(stripLeft + Math.floor(index / perLine) * size, start + (index % perLine) * size, size, arrangement)),
    }
  }
  const stripTop = height - lineCount * size
  return {
    main: { left: 0, top: 0, right: width, bottom: stripTop - ZONE_GAP },
    insets: Array.from({ length: insetCount }, (_, index) =>
      cellZone(start + (index % perLine) * size, stripTop + Math.floor(index / perLine) * size, size, arrangement)),
  }
}

// The territory of largest spherical area first, then by code, whatever the order of the checked territories
function byArea(territories: ProposedTerritory[]): ProposedTerritory[] {
  const areas = new Map(territories.map(territory => [territory.code, geoArea(territory.geometry)]))
  return [...territories].sort((a, b) => areas.get(b.code)! - areas.get(a.code)! || a.code.localeCompare(b.code))
}

// The multiplier that brings the reference scale to a scale, rounded down to the format of its control
function multiplierFor(scale: number, referenceScale: number, { projectionId }: ProjectionParameters): number {
  const [control] = parameterRegistry.getAxisControls('scaleMultiplier', projectionRegistry.get(projectionId!)!.family)!
  return floorToFormat(scale / referenceScale, control!.format)
}

export function proposeComposition(territories: ProposedTerritory[], { arrangement, scaleMode, canvas }: ProposalOptions): { state: CompositionState, reasons: Partial<Record<TerritoryCode, ProjectionReason>> } {
  const ordered = byArea(territories)
  const { main, insets } = arrangeZones(Math.max(ordered.length - 1, 0), canvas, arrangement)
  const fitted = ordered.map((territory, index) => {
    const { projectionId, reason } = suggestProjection(territory.geometry)
    const parameters = proposedParameters(territory, projectionId)
    const zone = index === 0 ? main : insets[index - 1]!
    return { territory, reason, parameters, zone, scale: fittedScale(territory.geometry, parameters, zone) }
  })

  // Rounded down, so that each geometry stays inside its zone
  const referenceScale = floorToFormat(scaleMode === 'uniform' ? Math.min(...fitted.map(({ scale }) => scale)) : fitted[0]!.scale, REFERENCE_SCALE_CONTROL.format)

  const territoryParameters: CompositionState['territoryParameters'] = {}
  const reasons: Partial<Record<TerritoryCode, ProjectionReason>> = {}
  for (const [index, { territory, reason, parameters, zone, scale }] of fitted.entries()) {
    const scaleMultiplier = scaleMode === 'uniform' || index === 0 ? 1 : multiplierFor(scale, referenceScale, parameters)
    territoryParameters[territory.code] = {
      ...parameters,
      ...fitTerritory(territory.geometry, parameters, zone, { canvas, referenceScale, scaleMultiplier }),
    }
    reasons[territory.code] = reason
  }

  return {
    state: { territoryParameters, activeTerritories: ordered.map(({ code }) => code), canvas: { referenceScale, dimensions: { ...canvas } } },
    reasons,
  }
}

// The first cell of the size of the insets of a proposal that overlaps none of the occupied rectangles, from the edge of the arrangement, on the grid of its strip of insets; the first cell when every cell overlaps one
export function freeCell(occupied: CanvasRect[], composedCount: number, { arrangement, canvas }: Pick<ProposalOptions, 'arrangement' | 'canvas'>): CanvasRect {
  const { width, height } = canvas
  const { size, start } = stripOf(composedCount - 1, canvas, arrangement)
  const first = start % size
  const across = Math.max(Math.floor(((arrangement === 'insets-right' ? height : width) - first) / size), 1)
  const lines = Math.max(Math.floor((arrangement === 'insets-right' ? width : height) / size), 1)
  const cells: CanvasRect[] = []
  for (let line = 0; line < lines; line++) {
    for (let step = 0; step < across; step++) {
      cells.push(arrangement === 'insets-right'
        ? cellZone(width - (line + 1) * size, first + step * size, size, arrangement)
        : cellZone(first + step * size, height - (line + 1) * size, size, arrangement))
    }
  }
  const overlaps = (a: CanvasRect, b: CanvasRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  return cells.find(cell => !occupied.some(rect => overlaps(cell, rect))) ?? cells[0]!
}

// The proposed projection of a territory checked after a proposal, fitted to a cell at a reference scale
export function proposeAddition(territory: ProposedTerritory, cell: CanvasRect, { canvas, referenceScale }: { canvas: CanvasDimensions, referenceScale: number }): { parameters: ProjectionParameters, reason: ProjectionReason } {
  const { projectionId, reason } = suggestProjection(territory.geometry)
  const parameters = proposedParameters(territory, projectionId)
  const scaleMultiplier = multiplierFor(fittedScale(territory.geometry, parameters, cell), referenceScale, parameters)
  return { parameters: { ...parameters, ...fitTerritory(territory.geometry, parameters, cell, { canvas, referenceScale, scaleMultiplier }) }, reason }
}
