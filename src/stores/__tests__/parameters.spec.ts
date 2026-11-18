import type { PositioningView } from '@/core/positioning'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { parameterRegistry } from '@/core/parameters'
import { applyPositioning } from '@/core/positioning'
import { ProjectionFactory } from '@/core/projections/factory'
import { useParameterStore } from '@/stores/parameters'
import { createProjectionId, createTerritoryCode } from '@/types/branded'

const CODE = createTerritoryCode('FR-RE')
const TARGET: [number, number] = [55.52, -21.13]

function projectTarget(view: PositioningView): [number, number] {
  const parameterStore = useParameterStore()
  const params = parameterStore.getEffectiveParameters(CODE)
  const projection = ProjectionFactory.createById(params.projectionId!)!.translate([0, 0])
  applyPositioning(projection, params, view)
  return projection(TARGET)!
}

describe('parameter store projection actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('controls of the axes', () => {
    const POSITIONED_FAMILIES = ['CYLINDRICAL', 'PSEUDOCYLINDRICAL', 'CONIC', 'AZIMUTHAL'] as const

    it.each(POSITIONED_FAMILIES)('gives the controls of the position and the frame of %s', (family) => {
      const parameterStore = useParameterStore()

      expect(parameterStore.getAxisControls(family, 'translateOffset')).toHaveLength(2)
      expect(parameterStore.getAxisControls(family, 'pixelClipExtent')).toHaveLength(4)
    })

    it('gives the scale factor the domain of the specification, zero excluded', () => {
      const [{ domain }] = useParameterStore().getAxisControls('CONIC', 'scaleMultiplier')!

      expect(domain).toEqual({ min: 0, max: Number.POSITIVE_INFINITY, minExclusive: true })
    })

    it('gives no control to a parameter without bounds for the family', () => {
      expect(useParameterStore().getAxisControls('CYLINDRICAL', 'clipAngle')).toBeUndefined()
    })

    it('accepts the position at the limit of its domain and refuses it past the limit', () => {
      const [{ domain: { max } }] = useParameterStore().getAxisControls('CONIC', 'translateOffset')!

      expect(parameterRegistry.validate('translateOffset', [max, 0], 'CONIC').ok).toBe(true)
      expect(parameterRegistry.validate('translateOffset', [max + 1, 0], 'CONIC').ok).toBe(false)
    })
  })

  describe('changeTerritoryProjection', () => {
    it('keeps the target of a mercator territory passed to a conic projection in the composite view', () => {
      const parameterStore = useParameterStore()
      parameterStore.setTerritoryParameters(CODE, { projectionId: 'mercator', center: TARGET })
      const before = projectTarget('composite')

      parameterStore.changeTerritoryProjection(CODE, createProjectionId('conic-conformal'), 'composite')

      expect(parameterStore.getTerritoryParameters(CODE).center).toBeUndefined()
      before.forEach((value, axis) => expect(projectTarget('composite')[axis]).toBeCloseTo(value, 9))
    })

    it('removes clipAngle when the new family does not use it', () => {
      const parameterStore = useParameterStore()
      parameterStore.setTerritoryParameters(CODE, { projectionId: 'azimuthal-equal-area', rotate: [-55, 21, 0], clipAngle: 60 })

      parameterStore.changeTerritoryProjection(CODE, createProjectionId('mercator'), 'composite')

      expect(parameterStore.getEffectiveParameters(CODE).clipAngle).toBeUndefined()
      expect(JSON.parse(JSON.stringify(parameterStore.getExportableParameters(CODE)))).not.toHaveProperty('clipAngle')
    })

    it('keeps clipAngle when the new family uses it', () => {
      const parameterStore = useParameterStore()
      parameterStore.setTerritoryParameters(CODE, { projectionId: 'azimuthal-equal-area', rotate: [-55, 21, 0], clipAngle: 60 })

      parameterStore.changeTerritoryProjection(CODE, createProjectionId('stereographic'), 'composite')

      expect(parameterStore.getEffectiveParameters(CODE).clipAngle).toBe(60)
    })

    it('keeps the target in the shared view after a change of projection in the composite view', () => {
      const parameterStore = useParameterStore()
      parameterStore.setTerritoryParameters(CODE, { projectionId: 'mercator', center: TARGET })
      const before = projectTarget('global')

      parameterStore.changeTerritoryProjection(CODE, createProjectionId('conic-conformal'), 'composite')

      before.forEach((value, axis) => expect(projectTarget('global')[axis]).toBeCloseTo(value, 9))
    })

    it('keeps the positioning of a mercator territory passed to a conic projection in the shared view', () => {
      const parameterStore = useParameterStore()
      parameterStore.setTerritoryParameters(CODE, { projectionId: 'mercator', rotate: [-55.52, 21.13, 0] })
      const before = projectTarget('global')

      parameterStore.changeTerritoryProjection(CODE, createProjectionId('conic-conformal'), 'global')

      expect(parameterStore.getTerritoryParameters(CODE).rotate).toEqual([-55.52, 21.13, 0])
      before.forEach((value, axis) => expect(projectTarget('global')[axis]).toBeCloseTo(value, 9))
    })
  })

  describe('setTerritoryProjection', () => {
    it('keeps the positioning of a loaded preset', () => {
      const parameterStore = useParameterStore()
      parameterStore.setTerritoryParameters(CODE, { rotate: [154, 0, 0], center: [-2, 58.5], parallels: [55, 65] })

      parameterStore.setTerritoryProjection(CODE, createProjectionId('conic-equal-area'))

      expect(parameterStore.getTerritoryParameters(CODE)).toEqual({
        rotate: [154, 0, 0],
        center: [-2, 58.5],
        parallels: [55, 65],
        projectionId: 'conic-equal-area',
      })
    })
  })
})
