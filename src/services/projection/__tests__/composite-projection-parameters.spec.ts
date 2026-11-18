import type { GeoProjection } from 'd3-geo'
import type { CompositeTerritories } from '@/types'
import type { ProjectionParameterProvider, ProjectionParameters } from '@/types/projection-parameters'
import { boundsFromArray, calculateClipExtentFromBounds } from '@atlas-composer/projection-core'
import { describe, expect, it } from 'vitest'
import { allTerritoriesProvider } from '@/__tests__/test-utils'
import { parameterRegistry } from '@/core/parameters'
import { createProjectionId, createTerritoryCode } from '@/types/branded'
import { CompositeProjection } from '../composite-projection'

const TERRITORY = createTerritoryCode('FR')
const BOUNDS: [[number, number], [number, number]] = [[-5, 42], [8, 51]]
const WIDTH = 800
const HEIGHT = 600

const config: CompositeTerritories = {
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
  const composite = new CompositeProjection(compositeConfig, provider, allTerritoriesProvider(compositeConfig), 1000)
  const build = (): GeoProjection => {
    composite.build(WIDTH, HEIGHT)
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

const keys = parameterRegistry.getAll().map(definition => definition.key as string)

describe('parameters of a territory read at each build', () => {
  it('classifies every parameter of the registry', () => {
    expect(keys.filter(key => !(key in PROBES))).toEqual([])
  })

  for (const key of keys.filter(key => key in PROBES)) {
    it(`takes a change of ${key} into account`, () => {
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
    } as unknown as CompositeTerritories
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

  it('keeps the sub-projections of the previous build unchanged', () => {
    const { state, build } = setup()
    const previous = build()
    const read = () => [previous.translate(), previous.scale(), previous.clipAngle(), previous.precision(), previous.clipExtent()]
    const before = read()
    state.parameters = {}
    expect(build()).toBe(previous)
    expect(read()).toEqual(before)
  })
})

describe('exported territory name', () => {
  it('is the name of the configuration, in each of its languages', () => {
    const { composite } = setup(BASE, {
      territories: [{ code: TERRITORY, name: { en: 'Metropolitan France', fr: 'France métropolitaine' }, center: [2, 46], bounds: BOUNDS }],
    })

    expect(composite.exportConfig().subProjections[0]?.territoryName).toEqual({ en: 'Metropolitan France', fr: 'France métropolitaine' })
  })
})

describe('active territories', () => {
  const CODES = ['FR-A', 'FR-B', 'FR-C'].map(createTerritoryCode)
  const threeTerritories: CompositeTerritories = {
    territories: CODES.map((code, index) => ({ code, name: code, center: [index, 46], bounds: [[index - 1, 45], [index + 1, 47]] })),
  }

  function setupActive(active: string[]) {
    const state = { active: new Set(active.map(createTerritoryCode)), parameters: { ...BASE } as ProjectionParameters, withoutProjection: new Set<string>() }
    const provider: ProjectionParameterProvider = {
      getEffectiveParameters: code => state.withoutProjection.has(code) ? {} : state.parameters,
      getExportableParameters: code => state.withoutProjection.has(code) ? {} : state.parameters,
    }
    const composite = new CompositeProjection(threeTerritories, provider, { getActiveTerritoryCodes: () => state.active }, 1000)
    const codesOf = () => ({
      subProjections: composite.getAllSubProjectionData().map(sub => sub.territoryCode),
      borders: composite.getCompositionBorders(WIDTH, HEIGHT).map(border => border.territoryCode),
      exported: composite.exportConfig().subProjections.map(sub => sub.territoryCode),
      found: CODES.filter(code => composite.getSubProjectionData(code)),
    })
    return { state, composite, codesOf }
  }

  it('keeps the active territories that have a projection, in the order of the configuration', () => {
    const { state, composite, codesOf } = setupActive(['FR-C', 'FR-A', 'FR-B'])
    state.withoutProjection.add('FR-B')
    composite.build(WIDTH, HEIGHT)

    expect(codesOf()).toEqual({ subProjections: ['FR-A', 'FR-C'], borders: ['FR-A', 'FR-C'], exported: ['FR-A', 'FR-C'], found: ['FR-A', 'FR-C'] })
  })

  it('reads the active territories again at each build', () => {
    const { state, composite, codesOf } = setupActive(['FR-A', 'FR-B'])
    composite.build(WIDTH, HEIGHT)
    state.active = new Set([createTerritoryCode('FR-B'), createTerritoryCode('FR-C')])
    composite.build(WIDTH, HEIGHT)

    expect(codesOf().subProjections).toEqual(['FR-B', 'FR-C'])
  })

  it('builds no projection without an active territory', () => {
    const { state, composite, codesOf } = setupActive(['FR-A'])
    composite.build(WIDTH, HEIGHT)
    state.active = new Set()

    expect(composite.build(WIDTH, HEIGHT)).toBeNull()
    expect(codesOf()).toEqual({ subProjections: [], borders: [], exported: [], found: [] })
  })

  it('keeps the sub-projections of the previous build while the parameters of the active territories load', () => {
    const { state, composite, codesOf } = setupActive(['FR-A', 'FR-B'])
    const previous = composite.build(WIDTH, HEIGHT)
    state.withoutProjection = new Set(CODES)

    expect(composite.build(WIDTH, HEIGHT)).not.toBeNull()
    expect(previous).not.toBeNull()
    expect(codesOf().subProjections).toEqual(['FR-A', 'FR-B'])
  })

  it('builds no projection on a new composite whose active territories have no parameters yet', () => {
    const active = new Set([createTerritoryCode('FR-A')])
    const composite = new CompositeProjection(threeTerritories, { getEffectiveParameters: () => ({}), getExportableParameters: () => ({}) }, { getActiveTerritoryCodes: () => active }, 1000)

    expect(composite.build(WIDTH, HEIGHT)).toBeNull()
  })
})
