import type { TerritoryDefaults } from './types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type { ExportedCompositeConfig } from '@/types/export-config'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { parameterRegistry } from '@/core/parameters'
import { inferCanonicalFromLegacy } from '@/core/positioning'

export function convertToDefaults(preset: ExportedCompositeConfig): TerritoryDefaults {
  const projections: Record<TerritoryCode, ProjectionId> = {} as Record<TerritoryCode, ProjectionId>
  const translations: Record<TerritoryCode, { x: number, y: number }> = {} as Record<TerritoryCode, { x: number, y: number }>
  const scales: Record<TerritoryCode, number> = {} as Record<TerritoryCode, number>

  preset.territories.forEach((territory) => {
    const code = territory.code as TerritoryCode

    projections[code] = territory.projection.id as ProjectionId

    translations[code] = {
      x: territory.layout.translateOffset[0],
      y: territory.layout.translateOffset[1],
    }

    scales[code] = territory.projection.parameters.scaleMultiplier ?? 1
  })

  return {
    projections,
    translations,
    scales,
  }
}

export function extractTerritoryParameters(
  preset: ExportedCompositeConfig,
): Record<string, ProjectionParameters> {
  const result: Record<string, ProjectionParameters> = {}

  for (const territory of preset.territories) {
    const territoryParams: Partial<ProjectionParameters> = {}

    if (territory.projection?.id) {
      territoryParams.projectionId = territory.projection.id
    }

    if (territory.projection.parameters) {
      const exportableKeys = new Set(
        parameterRegistry.getExportable().map(def => def.key),
      )

      for (const [key, value] of Object.entries(territory.projection.parameters)) {
        if (exportableKeys.has(key as keyof ProjectionParameters) && value !== undefined) {
          territoryParams[key as keyof ProjectionParameters] = value as any
        }
      }

      const hasLegacyPositioning = territoryParams.center || territoryParams.rotate
      const hasCanonicalPositioning = territoryParams.focusLongitude !== undefined
        || territoryParams.focusLatitude !== undefined

      if (hasLegacyPositioning && !hasCanonicalPositioning) {
        const canonical = inferCanonicalFromLegacy({
          center: territoryParams.center as [number, number] | undefined,
          rotate: territoryParams.rotate as [number, number, number] | undefined,
        })

        territoryParams.focusLongitude = canonical.focusLongitude
        territoryParams.focusLatitude = canonical.focusLatitude
        if (canonical.rotateGamma !== 0) {
          territoryParams.rotateGamma = canonical.rotateGamma
        }

        delete territoryParams.center
        delete territoryParams.rotate
      }
    }

    if (territory.layout?.pixelClipExtent && Array.isArray(territory.layout.pixelClipExtent) && territory.layout.pixelClipExtent.length === 4) {
      territoryParams.pixelClipExtent = territory.layout.pixelClipExtent as [number, number, number, number]
    }

    if (territory.layout?.translateOffset && Array.isArray(territory.layout.translateOffset) && territory.layout.translateOffset.length === 2) {
      territoryParams.translateOffset = territory.layout.translateOffset as [number, number]
    }

    result[territory.code] = territoryParams as ProjectionParameters
  }

  return result
}
