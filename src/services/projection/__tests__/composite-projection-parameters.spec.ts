import type { GeoProjection } from 'd3-geo'
import type { ProjectionParameterProvider, ProjectionParameters } from '@/types/projection-parameters'
import type { CompositionEntry } from '@/types/territory'
import { boundsFromArray, calculateClipExtentFromBounds } from '@atlas-composer/projection-core'
import { describe, expect, it } from 'vitest'
import { allTerritoriesProvider, entryProviderOf } from '@/__tests__/test-utils'
import { parameterRegistry } from '@/core/parameters'
import { frameFromRect, rectFromCorners } from '@/core/positioning'
import { createProjectionId, createTerritoryCode } from '@/types/branded'
import { CompositeProjection } from '../composite-projection'

const TERRITORY = createTerritoryCode('FR')
const BOUNDS: [[number, number], [number, number]] = [[-5, 42], [8, 51]]
const WIDTH = 800
const HEIGHT = 600

const ENTRIES: CompositionEntry[] = [{ code: TERRITORY, name: 'France', bounds: BOUNDS }]

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

function setup(initial: ProjectionParameters = BASE, entries = ENTRIES) {
  const state = { parameters: initial }
  const provider: ProjectionParameterProvider = {
    getEffectiveParameters: () => state.parameters,
    getExportableParameters: () => state.parameters,
  }
  const composite = new CompositeProjection(entryProviderOf(entries), provider, allTerritoriesProvider(entries), 1000)
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
    expect(setup(withoutClip, [{ code: TERRITORY, name: 'France' }]).build().clipExtent()).toBeNull()
  })

  it('keeps the frame of the map when the first crop starts from it', () => {
    const { state, composite, build } = setup(withoutClip)
    build()
    const [shown] = composite.getCompositionBorders(WIDTH, HEIGHT)
    expect(shown!.point).toEqual([WIDTH / 2 + 10, HEIGHT / 2 + 20])

    state.parameters = { ...withoutClip, pixelClipExtent: frameFromRect(rectFromCorners(shown!.bounds), shown!.point) }
    build()
    expect(composite.getCompositionBorders(WIDTH, HEIGHT)[0]!.bounds.flat()).toEqual(shown!.bounds.flat().map(value => expect.closeTo(value, 5)))
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
  it('is the name of the entry, in each of its languages', () => {
    const { composite } = setup(BASE, [{ code: TERRITORY, name: { en: 'Metropolitan France', fr: 'France métropolitaine' }, bounds: BOUNDS }])

    expect(composite.exportConfig().subProjections[0]?.territoryName).toEqual({ en: 'Metropolitan France', fr: 'France métropolitaine' })
  })
})

describe('active territories', () => {
  const CODES = ['FR-A', 'FR-B', 'FR-C'].map(createTerritoryCode)
  const threeEntries = entryProviderOf(CODES.map((code, index) => ({ code, name: code, bounds: [[index - 1, 45], [index + 1, 47]] })))

  function setupActive(active: string[]) {
    const state = { active: new Set(active.map(createTerritoryCode)), parameters: { ...BASE } as ProjectionParameters, withoutProjection: new Set<string>() }
    const provider: ProjectionParameterProvider = {
      getEffectiveParameters: code => state.withoutProjection.has(code) ? {} : state.parameters,
      getExportableParameters: code => state.withoutProjection.has(code) ? {} : state.parameters,
    }
    const composite = new CompositeProjection(threeEntries, provider, { getActiveTerritoryCodes: () => state.active }, 1000)
    const codesOf = () => ({
      subProjections: composite.getAllSubProjectionData().map(sub => sub.territoryCode),
      borders: composite.getCompositionBorders(WIDTH, HEIGHT).map(border => border.territoryCode),
      exported: composite.exportConfig().subProjections.map(sub => sub.territoryCode),
      found: CODES.filter(code => composite.getSubProjectionData(code)),
    })
    return { state, composite, codesOf }
  }

  it('keeps the active entries that have a projection, in the order of the entries', () => {
    const { state, composite, codesOf } = setupActive(['FR-C', 'FR-A', 'FR-B'])
    state.withoutProjection.add('FR-B')
    composite.build(WIDTH, HEIGHT)

    expect(codesOf()).toEqual({ subProjections: ['FR-A', 'FR-C'], borders: ['FR-A', 'FR-C'], exported: ['FR-A', 'FR-C'], found: ['FR-A', 'FR-C'] })
  })

  it('reads the order and the bounds of the entries again at each build', () => {
    const entries = { list: CODES.map((code, index): CompositionEntry => ({ code, name: code, bounds: [[index - 1, 45], [index + 1, 47]] })) }
    const composite = new CompositeProjection({ getEntries: () => entries.list }, { getEffectiveParameters: () => BASE, getExportableParameters: () => BASE }, allTerritoriesProvider(CODES.map(code => ({ code }))), 1000)
    const read = () => {
      composite.build(WIDTH, HEIGHT)
      return composite.getAllSubProjectionData().map(({ territoryCode, bounds }) => [territoryCode, bounds])
    }
    expect(read()).toEqual(entries.list.map(({ code, bounds }) => [code, bounds]))

    entries.list = [{ ...entries.list[2]!, bounds: [[10, 10], [12, 12]] }, entries.list[0]!, { ...entries.list[1]!, bounds: undefined }]
    expect(read()).toEqual([['FR-C', [[10, 10], [12, 12]]], ['FR-A', [[-1, 45], [1, 47]]], ['FR-B', undefined]])
    expect(composite.exportConfig().subProjections.map(({ territoryCode, bounds }) => [territoryCode, bounds])).toEqual(read())
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
    const composite = new CompositeProjection(threeEntries, { getEffectiveParameters: () => ({}), getExportableParameters: () => ({}) }, { getActiveTerritoryCodes: () => active }, 1000)

    expect(composite.build(WIDTH, HEIGHT)).toBeNull()
  })
})
