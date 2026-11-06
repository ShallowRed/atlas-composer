import { describe, expect, it } from 'vitest'
import { projectionRegistry } from '@/core/projections/registry'
import { ProjectionCategory } from '@/core/projections/types'
import { ProjectionService } from '@/services/projection/projection-service'

const compositeIds = projectionRegistry.getByCategory(ProjectionCategory.COMPOSITE)
  .map(definition => definition.id)

const territory: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [[[-4, 43], [7, 43], [7, 50], [-4, 50], [-4, 43]]] },
  }],
}

describe('projection service with a built-in composite projection', () => {
  it.each(compositeIds)('creates %s without error', (id) => {
    const service = new ProjectionService()
    service.setProjectionParams({ rotate: [-2, -46, 0] })

    const projection = service.getD3Projection(id, territory, 800, 600)

    expect(projection?.scale()).toBeGreaterThan(0)
  })
})
