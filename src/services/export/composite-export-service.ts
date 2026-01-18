import type { CompositeProjection, ProjectionParameterProvider } from '@/services/projection/composite-projection'
import type { AtlasId } from '@/types/branded'
import type {
  ExportedCompositeConfig,
  ExportedProjectionParameters,
  ExportedTerritory,
  ExportMetadata,
  ExportValidationResult,
} from '@/types/export-config'
import packageJson from '#package'
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

function roundTuple3(
  arr: [number, number, number] | number[] | undefined,
  decimals = 6,
): [number, number, number] {
  if (!arr || arr.length < 3)
    return [0, 0, 0]
  return [
    roundNumber(arr[0], decimals),
    roundNumber(arr[1], decimals),
    roundNumber(arr[2], decimals),
  ]
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
  bounds: [[number, number], [number, number]] | undefined,
  decimals = 6,
): [[number, number], [number, number]] {
  if (!bounds)
    return [[0, 0], [0, 0]]
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
    parameterProvider?: ProjectionParameterProvider,
    referenceScale?: number,
    canvasDimensions?: { width: number, height: number },
    notes?: string,
  ): ExportedCompositeConfig {
    const rawExport = compositeProjection.exportConfig()

    const territories = rawExport.subProjections.map((subProj): ExportedTerritory => {
      const projectionId = this.resolveProjectionId(subProj.projectionType)
      const projectionDef = projectionRegistry.get(projectionId)

      let projectionParameters: ExportedProjectionParameters
      let layoutTranslateOffset: [number, number]
      let layoutPixelClipExtent: [number, number, number, number] | null = null

      if (parameterProvider) {
        const allParams = parameterProvider.getExportableParameters(subProj.territoryCode)

        const { translateOffset, pixelClipExtent, ...projParams } = allParams

        projectionParameters = projParams as ExportedProjectionParameters
        layoutTranslateOffset = translateOffset
          ? roundTuple2(translateOffset)
          : roundTuple2(subProj.translateOffset)
        layoutPixelClipExtent = pixelClipExtent
          ? roundTuple4(pixelClipExtent)
          : null
      }
      else {
        projectionParameters = {
          center: roundTuple2(subProj.center),
          rotate: subProj.rotate && subProj.rotate.length >= 3
            ? roundTuple3(subProj.rotate as [number, number, number])
            : undefined,
          scaleMultiplier: roundNumber(subProj.scaleMultiplier),
          parallels: roundTuple2(this.extractParallels(subProj)),
        }
        layoutTranslateOffset = roundTuple2(subProj.translateOffset)
      }

      return {
        code: subProj.territoryCode,
        name: subProj.territoryName,
        projection: {
          id: projectionId,
          family: projectionDef?.family || 'unknown',
          parameters: projectionParameters,
        },
        layout: {
          translateOffset: layoutTranslateOffset,
          pixelClipExtent: layoutPixelClipExtent,
        },
        bounds: roundBounds(subProj.bounds),
      }
    })

    const metadata: ExportMetadata = {
      atlasId,
      atlasName,
      exportDate: new Date().toISOString(),
      createdWith: APP_VERSION,
      notes,
    }

    return {
      version: '1.0',
      metadata,
      referenceScale,
      canvasDimensions,
      territories,
    }
  }

  static validateExportedConfig(config: ExportedCompositeConfig): ExportValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!config.version) {
      errors.push('Missing version field')
    }
    else if (config.version !== '1.0') {
      warnings.push(`Unknown version: ${config.version}. Expected 1.0`)
    }

    if (!config.metadata) {
      errors.push('Missing metadata')
    }
    else {
      if (!config.metadata.atlasId) {
        errors.push('Missing metadata.atlasId')
      }
      if (!config.metadata.atlasName) {
        errors.push('Missing metadata.atlasName')
      }
      if (!config.metadata.exportDate) {
        errors.push('Missing metadata.exportDate')
      }
    }

    if (!config.territories || !Array.isArray(config.territories)) {
      errors.push('Missing or invalid territories array')
    }
    else {
      if (config.territories.length === 0) {
        errors.push('No territories in configuration')
      }

      config.territories.forEach((territory, index) => {
        const prefix = `Territory ${index} (${territory.code || 'unknown'})`

        if (!territory.code) {
          errors.push(`${prefix}: Missing code`)
        }
        if (!territory.name) {
          errors.push(`${prefix}: Missing name`)
        }
        if (!territory.projection?.id) {
          errors.push(`${prefix}: Missing projection.id`)
        }

        if (territory.projection?.id && !projectionRegistry.get(territory.projection.id)) {
          warnings.push(`${prefix}: Unknown projection ID '${territory.projection.id}'`)
        }

        if (!territory.projection?.parameters) {
          errors.push(`${prefix}: Missing projection.parameters`)
        }
        else {
          if (typeof territory.projection.parameters.scaleMultiplier !== 'number') {
            errors.push(`${prefix}: Invalid or missing scaleMultiplier`)
          }
        }

        if (!territory.layout) {
          errors.push(`${prefix}: Missing layout`)
        }
        else {
          if (!Array.isArray(territory.layout.translateOffset) || territory.layout.translateOffset.length !== 2) {
            errors.push(`${prefix}: Invalid translateOffset`)
          }

          if (territory.layout.pixelClipExtent !== null && territory.layout.pixelClipExtent !== undefined) {
            if (!Array.isArray(territory.layout.pixelClipExtent) || territory.layout.pixelClipExtent.length !== 4) {
              errors.push(`${prefix}: Invalid pixelClipExtent format - must be [x1, y1, x2, y2]`)
            }
            else {
              for (let i = 0; i < 4; i++) {
                if (typeof territory.layout.pixelClipExtent[i] !== 'number') {
                  errors.push(`${prefix}: Invalid pixelClipExtent coordinate ${i} - must be a number`)
                }
              }
            }
          }
        }

        if (!territory.bounds || !Array.isArray(territory.bounds) || territory.bounds.length !== 2) {
          warnings.push(`${prefix}: Invalid or missing bounds`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  private static resolveProjectionId(projectionType: string): string {
    const allProjections = projectionRegistry.getAll()

    for (const proj of allProjections) {
      const normalizedType = projectionType.toLowerCase().replace(/^geo/, '')
      if (proj.id.replace(/-/g, '') === normalizedType) {
        return proj.id
      }
    }

    const kebabCase = projectionType
      .replace(/^geo/, '')
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')

    return kebabCase
  }

  private static extractParallels(subProj: any): [number, number] | undefined {
    if (subProj.parallels) {
      if (Array.isArray(subProj.parallels)) {
        return subProj.parallels as [number, number]
      }
    }

    if (subProj.projection?.parallels) {
      const parallels = subProj.projection.parallels()
      if (Array.isArray(parallels) && parallels.length === 2) {
        return parallels as [number, number]
      }
    }

    return undefined
  }
}
