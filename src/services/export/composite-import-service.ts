/**
 * Composite Import Service
 *
 * Handles importing composite projection configurations from JSON format.
 * Provides functionality to:
 * - Parse and validate imported JSON files
 * - Convert exported configs back to application format
 * - Apply imported configurations to stores
 */

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

/**
 * Import service for composite projections
 */
export class CompositeImportService {
  /**
   * Parse and validate a JSON string as ExportedCompositeConfig
   *
   * @param jsonString - JSON string to parse
   * @returns Import result with parsed config and validation messages
   */
  static importFromJSON(jsonString: string): ImportResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Try to parse JSON
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

    // Validate the configuration
    const validation = CompositeExportService.validateExportedConfig(config)

    errors.push(...validation.errors)
    warnings.push(...validation.warnings)

    // Import is successful if there are no errors
    const success = errors.length === 0

    return {
      success,
      config: success ? config : undefined,
      errors,
      warnings,
    }
  }

  /**
   * Import from a File object (browser File API)
   *
   * @param file - File object to read
   * @returns Promise with import result
   */
  static async importFromFile(file: File): Promise<ImportResult> {
    // Validate file type
    if (!file.name.endsWith('.json')) {
      return {
        success: false,
        errors: ['File must be a JSON file (.json extension)'],
        warnings: [],
      }
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        errors: [`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`],
        warnings: [],
      }
    }

    // Read file content
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

  /**
   * Check if an imported config matches the current atlas
   *
   * @param config - Imported configuration
   * @param currentAtlasId - Current atlas ID
   * @returns Validation result with compatibility warnings
   */
  static checkAtlasCompatibility(
    config: ExportedCompositeConfig,
    currentAtlasId: string,
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

  /**
   * Apply imported configuration to stores
   * This is meant to be called from a component that has access to the stores
   *
   * @param config - Validated exported configuration
   * @param configStore - Config store instance (from useConfigStore)
   * @param parameterStore - Parameter store instance (from useParameterStore)
   * @param compositeProjection - CompositeProjection instance
   */
  static applyToStores(
    config: ExportedCompositeConfig,
    configStore: ReturnType<typeof import('@/stores/config').useConfigStore>,
    parameterStore: ReturnType<typeof import('@/stores/parameters').useParameterStore>,
    compositeProjection: import('@/services/projection/composite-projection').CompositeProjection,
  ): void {
    // Note: This method assumes the caller has already validated the config
    // and confirmed atlas compatibility

    // FIRST: Apply global preset parameters to config store
    if (config.referenceScale !== undefined) {
      configStore.referenceScale = config.referenceScale
    }
    if (config.canvasDimensions) {
      configStore.canvasDimensions = {
        width: config.canvasDimensions.width,
        height: config.canvasDimensions.height,
      }
    }

    // SECOND: Set baseScale values in composite projection before any other operations
    // This prevents scale calculation mismatches during import
    if (compositeProjection) {
      try {
        config.territories.forEach((territory) => {
          const subProj = (compositeProjection as any).subProjections?.find((sp: any) => sp.territoryCode === territory.code)
          if (subProj && territory.projection.parameters.scaleMultiplier !== undefined) {
            // Critical: Set the baseScale to match the exported scaleMultiplier FIRST
            // This ensures the correct base value is used for all subsequent scale calculations
            subProj.baseScale = territory.projection.parameters.scaleMultiplier
          }
        })
      }
      catch (error) {
        debug('Error setting scale values: %o', error)
      }
    }

    // THIRD: Apply each territory configuration to stores
    config.territories.forEach((territory) => {
      // Apply all projection parameters to parameter store in one call
      // This includes projection ID, all projection-specific parameters, and layout parameters
      try {
        // Combine projection parameters and layout parameters
        const params: Record<string, any> = {
          // Projection ID from territory.projection.id (required)
          projectionId: territory.projection.id,
          // All other projection parameters (center, rotate, parallels, scaleMultiplier, etc.)
          ...territory.projection.parameters,
          // Layout parameters - translateOffset is always present
          translateOffset: territory.layout.translateOffset,
        }

        // Only include pixelClipExtent if it's actually defined (not null/undefined)
        if (territory.layout.pixelClipExtent) {
          params.pixelClipExtent = territory.layout.pixelClipExtent
        }

        // Set all parameters at once (more efficient and atomic)
        parameterStore.setTerritoryParameters(territory.code, params)

        debug('Applied parameters for %s: projectionId=%s hasPixelClipExtent=%s pixelClipExtent=%o translateOffset=%o', territory.code, params.projectionId, !!params.pixelClipExtent, params.pixelClipExtent, params.translateOffset)
      }
      catch (error) {
        debug('Failed to set parameters for %s: %o', territory.code, error)
        throw error // Re-throw to surface the issue instead of silently failing
      }

      // 5. Update projection type, then apply parameters from parameter store
      if (compositeProjection) {
        try {
          // First update projection type (may have changed during import)
          // This preserves the current center/rotate/scale but updates the projection algorithm
          if (typeof compositeProjection.updateTerritoryProjection === 'function') {
            compositeProjection.updateTerritoryProjection(territory.code, territory.projection.id)
          }

          // Then apply parameters from parameter store (which now has the imported values)
          // This will overwrite the preserved values with the imported ones
          if (typeof compositeProjection.updateTerritoryParameters === 'function') {
            compositeProjection.updateTerritoryParameters(territory.code)
          }
        }
        catch (error) {
          debug('Failed to update projection for %s: %o', territory.code, error)
        }
      }
    })

    // FOURTH: Sync final values with the composite projection
    // This mimics what the cartographer does in applyCustomCompositeSettings
    if (compositeProjection) {
      try {
        // Apply translation offsets and scale multipliers
        config.territories.forEach((territory) => {
          if (typeof compositeProjection.updateTranslationOffset === 'function') {
            compositeProjection.updateTranslationOffset(territory.code, territory.layout.translateOffset)
          }

          // Apply the scale multiplier
          if (typeof compositeProjection.updateScale === 'function' && territory.projection.parameters.scaleMultiplier !== undefined) {
            compositeProjection.updateScale(territory.code, territory.projection.parameters.scaleMultiplier)
          }
        })
      }
      catch (error) {
        debug('Error syncing imported values with composite projection: %o', error)
      }
    }

    // Switch to custom composite view mode to show the imported configuration
    configStore.viewMode = 'composite-custom'
  }
}
