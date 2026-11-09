import type { CompositeProjectionConfig } from '@/types'
import type { ProjectionParameterProvider } from '@/types/projection-parameters'
import { describe, expect, it } from 'vitest'
import { createProjectionId, createTerritoryCode } from '@/types/branded'
import { CompositeProjection } from '../composite-projection'

const TERRITORY = createTerritoryCode('FR')

const config: CompositeProjectionConfig = {
  territories: [{
    code: TERRITORY,
    name: 'France Metropolitan',
    center: [2, 46],
    bounds: [[-5, 42], [8, 51]],
  }],
}

const parameterProvider: ProjectionParameterProvider = {
  getEffectiveParameters: () => ({
    projectionId: createProjectionId('conic-conformal'),
    rotate: [-2, -46, 0],
    scaleMultiplier: 2,
  }),
  getExportableParameters: () => ({}),
}

describe('compositeProjection - reference scale', () => {
  it('applies the multiplier of a territory once after a change of reference scale', () => {
    const composite = new CompositeProjection(config, parameterProvider, 1000)
    const scale = () => composite.getSubProjectionData(TERRITORY)!.projection.scale!()

    composite.updateReferenceScale(3000)
    expect(scale()).toBe(6000)

    composite.updateTerritoryParameters(TERRITORY)
    expect(scale()).toBe(6000)
  })
})
