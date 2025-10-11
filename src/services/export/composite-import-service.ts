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
  ): void {
    // Note: This method assumes the caller has already validated the config
    // and confirmed atlas compatibility

    // Apply each territory configuration
    config.territories.forEach((territory) => {
      // 1. Set projection for territory
      territoryStore.setTerritoryProjection(territory.code, territory.projectionId)

      // 2. Apply scale multiplier
      // The scaleMultiplier is what the user adjusts (e.g., 1.2 = 120% scale)
      territoryStore.setTerritoryScale(territory.code, territory.parameters.scaleMultiplier)

      // 3. Apply translation offsets
      territoryStore.setTerritoryTranslation(territory.code, 'x', territory.layout.translateOffset[0])
      territoryStore.setTerritoryTranslation(territory.code, 'y', territory.layout.translateOffset[1])

      // 4. Update the composite projection with new settings
      // This will trigger recalculation of projection parameters
      if (compositeProjection.updateTerritoryProjection) {
        compositeProjection.updateTerritoryProjection(territory.code, territory.projectionId)
      }
    })

    // Switch to custom composite view mode to show the imported configuration
    configStore.viewMode = 'composite-custom'
  }
}
