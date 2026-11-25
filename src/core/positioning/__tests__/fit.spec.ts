import type { ProjectionParameters } from '@/types/projection-parameters'
import { geoPath } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { allTerritoriesProvider } from '@/__tests__/test-utils'
import { ProjectionFactory } from '@/core/projections/factory'
import { defaultTerritoryParameters } from '@/core/territories/territory-reset-service'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { createProjectionId, createTerritoryCode } from '@/types/branded'
import { applyPositioning } from '../applicator'
import { fittedScale, fitTerritory, territoryRect } from '../fit'

const canvas = { width: 960, height: 500 }
const CODE = createTerritoryCode('XX')
const REFERENCE_SCALE = 1000

// A clockwise ring of d3, west, north, east, then south
function square([west, south, east, north]: [number, number, number, number]): GeoJSON.Polygon {
  return { type: 'Polygon', coordinates: [[[west, south], [west, north], [east, north], [east, south], [west, south]]] }
}

const territory = square([-10, 40, 4, 48])
const zone = { left: 700, top: 100, right: 850, bottom: 250 }

// The parameters of a projection of each family of the rule, on the center of the territory
const FAMILIES: Array<[string, ProjectionParameters]> = [
  ['mercator', defaultTerritoryParameters([-3, 44], createProjectionId('mercator'))],
  ['transverse-mercator', defaultTerritoryParameters([-3, 44], createProjectionId('transverse-mercator'))],
  ['conic-conformal', { ...defaultTerritoryParameters([-3, 44], createProjectionId('conic-conformal')), parallels: [41.3, 46.7] }],
  ['azimuthal-equal-area', defaultTerritoryParameters([-3, 44], createProjectionId('azimuthal-equal-area'))],
]

describe('fitTerritory', () => {
  it.each(FAMILIES)('places the geometry inside its zone, as CompositeProjection draws it, in %s', (_, parameters) => {
    const scaleMultiplier = Math.floor(fittedScale(territory, parameters, zone) / REFERENCE_SCALE * 100) / 100
    const placed = { ...parameters, ...fitTerritory(territory, parameters, zone, { canvas, referenceScale: REFERENCE_SCALE, scaleMultiplier }) }
    const config = { territories: [{ code: CODE, name: 'X', center: [-3, 44] as [number, number], bounds: [[-11, 39], [5, 49]] as [[number, number], [number, number]] }] }
    const composite = new CompositeProjection(
      config,
      { getEffectiveParameters: () => placed, getExportableParameters: () => placed },
      allTerritoriesProvider(config),
      REFERENCE_SCALE,
    )
    composite.build(canvas.width, canvas.height)
    const [[x0, y0], [x1, y1]] = geoPath(composite.getSubProjectionData(CODE)!.projection.clipExtent(null)).bounds(territory)

    expect(x0).toBeGreaterThanOrEqual(zone.left - 0.5)
    expect(y0).toBeGreaterThanOrEqual(zone.top - 0.5)
    expect(x1).toBeLessThanOrEqual(zone.right + 0.5)
    expect(y1).toBeLessThanOrEqual(zone.bottom + 0.5)
  })
})

describe('territoryRect', () => {
  const parameters = { ...defaultTerritoryParameters([-3, 44]), scaleMultiplier: 2, translateOffset: [100, -50] as [number, number] }

  it('is the frame of a territory around its anchor', () => {
    expect(territoryRect(territory, { ...parameters, pixelClipExtent: [-20, -10, 30, 40] }, { canvas, referenceScale: REFERENCE_SCALE }))
      .toEqual({ left: 560, top: 190, right: 610, bottom: 240 })
  })

  it('is the box of the projected geometry of a territory without a frame, around its anchor', () => {
    const projection = ProjectionFactory.createById('mercator')!.translate([0, 0])
    applyPositioning(projection, parameters, 'composite', 'mercator')
    const [[x0, y0], [x1, y1]] = geoPath(projection.scale(2 * REFERENCE_SCALE)).bounds(territory)

    expect(territoryRect(territory, parameters, { canvas, referenceScale: REFERENCE_SCALE })).toEqual({ left: 580 + x0, top: 200 + y0, right: 580 + x1, bottom: 200 + y1 })
  })
})
