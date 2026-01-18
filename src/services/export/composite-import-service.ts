import type { AtlasId, ProjectionId, TerritoryCode } from '@/types/branded'
import type { ExportedCompositeConfig, ExportValidationResult } from '@/types/export-config'
import { logger } from '@/utils/logger'
import { CompositeExportService } from './composite-export-service'

const debug = logger.export.service

export interface ImportResult {
  success: boolean
  config?: ExportedCompositeConfig
  errors: string[]
  warnings: string[]
}

export class CompositeImportService {
  static importFromJSON(jsonString: string): ImportResult {
    const errors: string[] = []
    const warnings: string[] = []

    let config: ExportedCompositeConfig
    try {
      config = JSON.parse(jsonString)
    }
    catch (error) {
      return {
        success: false,
        errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
      }
    }

    const validation = CompositeExportService.validateExportedConfig(config)

    errors.push(...validation.errors)
    warnings.push(...validation.warnings)

    const success = errors.length === 0

    return {
      success,
      config: success ? config : undefined,
      errors,
      warnings,
    }
  }

  static async importFromFile(file: File): Promise<ImportResult> {
    if (!file.name.endsWith('.json')) {
      return {
        success: false,
        errors: ['File must be a JSON file (.json extension)'],
        warnings: [],
      }
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        errors: [`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`],
        warnings: [],
      }
    }

    try {
      const text = await file.text()
      return this.importFromJSON(text)
    }
    catch (error) {
      return {
        success: false,
        errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
      }
    }
  }

  static checkAtlasCompatibility(
    config: ExportedCompositeConfig,
    currentAtlasId: AtlasId,
  ): ExportValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (config.metadata.atlasId !== currentAtlasId) {
      warnings.push(
        `Configuration was exported for atlas '${config.metadata.atlasId}' but current atlas is '${currentAtlasId}'. Territory codes may not match.`,
      )
    }

    return { errors, warnings, valid: errors.length === 0 }
  }

  static applyToStores(
    config: ExportedCompositeConfig,
    projectionStore: ReturnType<typeof import('@/stores/projection').useProjectionStore>,
    viewStore: ReturnType<typeof import('@/stores/view').useViewStore>,
    parameterStore: ReturnType<typeof import('@/stores/parameters').useParameterStore>,
    compositeProjection: import('@/services/projection/composite-projection').CompositeProjection,
  ): void {
    if (config.referenceScale !== undefined) {
      projectionStore.referenceScale = config.referenceScale
    }
    if (config.canvasDimensions) {
      projectionStore.canvasDimensions = {
        width: config.canvasDimensions.width,
        height: config.canvasDimensions.height,
      }
    }

    if (compositeProjection) {
      try {
        config.territories.forEach((territory) => {
          const subProj = (compositeProjection as any).subProjections?.find((sp: any) => sp.territoryCode === territory.code)
          if (subProj && territory.projection.parameters.scaleMultiplier !== undefined) {
            subProj.baseScale = territory.projection.parameters.scaleMultiplier
          }
        })
      }
      catch (error) {
        debug('Error setting scale values: %o', error)
      }
    }

    config.territories.forEach((territory) => {
      try {
        const params: Record<string, any> = {
          projectionId: territory.projection.id,
          ...territory.projection.parameters,
          translateOffset: territory.layout.translateOffset,
        }

        if (territory.layout.pixelClipExtent) {
          params.pixelClipExtent = territory.layout.pixelClipExtent
        }

        parameterStore.setTerritoryParameters(territory.code as TerritoryCode, params)

        debug('Applied parameters for %s: projectionId=%s hasPixelClipExtent=%s pixelClipExtent=%o translateOffset=%o', territory.code, params.projectionId, !!params.pixelClipExtent, params.pixelClipExtent, params.translateOffset)
      }
      catch (error) {
        debug('Failed to set parameters for %s: %o', territory.code, error)
        throw error
      }

      if (compositeProjection) {
        try {
          if (typeof compositeProjection.updateTerritoryProjection === 'function') {
            compositeProjection.updateTerritoryProjection(territory.code as TerritoryCode, territory.projection.id as ProjectionId)
          }

          if (typeof compositeProjection.updateTerritoryParameters === 'function') {
            compositeProjection.updateTerritoryParameters(territory.code as TerritoryCode)
          }
        }
        catch (error) {
          debug('Failed to update projection for %s: %o', territory.code, error)
        }
      }
    })

    if (compositeProjection) {
      try {
        config.territories.forEach((territory) => {
          if (typeof compositeProjection.updateTranslationOffset === 'function') {
            compositeProjection.updateTranslationOffset(territory.code as TerritoryCode, territory.layout.translateOffset)
          }

          if (typeof compositeProjection.updateScale === 'function' && territory.projection.parameters.scaleMultiplier !== undefined) {
            compositeProjection.updateScale(territory.code as TerritoryCode, territory.projection.parameters.scaleMultiplier)
          }
        })
      }
      catch (error) {
        debug('Error syncing imported values with composite projection: %o', error)
      }
    }

    viewStore.viewMode = 'composite-custom'
  }
}
