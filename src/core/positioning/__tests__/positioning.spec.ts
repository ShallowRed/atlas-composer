import type { ProjectionFamilyType } from '@/core/projections/types'
import { geoConicConformal, geoConicEqualArea, geoMercator, geoOrthographic } from 'd3-geo'
import { describe, expect, it } from 'vitest'

import {
  applyPositioning,
  convertDeprecatedPositioning,
  convertPositioning,
  getDerivedParallels,
  getPositionParameter,
  getTargetCoordinates,
  supportsPanning,
} from '@/core/positioning'

const FAMILIES: ProjectionFamilyType[] = [
  'CYLINDRICAL',
  'PSEUDOCYLINDRICAL',
  'CONIC',
  'AZIMUTHAL',
  'POLYHEDRAL',
  'COMPOSITE',
  'OTHER',
]

const US_AK = { center: [-2, 58.5] as [number, number], rotate: [154, 0, 0] as [number, number, number] }

function expectTuple(actual: number[] | undefined, expected: number[]) {
  expect(actual).toHaveLength(expected.length)
  expected.forEach((value, index) => expect(actual![index]).toBeCloseTo(value, 9))
}

describe('getPositionParameter', () => {
  it.each(FAMILIES)('gives %s its position parameter in each view', (family) => {
    expect(getPositionParameter(family, 'composite')).toBe(family === 'CYLINDRICAL' ? 'center' : 'rotate')
    expect(getPositionParameter(family, 'global')).toBe('rotate')
  })
})

describe('supportsPanning', () => {
  it.each(FAMILIES)('enables panning for %s', (family) => {
    const expected = ['CYLINDRICAL', 'PSEUDOCYLINDRICAL', 'AZIMUTHAL', 'POLYHEDRAL'].includes(family)
    expect(supportsPanning(family)).toBe(expected)
  })
})

describe('getTargetCoordinates', () => {
  it('reads the target from center alone', () => {
    expectTuple(getTargetCoordinates({ center: [2.5, 46] }), [2.5, 46])
  })

  it('reads the target from rotate alone', () => {
    expectTuple(getTargetCoordinates({ rotate: [-3, -46.2, 10] }), [3, 46.2])
  })

  it('combines center and rotate', () => {
    expectTuple(getTargetCoordinates(US_AK), [-156, 58.5])
  })

  it('accepts a two-axis rotate', () => {
    expectTuple(getTargetCoordinates({ rotate: [-10, -45] }), [10, 45])
  })

  it('gives the origin without positioning', () => {
    expectTuple(getTargetCoordinates({}), [0, 0])
  })
})

describe('getDerivedParallels', () => {
  it('surrounds the target latitude in the composite view', () => {
    expectTuple(getDerivedParallels({ rotate: [-3, -46.2, 0] }, 'composite'), [44.2, 48.2])
  })

  it('derives nothing for a null target latitude in the composite view', () => {
    expect(getDerivedParallels({ rotate: [-55, 0, 0] }, 'composite')).toBeUndefined()
    expect(getDerivedParallels({}, 'composite')).toBeUndefined()
  })

  it('gives [44, 49] in the global view', () => {
    expect(getDerivedParallels({ rotate: [-3, -46.2, 0] }, 'global')).toEqual([44, 49])
    expect(getDerivedParallels({}, 'global')).toEqual([44, 49])
  })
})

describe('convertDeprecatedPositioning', () => {
  it('gives center to a cylindrical projection and drops gamma', () => {
    expect(convertDeprecatedPositioning({ focusLongitude: 55.5, focusLatitude: -21, rotateGamma: 12 }, 'CYLINDRICAL'))
      .toEqual({ center: [55.5, -21], rotate: undefined })
  })

  it.each(FAMILIES.filter(family => family !== 'CYLINDRICAL'))('gives rotate to %s', (family) => {
    expect(convertDeprecatedPositioning({ focusLongitude: 3, focusLatitude: 46.2, rotateGamma: 12 }, family))
      .toEqual({ center: undefined, rotate: [-3, -46.2, 12] })
  })

  it('takes 0 for the missing focus coordinate', () => {
    expect(convertDeprecatedPositioning({ focusLatitude: 46 }, 'CONIC'))
      .toEqual({ center: undefined, rotate: [-0, -46, 0] })
    expect(convertDeprecatedPositioning({ focusLongitude: 2 }, 'CYLINDRICAL'))
      .toEqual({ center: [2, 0], rotate: undefined })
  })

  it('converts nothing without focus coordinates', () => {
    expect(convertDeprecatedPositioning({}, 'CONIC')).toBeUndefined()
    expect(convertDeprecatedPositioning({ rotateGamma: 5 }, 'CONIC')).toBeUndefined()
  })
})

