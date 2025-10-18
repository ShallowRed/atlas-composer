/**
 * Preset Loader Service
 *
 * Loads preset composite projection configurations from the configs/presets/ directory.
 * Presets provide high-quality default layouts that are applied automatically on atlas initialization.
 *
 * Key responsibilities:
 * - Load preset files from configs/presets/
 * - Validate preset format using CompositeImportService
 * - Convert presets to territory defaults format
 * - List available presets for an atlas
 */

import type { ProjectionFamilyType } from '@/core/projections/types'
import type { TerritoryDefaults } from '@/services/atlas/territory-defaults-service'
import type { ImportResult } from '@/services/export/composite-import-service'
import type { ExportedCompositeConfig } from '@/types/export-config'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { parameterRegistry } from '@/core/parameters'
import { CompositeImportService } from '@/services/export/composite-import-service'

/**
 * Atlas projection metadata extracted from atlas configuration
 */
export interface AtlasProjectionMetadata {
  compositeProjections?: string[]
  defaultCompositeProjection?: string
  projectionPreferences?: {
    recommended?: string[]
    default?: {
      mainland?: string
      overseas?: string
    }
    prohibited?: string[]
  }
  projectionParameters?: {
    center?: { longitude: number, latitude: number }
    rotate?: {
      mainland?: [number, number]
      azimuthal?: [number, number]
    }
    parallels?: { conic?: [number, number] }
  }
}

/**
 * Extended preset configuration with atlas metadata
 */
export interface ExtendedPresetConfig extends ExportedCompositeConfig {
  /** Optional atlas-level projection metadata */
  atlasMetadata?: AtlasProjectionMetadata
}

export interface PresetLoadResult {
  success: boolean
  preset?: ExtendedPresetConfig
  errors: string[]
  warnings: string[]
}

/**
 * Service for loading and managing preset configurations
 */
