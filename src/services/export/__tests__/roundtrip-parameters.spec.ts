/**
 * Roundtrip Test for Export/Import Parameter Completeness
 *
 * Verifies that all parameters survive the export/import cycle without loss
 */

import type { CompositeProjectionConfig } from '@/types'
import type { ExportedCompositeConfig } from '@/types/export-config'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { CompositeExportService } from '@/services/export/composite-export-service'
import { CompositeImportService } from '@/services/export/composite-import-service'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { useConfigStore } from '@/stores/config'
import { useParameterStore } from '@/stores/parameters'

// Mock composite projection config
const mockConfig: CompositeProjectionConfig = {
  type: 'single-focus',
  mainland: {
    code: 'FR-MET',
    name: 'Metropolitan France',
    center: [2.5, 46.5] as [number, number],
    bounds: [[-5, 41], [10, 51]] as [[number, number], [number, number]],
  },
  overseasTerritories: [
    {
      code: 'FR-GP',
      name: 'Guadeloupe',
      center: [-61.46, 16.14] as [number, number],
      bounds: [[-62, 15], [-61, 17]] as [[number, number], [number, number]],
    },
  ],
}

describe('export/import parameter roundtrip', () => {
  let parameterStore: ReturnType<typeof useParameterStore>
  let configStore: ReturnType<typeof useConfigStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)

    parameterStore = useParameterStore()
    configStore = useConfigStore()

    // Initialize parameter store
    parameterStore.initialize()
  })

  it('should preserve all parameters in export/import roundtrip', () => {
    // Set up initial parameters with all possible values
    const originalParams = {
      'FR-MET': {
        projectionId: 'conic-conformal',
        center: [2.5, 46.5] as [number, number],
        rotate: [-3, -46.2, 0] as [number, number, number],
        parallels: [45, 50] as [number, number],
        scaleMultiplier: 1.2,
        translateOffset: [0, 0] as [number, number],
        clipAngle: 90,
        precision: 0.1,
        pixelClipExtent: [-100, -100, 100, 100] as [number, number, number, number],
      },
      'FR-GP': {
        projectionId: 'mercator',
        center: [-61.46, 16.14] as [number, number],
        rotate: [0, 0, 0] as [number, number, number],
        parallels: [30, 60] as [number, number],
        scaleMultiplier: 1.4,
        translateOffset: [-324, -38] as [number, number],
        clipAngle: 180,
        precision: 0.05,
        pixelClipExtent: [-50, -50, 50, 50] as [number, number, number, number],
      },
    }

    // Set parameters in parameter store
    for (const [territoryCode, params] of Object.entries(originalParams)) {
      parameterStore.setTerritoryParameters(territoryCode, params)
    }

    // Create composite projection with parameter provider
    const compositeProjection = new CompositeProjection(mockConfig, {
      getEffectiveParameters: (territoryCode: string) => {
        return parameterStore.getEffectiveParameters(territoryCode)
      },
      getExportableParameters: (territoryCode: string) => {
        return parameterStore.getExportableParameters(territoryCode)
      },
    })

    // Export the configuration
    const exported: ExportedCompositeConfig = CompositeExportService.exportToJSON(
      compositeProjection,
      'test-atlas',
      'Test Atlas',
      mockConfig,
      {
        getEffectiveParameters: (territoryCode: string) => {
          return parameterStore.getEffectiveParameters(territoryCode)
        },
        getExportableParameters: (territoryCode: string) => {
          return parameterStore.getExportableParameters(territoryCode)
        },
      },
      2700,
      { width: 960, height: 500 },
      'Roundtrip test',
    )

    // Verify that all parameters are in the exported config
    for (const territory of exported.territories) {
      const originalTerritoryParams = originalParams[territory.code as keyof typeof originalParams]

      // Verify projection ID
      expect(territory.projection.id).toBe(originalTerritoryParams.projectionId)

      // Verify all projection parameters
      expect(territory.projection.parameters.center).toEqual(originalTerritoryParams.center)
      expect(territory.projection.parameters.rotate).toEqual(originalTerritoryParams.rotate)
      expect(territory.projection.parameters.parallels).toEqual(originalTerritoryParams.parallels)
      expect(territory.projection.parameters.scaleMultiplier).toBe(originalTerritoryParams.scaleMultiplier)
      expect(territory.projection.parameters.clipAngle).toBe(originalTerritoryParams.clipAngle)
      expect(territory.projection.parameters.precision).toBe(originalTerritoryParams.precision)

      // Verify layout parameters
      expect(territory.layout.translateOffset).toEqual(originalTerritoryParams.translateOffset)
      expect(territory.layout.pixelClipExtent).toEqual(originalTerritoryParams.pixelClipExtent)
    }

    // Reset stores for import
    parameterStore.reset()
    parameterStore.initialize()

    // Import the configuration back
    CompositeImportService.applyToStores(
      exported,
      configStore,
      parameterStore,
      compositeProjection,
    )

    // Verify that all parameters were restored correctly
    for (const [territoryCode, originalTerritoryParams] of Object.entries(originalParams)) {
      const restoredParams = parameterStore.getEffectiveParameters(territoryCode)
      const territoryProjection = parameterStore.getTerritoryProjection(territoryCode)
      const territoryTranslation = parameterStore.getTerritoryTranslation(territoryCode)

      // Verify projection ID
      expect(territoryProjection).toBe(originalTerritoryParams.projectionId)
      expect(restoredParams.projectionId).toBe(originalTerritoryParams.projectionId)

      // Verify all projection parameters
      expect(restoredParams.center).toEqual(originalTerritoryParams.center)
      expect(restoredParams.rotate).toEqual(originalTerritoryParams.rotate)
      expect(restoredParams.parallels).toEqual(originalTerritoryParams.parallels)
      expect(restoredParams.scaleMultiplier).toBe(originalTerritoryParams.scaleMultiplier)
      expect(restoredParams.clipAngle).toBe(originalTerritoryParams.clipAngle)
      expect(restoredParams.precision).toBe(originalTerritoryParams.precision)
      expect(restoredParams.pixelClipExtent).toEqual(originalTerritoryParams.pixelClipExtent)

      // Verify layout parameters
      expect(restoredParams.translateOffset).toEqual(originalTerritoryParams.translateOffset)
      expect(territoryTranslation).toEqual({
        x: originalTerritoryParams.translateOffset[0],
        y: originalTerritoryParams.translateOffset[1],
      })
    }
  })

  it('should handle partial parameter sets gracefully', () => {
    // Set up minimal parameters
    const minimalParams = {
      'FR-MET': {
        projectionId: 'conic-conformal',
        scaleMultiplier: 1.0,
        translateOffset: [0, 0] as [number, number],
      },
    }

    // Set parameters in parameter store
    for (const [territoryCode, params] of Object.entries(minimalParams)) {
      parameterStore.setTerritoryParameters(territoryCode, params)
    }

    // Create composite projection
    const compositeProjection = new CompositeProjection(mockConfig, {
      getEffectiveParameters: (territoryCode: string) => {
        return parameterStore.getEffectiveParameters(territoryCode)
      },
      getExportableParameters: (territoryCode: string) => {
        return parameterStore.getExportableParameters(territoryCode)
      },
    })

    // Export and import should work without errors
    const exported = CompositeExportService.exportToJSON(
      compositeProjection,
      'test-atlas',
      'Test Atlas',
      mockConfig,
      {
        getEffectiveParameters: (territoryCode: string) => {
          return parameterStore.getEffectiveParameters(territoryCode)
        },
        getExportableParameters: (territoryCode: string) => {
          return parameterStore.getExportableParameters(territoryCode)
        },
      },
    )

    // Verify export has required fields
    expect(exported.territories).toHaveLength(2)
    const firstTerritory = exported.territories[0]
    expect(firstTerritory).toBeDefined()
    expect(firstTerritory!.projection.id).toBe('conic-conformal')
    expect(firstTerritory!.projection.parameters.scaleMultiplier).toBe(1.0)

    // Import should not throw
    expect(() => {
      CompositeImportService.applyToStores(
        exported,
        configStore,
        parameterStore,
        compositeProjection,
      )
    }).not.toThrow()
  })
})
