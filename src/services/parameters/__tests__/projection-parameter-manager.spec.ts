import { beforeEach, describe, expect, it } from 'vitest'
import { createTerritoryCode } from '@/types/branded'
import { ProjectionParameterManager } from '../projection-parameter-manager'

const CODE = createTerritoryCode('FR-RE')

describe('projectionParameterManager', () => {
  let manager: ProjectionParameterManager

  beforeEach(() => {
    manager = new ProjectionParameterManager()
  })

  describe('positioning inheritance', () => {
    it('takes rotate and center from the nearest level that defines one of them', () => {
      manager.setAtlasParameters({ rotate: [10, -45, 0], center: [1, 2] })
      manager.setGlobalParameters({ center: [3, 4] })

      const effective = manager.getEffectiveParameters(CODE)

      expect(effective.center).toEqual([3, 4])
      expect(effective.rotate).toBeUndefined()
    })

    it('gives the territory positioning precedence over the global one', () => {
      manager.setGlobalParameters({ rotate: [10, -45, 0], center: [3, 4] })
      manager.setTerritoryParameters(CODE, { rotate: [-55.5, 21, 0] })

      const effective = manager.getEffectiveParameters(CODE)

      expect(effective.rotate).toEqual([-55.5, 21, 0])
      expect(effective.center).toBeUndefined()
    })

    it('inherits parallels as a whole tuple', () => {
      manager.setGlobalParameters({ parallels: [10, 20] })
      expect(manager.getEffectiveParameters(CODE).parallels).toEqual([10, 20])

      manager.setTerritoryParameters(CODE, { parallels: [30, 40] })
      expect(manager.getEffectiveParameters(CODE).parallels).toEqual([30, 40])
    })
  })

  describe('positioning writes', () => {
    it('replaces both parameters of the territory level', () => {
      manager.setTerritoryParameters(CODE, { center: [55.52, -21.13], projectionId: 'mercator' })
      manager.setTerritoryParameters(CODE, { rotate: [-55.52, 21.13, 0] })

      expect(manager.getTerritoryParameters(CODE)).toEqual({ projectionId: 'mercator', rotate: [-55.52, 21.13, 0] })
    })

    it('replaces both parameters of the global level', () => {
      manager.setGlobalParameters({ rotate: [10, -45, 0], scaleMultiplier: 2 })
      manager.setGlobalParameters({ center: [3, 4] })

      expect(manager.getGlobalParameters()).toEqual({ center: [3, 4], scaleMultiplier: 2 })
    })

    it('replaces both parameters of the atlas level', () => {
      manager.setAtlasParameters({ rotate: [10, -45, 0], center: [1, 2] })
      manager.setAtlasParameters({ rotate: [98, -38, 0] })

      const effective = manager.getEffectiveParameters()

      expect(effective.rotate).toEqual([98, -38, 0])
      expect(effective.center).toBeUndefined()
    })

    it('clears the positioning of a level', () => {
      manager.setAtlasParameters({ rotate: [10, -45, 0] })
      manager.setGlobalParameters({ rotate: [20, -30, 0], parallels: [40, 50] })
      manager.setGlobalParameters({ rotate: undefined, center: undefined })

      expect(manager.getGlobalParameters()).toEqual({ parallels: [40, 50] })
      expect(manager.getEffectiveParameters().rotate).toEqual([10, -45, 0])
    })

    it('refuses rotate and center from the key setters', () => {
      expect(() => manager.setGlobalParameter('rotate', [1, 2, 0])).toThrow()
      expect(() => manager.setGlobalParameter('center', undefined)).toThrow()
      expect(() => manager.setTerritoryParameter(CODE, 'center', [1, 2])).toThrow()
      expect(() => manager.setTerritoryParameter(CODE, 'rotate', [1, 2, 0])).toThrow()
    })
  })
})