export class PresetLoader {
  /**
   * Load a preset configuration file
   *
   * @param presetId - Preset identifier (e.g., 'france-default', 'portugal-default')
   * @returns Load result with parsed preset and validation messages
   */
  static async loadPreset(presetId: string): Promise<PresetLoadResult> {
    try {
      // Construct preset file path
      const baseUrl = import.meta.env.BASE_URL
      const presetPath = `${baseUrl}configs/presets/${presetId}.json`

      // Fetch preset file
      const response = await fetch(presetPath)

      if (!response.ok) {
        console.error(`[PresetLoader] HTTP ${response.status}: ${response.statusText}`)
        return {
          success: false,
          errors: [`Failed to load preset '${presetId}': ${response.statusText}`],
          warnings: [],
        }
      }

      // Parse JSON
      const jsonText = await response.text()
      const rawPreset = JSON.parse(jsonText) as ExtendedPresetConfig

      // Validate structure using CompositeImportService
      const importResult: ImportResult = CompositeImportService.importFromJSON(jsonText)

      if (!importResult.success) {
        return {
          success: false,
          errors: importResult.errors,
          warnings: importResult.warnings,
        }
      }

      // Additional validation using parameter registry
      const paramErrors: string[] = []
      const paramWarnings: string[] = []
      for (const territory of rawPreset.territories) {
        const family = territory.projection.family as ProjectionFamilyType

        // Check required parameters - these are hard errors
        // Only check parameters that are relevant for this projection family
        const required = parameterRegistry.getRequired()
        for (const def of required) {
          // Check if parameter is relevant for this projection family
          const constraints = parameterRegistry.getConstraintsForFamily(def.key as string, family)
          const isRelevant = constraints.relevant

          if (def.requiresPreset && isRelevant) {
            // Check if parameter exists in the appropriate location
            let hasParameter = false

            if (def.key === 'projectionId') {
              // projectionId is stored at projection.id (not in parameters)
              hasParameter = territory.projection?.id !== undefined
            }
            else if (def.key === 'translateOffset') {
              // translateOffset is stored in layout section
              hasParameter = territory.layout?.translateOffset !== undefined
            }
            else if (def.key === 'pixelClipExtent') {
              // pixelClipExtent is stored in layout section (optional)
              hasParameter = territory.layout?.pixelClipExtent !== undefined
            }
            else {
              // Other parameters are stored in projection.parameters section
              hasParameter = def.key in territory.projection.parameters
            }

            if (!hasParameter) {
              paramErrors.push(`Territory ${territory.code}: missing required parameter ${def.key}`)
            }
          }
        }

        // Validate parameter values - these are warnings, not hard errors
        const validationResults = parameterRegistry.validateParameters(
          territory.projection.parameters,
          family,
        )
        for (const result of validationResults) {
          if (!result.isValid) {
            paramWarnings.push(`Territory ${territory.code}: ${result.error}`)
          }
        }
      }

      // Only fail on structural/required parameter errors, not validation warnings
      if (paramErrors.length > 0) {
        return {
          success: false,
          errors: [...importResult.errors, ...paramErrors],
          warnings: [...importResult.warnings, ...paramWarnings],
        }
      }

      // Combine validated preset with atlas metadata
      const extendedPreset: ExtendedPresetConfig = {
        ...importResult.config!,
        atlasMetadata: rawPreset.atlasMetadata,
      }

      // Return validated preset with parameter validation warnings
      return {
        success: true,
        preset: extendedPreset,
        errors: [],
        warnings: [...importResult.warnings, ...paramWarnings],
      }
    }
    catch (error) {
      return {
        success: false,
        errors: [`Unexpected error loading preset '${presetId}': ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
      }
    }
  }

  /**
   * List available presets for a given atlas
   *
   * Note: This is a static list based on atlas configuration.
   * In a future enhancement, this could scan the presets directory.
   *
   * @returns Array of preset IDs available for this atlas
   */
  static listAvailablePresets(): string[] {
    // For now, return empty array - presets will be defined in atlas config
    // In the future, this could scan the presets directory dynamically
    return []
  }

  /**
   * Convert a preset configuration to territory defaults format
   *
   * Territory defaults are used to initialize the store state with
   * projection, translation, and scale values for each territory.
   *
   * @param preset - Validated preset configuration
   * @returns Territory defaults for store initialization
   */
  static convertToDefaults(preset: ExportedCompositeConfig): TerritoryDefaults {
    const projections: Record<string, string> = {}
    const translations: Record<string, { x: number, y: number }> = {}
    const scales: Record<string, number> = {}

    // Extract values from each territory in the preset
    preset.territories.forEach((territory) => {
      const code = territory.code

      // Projection ID
      projections[code] = territory.projection.id

      // Translation offset
      translations[code] = {
        x: territory.layout.translateOffset[0],
        y: territory.layout.translateOffset[1],
      }

      // Scale multiplier
      scales[code] = territory.projection.parameters.scaleMultiplier ?? 1
    })

    return {
      projections,
      translations,
      scales,
    }
  }

  /**
   * Extract projection parameters from preset data for each territory
   * @param preset - The preset configuration
   * @returns Object mapping territory codes to their projection parameters
   */
  public static extractTerritoryParameters(preset: ExportedCompositeConfig): Record<string, ProjectionParameters> {
    const result: Record<string, ProjectionParameters> = {}

    for (const territory of preset.territories) {
      // Only include parameters that are explicitly set in the territory
      const territoryParams: Partial<ProjectionParameters> = {}

      // IMPORTANT: Extract projectionId from territory.projection.id (required parameter)
      if (territory.projection?.id) {
        territoryParams.projectionId = territory.projection.id
      }

      if (territory.projection.parameters) {
        // Get list of parameter keys that the registry knows about and are exportable
        const exportableKeys = new Set(
          parameterRegistry.getExportable().map(def => def.key),
        )

        // Only copy parameters that exist in the territory and are known by the registry
        for (const [key, value] of Object.entries(territory.projection.parameters)) {
          if (exportableKeys.has(key as keyof ProjectionParameters) && value !== undefined) {
            territoryParams[key as keyof ProjectionParameters] = value as any
          }
        }
      }

      // Convert layout properties to parameters
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

  /**
   * Load preset metadata (name, version, metadata) without full validation
   * This is useful for populating dropdowns and lists without loading full configurations
   *
   * @param presetId - Preset identifier (e.g., 'france-default', 'portugal-default')
   * @returns Preset metadata or null if loading failed
   */
  static async loadPresetMetadata(presetId: string): Promise<{ name?: string | Record<string, string>, metadata?: any } | null> {
    try {
      // Construct preset file path
      const baseUrl = import.meta.env.BASE_URL
      const presetPath = `${baseUrl}configs/presets/${presetId}.json`

      // Fetch preset file
      const response = await fetch(presetPath)

      if (!response.ok) {
        console.warn(`[PresetLoader] Failed to load metadata for preset '${presetId}': ${response.statusText}`)
        return null
      }

      // Parse only the parts we need (name and metadata)
      const jsonText = await response.text()
      const preset = JSON.parse(jsonText)

      return {
        name: preset.name,
        metadata: preset.metadata,
      }
    }
    catch (error) {
      console.warn(`[PresetLoader] Error loading metadata for preset '${presetId}':`, error)
      return null
    }
  }

  /**
   * Validate a preset configuration
   *
   * Uses the same validation as CompositeImportService to ensure
   * preset files conform to the expected format.
   *
   * @param preset - Preset configuration to validate
   * @returns Validation result with errors and warnings
   */
  static validatePreset(preset: ExtendedPresetConfig): PresetLoadResult {
    const validationResult = CompositeImportService.importFromJSON(JSON.stringify(preset))

    const extendedPreset: ExtendedPresetConfig = {
      ...validationResult.config!,
      atlasMetadata: preset.atlasMetadata,
    }

    return {
      success: validationResult.success,
      preset: extendedPreset,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
    }
  }
}
