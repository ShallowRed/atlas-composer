import type { CanvasDimensions } from '@atlas-composer/specification'
import type { GeoPermissibleObjects, GeoProjection } from 'd3-geo'
import type { CanvasRect } from './frame'
import type { TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { geoPath } from 'd3-geo'
import { parameterRegistry } from '@/core/parameters'
import { FALLBACK_PROJECTION_ID } from '@/core/projections/defaults'
import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'
import { applyPositioning } from './applicator'
import { convertPositioning } from './converters'

// A composition that draws every territory with one projection, at its geographic position,
// and the insets that a person detaches from it

export interface GeographicTerritory {
  code: TerritoryCode
  center: [number, number]
  area: number
  geometry: GeoPermissibleObjects
}

export interface CommonProjection {
  projectionId: string
  center?: [number, number]
  rotate?: [number, number] | [number, number, number]
  parallels?: [number, number]
}

export interface GeographicComposition {
  territoryParameters: Record<TerritoryCode, ProjectionParameters>
  activeTerritories: TerritoryCode[]
  canvas: { referenceScale: number, dimensions: CanvasDimensions }
  // The parameters that every territory at its geographic position shares
  reference: ProjectionParameters
}

// The projection of the geographic map when the unified view of the atlas uses a projection that a composition does not offer
const GEOGRAPHIC_FALLBACK_PROJECTION = 'azimuthal-equal-area'

const INSET_COLUMNS = 2
const INSET_ROWS = 4
const INSET_COLUMN_RATIO = 0.14
const MARGIN = 16
const INSET_PADDING = 6

const defaultOffset = () => parameterRegistry.getDefaultValue('translateOffset') as [number, number]
const defaultScale = () => parameterRegistry.getDefaultValue('scaleMultiplier') as number

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function insetColumnWidth(canvas: CanvasDimensions): number {
  return Math.round(canvas.width * INSET_COLUMN_RATIO)
}

// The part of the canvas left of the inset columns, where the largest territory fits
export function mapExtent(canvas: CanvasDimensions): CanvasRect {
  return {
    left: MARGIN,
    top: MARGIN,
    right: canvas.width - INSET_COLUMNS * insetColumnWidth(canvas) - MARGIN,
    bottom: canvas.height - MARGIN,
  }
}

// A fixed grid on the right edge of the canvas, the outer column first, from the top
export function insetSlots(canvas: CanvasDimensions): CanvasRect[] {
  const width = insetColumnWidth(canvas)
  const height = (canvas.height - MARGIN) / INSET_ROWS
  return Array.from({ length: INSET_COLUMNS }, (_, column) => canvas.width - (column + 1) * width)
    .flatMap(left => Array.from({ length: INSET_ROWS }, (_, row) => ({
      left,
      top: MARGIN / 2 + row * height,
      right: left + width - MARGIN / 2,
      bottom: MARGIN / 2 + (row + 1) * height - MARGIN / 2,
    })))
}

// The projection of the unified view of the atlas, else an equal-area projection centered on the largest territory
export function commonProjectionFor(
  unified: { id: string, parameters: ProjectionParameters } | null,
  largestCenter: [number, number],
): CommonProjection {
  if (unified && projectionRegistry.get(unified.id)?.capabilities.supportsComposite) {
    const { center, rotate, parallels } = unified.parameters
    return { projectionId: unified.id, center, rotate, parallels }
  }
  const family = projectionRegistry.get(GEOGRAPHIC_FALLBACK_PROJECTION)?.family ?? 'AZIMUTHAL'
  return { projectionId: GEOGRAPHIC_FALLBACK_PROJECTION, ...convertPositioning({ center: largestCenter }, family) }
}

function createPositioned(parameters: ProjectionParameters): GeoProjection {
  const projection = (ProjectionFactory.createById(parameters.projectionId ?? FALLBACK_PROJECTION_ID)
    ?? ProjectionFactory.createById(FALLBACK_PROJECTION_ID)!).translate([0, 0])
  applyPositioning(projection, parameters, 'composite')
  return projection
}

function fit(projection: GeoProjection, rect: CanvasRect, geometry: GeoPermissibleObjects): GeoProjection {
  return projection.fitExtent([[rect.left, rect.top], [rect.right, rect.bottom]], geometry)
}

export function geographicComposition({ territories, projection, canvas }: {
  territories: GeographicTerritory[]
  projection: CommonProjection
  canvas: CanvasDimensions
}): GeographicComposition {
  const largest = territories.reduce((current, territory) => territory.area > current.area ? territory : current)
  const common: ProjectionParameters = {
    projectionId: projection.projectionId,
    center: projection.center,
    rotate: projection.rotate,
    parallels: projection.parallels,
  }
  const fitted = fit(createPositioned(common), mapExtent(canvas), largest.geometry)
  const [x, y] = fitted.translate()
  const reference: ProjectionParameters = {
    ...common,
    scaleMultiplier: 1,
    translateOffset: [round(x - canvas.width / 2), round(y - canvas.height / 2)],
  }

  return {
    territoryParameters: Object.fromEntries(territories.map(({ code }) => [code, { ...reference }])) as Record<TerritoryCode, ProjectionParameters>,
    activeTerritories: territories.map(({ code }) => code),
    canvas: { referenceScale: round(fitted.scale()), dimensions: { ...canvas } },
    reference,
  }
}

// The common projection as CompositeProjection places it on the canvas
export function geographicProjection(reference: ProjectionParameters, referenceScale: number, canvas: CanvasDimensions): GeoProjection {
  const [x, y] = reference.translateOffset ?? defaultOffset()
  return createPositioned(reference)
    .scale(referenceScale * (reference.scaleMultiplier ?? defaultScale()))
    .translate([canvas.width / 2 + x, canvas.height / 2 + y])
}

export function isInsideCanvas(geometry: GeoPermissibleObjects, projection: GeoProjection, canvas: CanvasDimensions): boolean {
  const [[left, top], [right, bottom]] = geoPath(projection).bounds(geometry)
  if (![left, top, right, bottom].every(Number.isFinite)) {
    return false
  }
  return right > 0 && left < canvas.width && bottom > 0 && top < canvas.height
}

function sameNumbers(a: readonly number[] | undefined, b: readonly number[] | undefined): boolean {
  const left = a ?? []
  const right = b ?? []
  const length = Math.max(left.length, right.length)
  return Array.from({ length }, (_, index) => Math.abs((left[index] ?? 0) - (right[index] ?? 0)) < 1e-6).every(Boolean)
}

export function isAtGeographicPosition(parameters: ProjectionParameters, reference: ProjectionParameters): boolean {
  return parameters.projectionId === reference.projectionId
    && sameNumbers(parameters.rotate, reference.rotate)
    && sameNumbers(parameters.center, reference.center)
    && sameNumbers([parameters.scaleMultiplier ?? defaultScale()], [reference.scaleMultiplier ?? defaultScale()])
    && sameNumbers(parameters.translateOffset, reference.translateOffset)
}

function frameOf(parameters: ProjectionParameters, canvas: CanvasDimensions): CanvasRect | null {
  if (!parameters.pixelClipExtent) {
    return null
  }
  const [x, y] = parameters.translateOffset ?? defaultOffset()
  const [left, top, right, bottom] = parameters.pixelClipExtent
  const pointX = canvas.width / 2 + x
  const pointY = canvas.height / 2 + y
  return { left: pointX + left, top: pointY + top, right: pointX + right, bottom: pointY + bottom }
}

// The first slot of the grid whose center no inset frame covers
export function freeInsetSlot(insets: ProjectionParameters[], canvas: CanvasDimensions): CanvasRect | null {
  const frames = insets.map(parameters => frameOf(parameters, canvas)).filter(frame => frame !== null)
  return insetSlots(canvas).find((slot) => {
    const x = (slot.left + slot.right) / 2
    const y = (slot.top + slot.bottom) / 2
    return !frames.some(frame => x >= frame.left && x <= frame.right && y >= frame.top && y <= frame.bottom)
  }) ?? null
}

// The parameters of a territory drawn in a slot: the projection centered on the territory, fitted to the slot
export function detachAsInset(
  territory: GeographicTerritory & { projectionId: string },
  slot: CanvasRect,
  canvas: CanvasDimensions,
  referenceScale: number,
): ProjectionParameters {
  const family = projectionRegistry.get(territory.projectionId)?.family ?? 'MISCELLANEOUS'
  const positioning = convertPositioning({ center: territory.center }, family)
  const parameters: ProjectionParameters = { projectionId: territory.projectionId, ...positioning }
  const inner = {
    left: slot.left + INSET_PADDING,
    top: slot.top + INSET_PADDING,
    right: slot.right - INSET_PADDING,
    bottom: slot.bottom - INSET_PADDING,
  }
  const fitted = fit(createPositioned(parameters), inner, territory.geometry)
  const [x, y] = fitted.translate()

  return {
    ...parameters,
    scaleMultiplier: Math.round(fitted.scale() / referenceScale * 1e4) / 1e4,
    translateOffset: [round(x - canvas.width / 2), round(y - canvas.height / 2)],
    pixelClipExtent: [round(slot.left - x), round(slot.top - y), round(slot.right - x), round(slot.bottom - y)],
  }
}
