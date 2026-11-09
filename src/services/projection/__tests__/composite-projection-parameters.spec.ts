import type { GeoProjection } from 'd3-geo'
import type { CompositeProjectionConfig } from '@/types'
import type { ProjectionParameterProvider, ProjectionParameters } from '@/types/projection-parameters'
import { boundsFromArray, calculateClipExtentFromBounds } from '@atlas-composer/projection-core'
import { describe, expect, it } from 'vitest'
import { parameterRegistry } from '@/core/parameters'
import { createProjectionId, createTerritoryCode } from '@/types/branded'
import { CompositeProjection } from '../composite-projection'

const TERRITORY = createTerritoryCode('FR')
const BOUNDS: [[number, number], [number, number]] = [[-5, 42], [8, 51]]
const WIDTH = 800
const HEIGHT = 600

const config: CompositeProjectionConfig = {
  territories: [{ code: TERRITORY, name: 'France', center: [2, 46], bounds: BOUNDS }],
}

const BASE: ProjectionParameters = {
  projectionId: createProjectionId('conic-conformal'),
  center: [0, 0],
  rotate: [-2, -46, 0],
  parallels: [30, 60],
  scaleMultiplier: 2,
  translateOffset: [10, 20],
  clipAngle: 60,
  precision: 0.5,
  pixelClipExtent: [-50, -50, 50, 50],
}

function setup(initial: ProjectionParameters = BASE, compositeConfig = config) {
  const state = { parameters: initial }
  const provider: ProjectionParameterProvider = {
    getEffectiveParameters: () => state.parameters,
    getExportableParameters: () => state.parameters,
  }
  const composite = new CompositeProjection(compositeConfig, provider, 1000)
  const build = (): GeoProjection => {
    composite.build(WIDTH, HEIGHT, true)
    return composite.getSubProjectionData(TERRITORY)!.projection
  }
  return { state, composite, build }
}

const PROBES: Record<string, { change: ProjectionParameters, read: (projection: GeoProjection) => unknown }> = {
  projectionId: { change: { projectionId: createProjectionId('mercator') }, read: projection => 'parallels' in projection },
  center: { change: { center: [4, 5] }, read: projection => projection.center() },
  rotate: { change: { rotate: [-10, -40, 0] }, read: projection => projection.rotate() },
  parallels: { change: { parallels: [40, 50] }, read: projection => (projection as any).parallels() },
  scaleMultiplier: { change: { scaleMultiplier: 3 }, read: projection => projection.scale() },
  translateOffset: { change: { translateOffset: [30, 40] }, read: projection => projection.translate() },
  clipAngle: { change: { clipAngle: 30 }, read: projection => projection.clipAngle() },
  precision: { change: { precision: 2 }, read: projection => projection.precision() },
  pixelClipExtent: { change: { pixelClipExtent: [-80, -80, 80, 80] }, read: projection => projection.clipExtent() },
}

const WITHOUT_EFFECT_ON_THE_SUB_PROJECTION = ['zoomLevel']

const READ_AT_CONSTRUCTION_ONLY = new Set(['clipAngle', 'precision', 'scaleMultiplier', 'rotate', 'center', 'parallels', 'projectionId'])

const keys = parameterRegistry.getAll().map(definition => definition.key as string)

describe('parameters of a territory read at each build', () => {
  it('classifies every parameter of the registry', () => {
    const classified = [...Object.keys(PROBES), ...WITHOUT_EFFECT_ON_THE_SUB_PROJECTION]
    expect(keys.filter(key => !classified.includes(key))).toEqual([])
  })

  for (const key of keys.filter(key => key in PROBES)) {
    const test = READ_AT_CONSTRUCTION_ONLY.has(key) ? it.fails : it
    test(`takes a change of ${key} into account`, () => {
      const { state, build } = setup()
      const { change, read } = PROBES[key]!
      const before = read(build())
      state.parameters = { ...BASE, ...change }
      expect(read(build())).not.toEqual(before)
    })
  }

  it.each(['clipAngle', 'precision', 'pixelClipExtent'])('drops %s once it leaves the provider', (key) => {
    const { [key]: _removed, ...remaining } = BASE
    const { state, build } = setup()
    build()
    state.parameters = remaining
    const expected = setup(remaining).build()
    const projection = build()
    expect(projection.clipAngle()).toEqual(expected.clipAngle())
    expect(projection.precision()).toEqual(expected.precision())
    expect(projection.clipExtent()).toEqual(expected.clipExtent())
  })
})

describe('clipping of a territory without pixelClipExtent', () => {
  const { pixelClipExtent: _pixelClipExtent, ...withoutClip } = BASE

  it('clips it at its bounds', () => {
    const projection = setup(withoutClip).build()
    expect(projection.clipExtent()).toEqual(calculateClipExtentFromBounds(projection as never, boundsFromArray(BOUNDS)))
  })

  it('leaves it without clipExtent when it has no bounds', () => {
    const noBounds = {
      territories: [{ code: TERRITORY, name: 'France', center: [2, 46] }],
    } as unknown as CompositeProjectionConfig
    expect(setup(withoutClip, noBounds).build().clipExtent()).toBeNull()
  })
})

describe('reference scale', () => {
  it('multiplies the reference scale by the multiplier of the territory', () => {
    const { composite, build } = setup()
    composite.updateReferenceScale(3000)
    expect(build().scale()).toBe(6000)
  })
})

describe('provider emptied during a load', () => {
  it('does not throw', () => {
    const { state, build } = setup()
    build()
    state.parameters = {}
    expect(build).not.toThrow()
  })

  it.fails('keeps the sub-projections of the previous build unchanged', () => {
    const { state, build } = setup()
    const before = build().clipExtent()
    state.parameters = {}
    expect(build().clipExtent()).toEqual(before)
  })
})
