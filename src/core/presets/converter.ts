import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { parameterRegistry } from '@/core/parameters'
import { projectionRegistry } from '@/core/projections/registry'

// A file that leaves out the center keeps the center of the d3 factory, as the loader does; the application reads a
// missing center as [0, 0], which differs for the conic equidistant and equal-area projections
function factoryCenter(projectionId: string): [number, number] | undefined {
  const center = projectionRegistry.get(projectionId)?.create().center() as [number, number] | undefined
  return center && (center[0] !== 0 || center[1] !== 0) ? center : undefined
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

    const center = territoryParams.center === undefined && territory.projection?.id
      ? factoryCenter(territory.projection.id)
      : undefined
    if (center) {
      territoryParams.center = center
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
