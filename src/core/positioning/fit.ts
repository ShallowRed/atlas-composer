import type { CanvasDimensions } from '@atlas-composer/specification'
import type { GeoPermissibleObjects, GeoProjection } from 'd3-geo'
import type { CanvasRect, FrameExtent } from './frame'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { geoPath } from 'd3-geo'
import { ceilToFormat, floorToFormat, parameterRegistry, roundToFormat } from '@/core/parameters'
import { ProjectionFactory } from '@/core/projections/factory'
import { projectionRegistry } from '@/core/projections/registry'
import { applyPositioning } from './applicator'
import { frameFromRect, rectFromFrame } from './frame'
import { subProjectionAnchor, subProjectionScale, translateOffsetOf } from './placement'

// Space between the geometry of a territory and the edges of its zone, in pixels
const FIT_MARGIN = 6

export interface TerritoryPlacement {
  scaleMultiplier: number
  translateOffset: [number, number]
  pixelClipExtent: FrameExtent
}

// The projection of a territory before its placement, created and positioned as CompositeProjection does
function positionedProjection(parameters: ProjectionParameters): GeoProjection {
  const projection = ProjectionFactory.createById(parameters.projectionId!)
  if (!projection) {
    throw new Error(`Unknown projection ${parameters.projectionId}`)
  }
  projection.translate([0, 0])
  // The registry resolves the aliases and the case of the id
  applyPositioning(projection, parameters, 'composite', projectionRegistry.get(parameters.projectionId!)!.id)
  return projection
}

// The largest scale at which the geometry of a territory holds in a zone, inside its margin
export function fittedScale(geometry: GeoPermissibleObjects, parameters: ProjectionParameters, { left, top, right, bottom }: CanvasRect): number {
  const projection = positionedProjection(parameters)
  projection.fitExtent([[left + FIT_MARGIN, top + FIT_MARGIN], [right - FIT_MARGIN, bottom - FIT_MARGIN]], geometry)
  return projection.scale()
}

// The translate offset that centers the geometry of a territory in a zone at a scale, and the frame of the zone around its anchor, each rounded to the format of its control: the frame inward, so that it stays inside the zone
export function fitTerritory(
  geometry: GeoPermissibleObjects,
  parameters: ProjectionParameters,
  zone: CanvasRect,
  { canvas, referenceScale, scaleMultiplier }: { canvas: CanvasDimensions, referenceScale: number, scaleMultiplier: number },
): TerritoryPlacement {
  const family = projectionRegistry.get(parameters.projectionId!)!.family
  const offsetControls = parameterRegistry.getAxisControls('translateOffset', family)!
  const frameControls = parameterRegistry.getAxisControls('pixelClipExtent', family)!
  const projection = positionedProjection(parameters).scale(subProjectionScale(referenceScale, scaleMultiplier))
  const [[x0, y0], [x1, y1]] = geoPath(projection).bounds(geometry)
  const anchor: [number, number] = [(zone.left + zone.right - x0 - x1) / 2, (zone.top + zone.bottom - y0 - y1) / 2]
  const translateOffset = translateOffsetOf(canvas, anchor).map((value, index) => roundToFormat(value, offsetControls[index]!.format)) as [number, number]
  const [left, top, right, bottom] = frameFromRect(zone, subProjectionAnchor(canvas, translateOffset))
  return {
    scaleMultiplier,
    translateOffset,
    pixelClipExtent: [
      ceilToFormat(left, frameControls[0]!.format),
      ceilToFormat(top, frameControls[1]!.format),
      floorToFormat(right, frameControls[2]!.format),
      floorToFormat(bottom, frameControls[3]!.format),
    ],
  }
}

// The rectangle of the canvas that an active territory covers: its frame when it has one, else the box of its projected geometry
export function territoryRect(geometry: GeoPermissibleObjects, parameters: ProjectionParameters, { canvas, referenceScale }: { canvas: CanvasDimensions, referenceScale: number }): CanvasRect {
  const anchor = subProjectionAnchor(canvas, parameters.translateOffset ?? parameterRegistry.getDefaultValue('translateOffset'))
  if (parameters.pixelClipExtent) {
    return rectFromFrame(parameters.pixelClipExtent, anchor)
  }
  const projection = positionedProjection(parameters).scale(subProjectionScale(referenceScale, parameters.scaleMultiplier ?? parameterRegistry.getDefaultValue('scaleMultiplier')))
  const [[x0, y0], [x1, y1]] = geoPath(projection).bounds(geometry)
  return rectFromFrame([x0, y0, x1, y1], anchor)
}
