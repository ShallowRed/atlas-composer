import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { parameterRegistry } from '@/core/parameters'

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