describe('convertPositioning', () => {
  it('converts US-AK to a cylindrical projection', () => {
    const result = convertPositioning(US_AK, 'CYLINDRICAL')
    expectTuple(result.center, [-156, 58.5])
    expect(result.rotate).toBeUndefined()
  })

  it('converts US-AK to a conic projection', () => {
    const result = convertPositioning(US_AK, 'CONIC')
    expectTuple(result.rotate, [156, -58.5, 0])
    expect(result.center).toBeUndefined()
  })

  it('keeps the projected target of US-AK at the translate point', () => {
    const converted = convertPositioning(US_AK, 'CONIC')
    const before = geoConicEqualArea().translate([0, 0])
    const after = geoConicEqualArea().translate([0, 0])
    applyPositioning(before, { ...US_AK, parallels: [55, 65] }, 'composite')
    applyPositioning(after, { ...converted, parallels: [55, 65] }, 'composite')
    expectTuple(before([-156, 58.5])!, [0, 0])
    expectTuple(after([-156, 58.5])!, [0, 0])
  })

  it('converts a cylindrical center to rotate and keeps gamma of rotate', () => {
    expect(convertPositioning({ center: [2, 46] }, 'AZIMUTHAL')).toEqual({ center: undefined, rotate: [-2, -46, 0] })
    const result = convertPositioning({ rotate: [-2, -46, 15] }, 'CONIC')
    expectTuple(result.rotate, [-2, -46, 15])
  })
})

describe('applyPositioning', () => {
  describe('composite view', () => {
    it('applies center and rotate of the state', () => {
      const projection = geoConicConformal()
      applyPositioning(projection, { ...US_AK, parallels: [55, 65] }, 'composite')
      expectTuple(projection.center(), [-2, 58.5])
      expectTuple(projection.rotate(), [154, 0, 0])
      expectTuple(projection.parallels(), [55, 65])
    })

    it('gives an undefined center or rotate its null value', () => {
      const projection = geoMercator().center([10, 10]).rotate([20, 20, 20])
      applyPositioning(projection, { center: [2, 46] }, 'composite')
      expectTuple(projection.center(), [2, 46])
      expectTuple(projection.rotate(), [0, 0, 0])

      applyPositioning(projection, { rotate: [-3, -46, 0] }, 'composite')
      expectTuple(projection.center(), [0, 0])
      expectTuple(projection.rotate(), [-3, -46, 0])
    })

    it('derives the parallels of a conic projection without parallels', () => {
      const projection = geoConicConformal()
      applyPositioning(projection, { rotate: [-3, -46.2, 0] }, 'composite')
      expectTuple(projection.parallels(), [44.2, 48.2])
    })

    it('keeps the parallels of the definition for a null target latitude', () => {
      const projection = geoConicConformal().parallels([30, 60])
      applyPositioning(projection, { rotate: [-55, 0, 0] }, 'composite')
      expectTuple(projection.parallels(), [30, 60])
    })
  })

  describe('global view', () => {
    it('applies center and rotate of the state', () => {
      const projection = geoOrthographic()
      applyPositioning(projection, { rotate: [-2, -46, 10], center: [1, 2] }, 'global')
      expectTuple(projection.rotate(), [-2, -46, 10])
      expectTuple(projection.center(), [1, 2])
    })

    it('keeps the factory values of an undefined center or rotate', () => {
      const projection = geoOrthographic().center([5, 6]).rotate([7, 8, 9])
      applyPositioning(projection, {}, 'global')
      expectTuple(projection.center(), [5, 6])
      expectTuple(projection.rotate(), [7, 8, 9])
    })

    it('gives [44, 49] to a conic projection without parallels', () => {
      const projection = geoConicConformal().parallels([30, 60])
      applyPositioning(projection, { rotate: [-3, -46.2, 0] }, 'global')
      expectTuple(projection.parallels(), [44, 49])
    })

    it('applies the parallels of the state', () => {
      const projection = geoConicConformal()
      applyPositioning(projection, { parallels: [40, 50] }, 'global')
      expectTuple(projection.parallels(), [40, 50])
    })
  })
})
