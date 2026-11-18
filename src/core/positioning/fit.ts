import type { GeoProjection } from 'd3-geo'
import type { CanvasRect, CanvasSize, FrameExtent } from './frame'
import type { PositioningParameters } from './types'
import { ProjectionFactory } from '@/core/projections/factory'
import { applyPositioning } from './applicator'

type Bounds = [[number, number], [number, number]]

export interface TerritoryProjection extends PositioningParameters {
  projectionId: string
}

export interface TerritoryFit {
  scaleMultiplier: number
  translateOffset: [number, number]
}

const EDGE_SAMPLES = 8

// Points along the edges of the bounds, so that the fit follows the curved edges of a conic or azimuthal projection
function boundsOutline([[west, south], [east, north]]: Bounds): GeoJSON.MultiPoint {
  const span = east >= west ? east - west : east + 360 - west
  const coordinates: [number, number][] = []
  for (let step = 0; step <= EDGE_SAMPLES; step++) {
    const longitude = west + (span * step) / EDGE_SAMPLES
    const latitude = south + ((north - south) * step) / EDGE_SAMPLES
    coordinates.push([longitude, south], [longitude, north], [west, latitude], [west + span, latitude])
  }
  return { type: 'MultiPoint', coordinates }
}

function positionedProjection(projection: TerritoryProjection): GeoProjection {
  const created = ProjectionFactory.createById(projection.projectionId)
  if (!created) {
    throw new Error(`[fitTerritory] Unknown projection ${projection.projectionId}`)
  }
  applyPositioning(created, projection, 'composite')
  return created
}

// The scale and the offset from the centre of the canvas that fit the bounds of a territory into the box,
// as CompositeProjection applies them: scale = referenceScale × scaleMultiplier, translate = centre + translateOffset
export function fitTerritory({ projection, bounds, box, referenceScale, canvas }: {
  projection: TerritoryProjection
  bounds: Bounds
  box: CanvasRect
  referenceScale: number
  canvas: CanvasSize
}): TerritoryFit {
  const fitted = positionedProjection(projection).fitExtent([[box.left, box.top], [box.right, box.bottom]], boundsOutline(bounds))
  const [x, y] = fitted.translate()
  return {
    scaleMultiplier: Number((fitted.scale() / referenceScale).toPrecision(3)),
    translateOffset: [Math.round(x - canvas.width / 2), Math.round(y - canvas.height / 2)],
  }
}

// The rectangle that a placed territory covers on the canvas: its frame when it has one, else its projected bounds
export function territoryRect({ projection, bounds, scaleMultiplier, translateOffset, pixelClipExtent, referenceScale, canvas }: {
  projection: TerritoryProjection
  bounds: Bounds
  scaleMultiplier: number
  translateOffset: [number, number]
  pixelClipExtent?: FrameExtent
  referenceScale: number
  canvas: CanvasSize
}): CanvasRect {
  const point: [number, number] = [canvas.width / 2 + translateOffset[0], canvas.height / 2 + translateOffset[1]]
  if (pixelClipExtent) {
    const [left, top, right, bottom] = pixelClipExtent
    return { left: point[0] + left, top: point[1] + top, right: point[0] + right, bottom: point[1] + bottom }
  }
  const placed = positionedProjection(projection).scale(referenceScale * scaleMultiplier).translate(point)
  const projected = boundsOutline(bounds).coordinates.map(coordinate => placed(coordinate as [number, number])).filter(value => value !== null)
  const xs = projected.map(([x]) => x)
  const ys = projected.map(([, y]) => y)
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) }
}

// A large slot in the middle of the canvas, then four small slots stacked along its right edge
export function compositionSlots({ width, height }: CanvasSize): CanvasRect[] {
  const margin = Math.round(height * 0.04)
  const main = { left: width * 0.25, top: height * 0.25, right: width * 0.7, bottom: height * 0.75 }
  const columnLeft = width * 0.8
  const slotHeight = (height - margin * 5) / 4
  const side = [0, 1, 2, 3].map(index => ({
    left: columnLeft,
    top: margin + index * (slotHeight + margin),
    right: width - margin,
    bottom: margin + index * (slotHeight + margin) + slotHeight,
  }))
  return [main, ...side]
}

function overlaps(a: CanvasRect, b: CanvasRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

export function nextFreeSlot(occupied: readonly CanvasRect[], canvas: CanvasSize): CanvasRect | null {
  return compositionSlots(canvas).find(slot => occupied.every(rect => !overlaps(slot, rect))) ?? null
}
