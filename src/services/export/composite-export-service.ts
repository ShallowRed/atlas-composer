import type { CanvasDimensions, CompositeProjectionConfig, ConfigMetadata, ProjectionParameters, TerritoryConfig } from '@atlas-composer/specification'
import type { CompositeProjection } from '@/services/projection/composite-projection'
import type { AtlasId } from '@/types/branded'
import type { ProjectionParameterProvider } from '@/types/projection-parameters'
import packageJson from '#package'
import { PROJECTION_PARAMETER_KEYS, SPECIFICATION_VERSION } from '@atlas-composer/specification'
import { projectionRegistry } from '@/core/projections/registry'

const APP_VERSION = `Atlas composer v${packageJson.version === '0.0.0' ? '1.0' : packageJson.version}`

function roundNumber(n: number | undefined, decimals = 6): number {
  if (n === undefined)
    return 0
  return Math.round(n * 10 ** decimals) / 10 ** decimals
}

function roundTuple2(
  arr: [number, number] | number[] | undefined,
  decimals = 6,
): [number, number] {
  if (!arr || arr.length < 2)
    return [0, 0]
  return [roundNumber(arr[0], decimals), roundNumber(arr[1], decimals)]
}

function roundTuple4(
  arr: [number, number, number, number] | number[] | undefined,
  decimals = 6,
): [number, number, number, number] {
  if (!arr || arr.length < 4)
    return [0, 0, 0, 0]
  return [
    roundNumber(arr[0], decimals),
    roundNumber(arr[1], decimals),
    roundNumber(arr[2], decimals),
    roundNumber(arr[3], decimals),
  ]
}

function roundBounds(
  bounds: [[number, number], [number, number]],
  decimals = 6,
): [[number, number], [number, number]] {
  return [
    [roundNumber(bounds[0][0], decimals), roundNumber(bounds[0][1], decimals)],
    [roundNumber(bounds[1][0], decimals), roundNumber(bounds[1][1], decimals)],
  ]
}

export class CompositeExportService {
  static exportToJSON(
    compositeProjection: CompositeProjection,
    atlasId: AtlasId,
    atlasName: string,
    parameterProvider: ProjectionParameterProvider,
    referenceScale: number,
    canvasDimensions: CanvasDimensions,
    notes?: string,
  ): CompositeProjectionConfig {
    const rawExport = compositeProjection.exportConfig()

    const territories = rawExport.subProjections.map((subProj): TerritoryConfig => {
      const definition = projectionRegistry.get(subProj.projectionType)
      if (!definition) {
        throw new Error(`Territory ${subProj.territoryCode}: unknown projection '${subProj.projectionType}'`)
      }

      const allParams = parameterProvider.getExportableParameters(subProj.territoryCode)
      const { translateOffset, pixelClipExtent } = allParams
      const { rotate, center, parallels } = subProj
      const parameters: Record<string, unknown> = { ...allParams, rotate, center, parallels }
      const projectionParameters = Object.fromEntries(PROJECTION_PARAMETER_KEYS
        .filter(key => parameters[key] !== undefined)
        .map(key => [key, parameters[key]])) as ProjectionParameters

      return {
        code: subProj.territoryCode,
        name: subProj.territoryName,
        projection: {
          id: definition.id,
          family: definition.family,
          parameters: projectionParameters,
        },
        layout: {
          translateOffset: roundTuple2(translateOffset ?? subProj.translateOffset),
          ...(pixelClipExtent && { pixelClipExtent: roundTuple4(pixelClipExtent) }),
        },
        ...(subProj.bounds && { bounds: roundBounds(subProj.bounds) }),
      }
    })

    const metadata: ConfigMetadata = {
      atlasId,
      atlasName,
      exportDate: new Date().toISOString(),
      createdWith: APP_VERSION,
      ...(notes && { notes }),
    }

    return {
      version: SPECIFICATION_VERSION,
      metadata,
      referenceScale,
      canvasDimensions,
      territories: territories as CompositeProjectionConfig['territories'],
    }
  }
}
