/**
 * Composite Import Service
 *
 * Handles importing composite projection configurations from JSON format.
 * Provides functionality to:
 * - Parse and validate imported JSON files
 * - Migrate configurations to current version
 * - Convert exported configs back to application format
 * - Apply imported configurations to stores
 */

import type { AnyVersionConfig, ExportedCompositeConfig, ExportValidationResult } from '@/types/export-config'
import { CompositeExportService } from './composite-export-service'
import { ConfigMigrator } from './config-migrator'

export interface ImportResult {
  success: boolean
  config?: ExportedCompositeConfig
  errors: string[]
  warnings: string[]
  migrated?: boolean
  fromVersion?: string
}

/**
 * Import service for composite projections
 */
export class CompositeImportService {
  /**
   * Parse and validate a JSON string as ExportedCompositeConfig
   * Automatically migrates old versions to current version
   *
   * @param jsonString - JSON string to parse
   * @returns Import result with parsed config and validation messages
   */
  static importFromJSON(jsonString: string): ImportResult {
    const errors: string[] = []
    const warnings: string[] = []
    let migrated = false
    let fromVersion: string | undefined

    // Try to parse JSON
    let parsedConfig: AnyVersionConfig
    try {
      parsedConfig = JSON.parse(jsonString)
    }
    catch (error) {
      return {
        success: false,
        errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
      }
    }

    // Check if migration is needed
    let config: ExportedCompositeConfig
    if (ConfigMigrator.needsMigration(parsedConfig)) {
      fromVersion = parsedConfig.version

      // Check if migration is possible
      if (!ConfigMigrator.canMigrate(parsedConfig)) {
        return {
          success: false,
          errors: [`Cannot migrate configuration from version ${parsedConfig.version}`],
          warnings: [],
          fromVersion,
        }
      }

      // Perform migration
      const migrationResult = ConfigMigrator.migrateToCurrentVersion(parsedConfig)

      if (!migrationResult.success) {
        return {
          success: false,
          errors: migrationResult.errors,
          warnings: migrationResult.warnings,
          fromVersion,
        }
      }

      config = migrationResult.config!
      migrated = true
      warnings.push(...migrationResult.warnings)

      // Add info message about migration
      if (migrationResult.messages.length > 0) {
        warnings.push(`Configuration migrated from v${fromVersion} to v${config.version}`)
      }
    }
    else {
      config = parsedConfig as ExportedCompositeConfig
    }

    // Validate the configuration (after migration if needed)
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
      migrated,
      fromVersion,
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
    configStore: ReturnType<typeof import('@/stores/config').useConfigStore>,
    territoryStore: ReturnType<typeof import('@/stores/territory').useTerritoryStore>,
    compositeProjection: import('@/services/projection/composite-projection').CompositeProjection,
    parameterStore?: ReturnType<typeof import('@/stores/parameters').useParameterStore>,
  ): void {
    // Note: This method assumes the caller has already validated the config
    // and confirmed atlas compatibility

    // Parameter store is optional - if not provided, projection parameters won't be imported
    if (!parameterStore) {
      console.warn('[CompositeImportService] Parameter store not provided - projection parameters will not be imported')
    }

    // FIRST: Set baseScale values in composite projection before any other operations
    // This prevents scale calculation mismatches during import
    if (compositeProjection) {
      try {
        config.territories.forEach((territory) => {
          const subProj = (compositeProjection as any).subProjections?.find((sp: any) => sp.territoryCode === territory.code)
          if (subProj) {
            // Critical: Set the baseScale to match the exported baseScale FIRST
            // This ensures the correct base value is used for all subsequent scale calculations
            subProj.baseScale = territory.parameters.baseScale
          }
        })
      }
      catch (error) {
        console.warn('[CompositeImportService] Error setting baseScale values:', error)
      }
    }

    // SECOND: Apply each territory configuration to stores
    config.territories.forEach((territory) => {
      // 1. Set projection for territory
      territoryStore.setTerritoryProjection(territory.code, territory.projectionId)

      // 2. Apply translation offsets
      territoryStore.setTerritoryTranslation(territory.code, 'x', territory.layout.translateOffset[0])
      territoryStore.setTerritoryTranslation(territory.code, 'y', territory.layout.translateOffset[1])

      // 3. Apply scale multiplier (AFTER baseScale is set above)
      // The scaleMultiplier is what the user adjusts (e.g., 1.2 = 120% scale)
      territoryStore.setTerritoryScale(territory.code, territory.parameters.scaleMultiplier)

      // 4. Apply projection parameters to parameter store (if available)
      // This includes center, rotate, parallels, scale, baseScale, scaleMultiplier
      if (parameterStore) {
        try {
          const params = {
            center: territory.parameters.center,
            rotate: territory.parameters.rotate,
            parallels: territory.parameters.parallels,
            scale: territory.parameters.scale,
            baseScale: territory.parameters.baseScale,
            scaleMultiplier: territory.parameters.scaleMultiplier,
          }
          console.log(`[CompositeImportService] Applying parameters for ${territory.code}:`, params)
          parameterStore.setTerritoryParameters(territory.code, params)
        }
        catch (error) {
          console.warn(`[CompositeImportService] Failed to set parameters for ${territory.code}:`, error)
        }
      }

      // 5. Update projection type, then apply parameters from parameter store
      if (compositeProjection) {
        try {
          // First update projection type (may have changed during import)
          // This preserves the current center/rotate/scale but updates the projection algorithm
          if (typeof compositeProjection.updateTerritoryProjection === 'function') {
            compositeProjection.updateTerritoryProjection(territory.code, territory.projectionId)
          }

          // Then apply parameters from parameter store (which now has the imported values)
          // This will overwrite the preserved values with the imported ones
          if (typeof compositeProjection.updateTerritoryParameters === 'function') {
            compositeProjection.updateTerritoryParameters(territory.code)
          }
        }
        catch (error) {
          console.warn(`[CompositeImportService] Failed to update projection for ${territory.code}:`, error)
        }
      }
    })

    // THIRD: Sync final values with the composite projection
    // This mimics what the cartographer does in applyCustomCompositeSettings
    if (compositeProjection) {
      try {
        // Apply translation offsets and scale multipliers
        config.territories.forEach((territory) => {
          if (typeof compositeProjection.updateTranslationOffset === 'function') {
            compositeProjection.updateTranslationOffset(territory.code, territory.layout.translateOffset)
          }

          // Apply the scale multiplier (baseScale was already set above)
          if (typeof compositeProjection.updateScale === 'function') {
            compositeProjection.updateScale(territory.code, territory.parameters.scaleMultiplier)
          }
        })
      }
      catch (error) {
        console.warn('[CompositeImportService] Error syncing imported values with composite projection:', error)
      }
    }

    // Switch to custom composite view mode to show the imported configuration
    configStore.viewMode = 'composite-custom'
  }
}
