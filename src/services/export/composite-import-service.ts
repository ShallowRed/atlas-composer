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
import { CompositeExportService } from './composite-export-service'

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

    // Validate the parsed configuration
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
   * @param territoryStore - Territory store instance (from useTerritoryStore)
   * @param compositeProjection - CompositeProjection instance
   */
  static applyToStores(
    config: ExportedCompositeConfig,
    configStore: any, // Using any to avoid circular dependency
    territoryStore: any,
    compositeProjection: any,
  ): void {
    // Note: This method assumes the caller has already validated the config
    // and confirmed atlas compatibility

    // Apply each territory configuration
    config.territories.forEach((territory) => {
      // Set projection for territory
      compositeProjection.setTerritoryProjection(territory.code, territory.projectionId)

      // Apply projection parameters
      territoryStore.updateTerritory(territory.code, {
        projectionType: territory.projectionId,
        center: territory.parameters.center,
        rotate: territory.parameters.rotate,
        parallels: territory.parameters.parallels,
        scale: territory.parameters.scale,
        baseScale: territory.parameters.baseScale,
        scaleMultiplier: territory.parameters.scaleMultiplier,
        translateOffset: territory.layout.translateOffset,
        clipExtent: territory.layout.clipExtent,
        bounds: territory.bounds,
      })
    })

    // Switch to custom composite view mode
    configStore.viewMode = 'composite-custom'
  }
}
