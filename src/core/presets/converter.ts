import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { TerritoryDefaults } from './types'
import type { Translation } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { parameterRegistry } from '@/core/parameters'

export function convertToDefaults(preset: CompositeProjectionConfig): TerritoryDefaults {
  const projections: Record<TerritoryCode, ProjectionId> = {} as Record<TerritoryCode, ProjectionId>
  const translations: Record<TerritoryCode, Translation> = {} as Record<TerritoryCode, Translation>
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
  preset: CompositeProjectionConfig,
): Record<string, ProjectionParameters> {
  const result: Record<string, ProjectionParameters> = {}

  for (const territory of preset.territories) {
    const territoryParams: Partial<ProjectionParameters> = {
      scaleMultiplier: parameterRegistry.getDefaultValue('scaleMultiplier'),
    }

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
