import type { AtlasId } from '@/types/branded'
import type { ProjectionParameterProvider, ProjectionParameters } from '@/types/projection-parameters'
import { validateConfig } from '@atlas-composer/specification'
import { describe, expect, it } from 'vitest'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { createTerritoryCode } from '@/types/branded'
import { CompositeExportService } from '../composite-export-service'

describe('compositeExportService', () => {
  describe('exportToJSON', () => {
    const parameters: Record<string, ProjectionParameters> = {
      'US-CONT': { projectionId: 'albers', rotate: [96, 0, 0], center: [-0.6, 38.7], parallels: [29.5, 45.5], scaleMultiplier: 1 },
      'FR-MET': { projectionId: 'conic-conformal', rotate: [-3, -46.2, 0], scaleMultiplier: 1 },
      'FR-RE': { projectionId: 'mercator', center: [55.52, -21.13], parallels: [12, 60], scaleMultiplier: 1 },
    }
    const provider: ProjectionParameterProvider = {
      getEffectiveParameters: code => parameters[code]!,
      getExportableParameters: code => parameters[code]!,
    }
    const composite = new CompositeProjection({
      territories: Object.keys(parameters).map(code => ({
        code: createTerritoryCode(code),
        name: code,
        center: [0, 0],
        bounds: [[-1, -1], [1, 1]],
      })),
    }, provider)

    const exported = CompositeExportService.exportToJSON(composite, 'test' as AtlasId, 'Test', provider, 2700, { width: 960, height: 500 })
    const exportedParameters = (code: string) => exported.territories.find(t => t.code === code)!.projection.parameters

    it('writes the applied rotate, center and parallels of a conic projection, albers included', () => {
      expect(exportedParameters('US-CONT')).toMatchObject({ rotate: [96, 0, 0], center: [-0.6, 38.7], parallels: [29.5, 45.5] })
    })

    it('writes the null value of an undefined parameter and the derived parallels', () => {
      expect(exportedParameters('FR-MET')).toMatchObject({ rotate: [-3, -46.2, 0], center: [0, 0], parallels: [44.2, 48.2] })
    })

    it('writes the identifier and the family of the definition of an alias', () => {
      expect(exported.territories.find(t => t.code === 'US-CONT')!.projection).toMatchObject({ id: 'conic-equal-area', family: 'CONIC' })
    })

    it('writes no parallels for a projection without parallels', () => {
      expect(exportedParameters('FR-RE')).toMatchObject({ rotate: [0, 0, 0], center: [55.52, -21.13] })
      expect(exportedParameters('FR-RE')).not.toHaveProperty('parallels')
    })

    it('writes a valid configuration and omits the clip extent of a territory without clip', () => {
      expect(validateConfig(exported)).toMatchObject({ valid: true, errors: [] })
      expect(exported.territories[0]!.layout).not.toHaveProperty('pixelClipExtent')
    })
  })
})
