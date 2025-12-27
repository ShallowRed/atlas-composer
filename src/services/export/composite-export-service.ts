/**
 * Composite Export Service
 *
 * Handles exporting composite projection configurations to JSON format.
 * Provides functionality to:
 * - Export current composite projection state
 * - Validate exported configurations
 * - Prepare configurations for code generation
 */

import type { CompositeProjection, ProjectionParameterProvider } from '@/services/projection/composite-projection'
import type { CompositeProjectionConfig } from '@/types'
import type { AtlasId, TerritoryCode } from '@/types/branded'
import type {
  CodeGenerationOptions,
  CompositePattern,
  ExportedCompositeConfig,
  ExportedProjectionParameters,
  ExportedTerritory,
  ExportMetadata,
  ExportValidationResult,
  TerritoryRole,
} from '@/types/export-config'
import packageJson from '#package'
import { projectionRegistry } from '@/core/projections/registry'

import { CodeGenerator } from './code-generator'

/**
 * Application version for metadata
 * Note: Version "0.0.0" in package.json indicates development version
 */
const APP_VERSION = `Atlas composer v${packageJson.version === '0.0.0' ? '1.0' : packageJson.version}`

/**
 * Round a number to specified decimal places, removing floating-point artifacts
 * @param n - Number to round
 * @param decimals - Number of decimal places (default: 6)
 * @returns Rounded number
 */
function roundNumber(n: number | undefined, decimals = 6): number {
  if (n === undefined)
    return 0
  return Math.round(n * 10 ** decimals) / 10 ** decimals
}

/**
 * Round a 2-element tuple (center, translate, parallels)
 * @param arr - 2-element array
 * @param decimals - Number of decimal places (default: 6)
 * @returns Rounded 2-element tuple
 */
function roundTuple2(
  arr: [number, number] | number[] | undefined,
  decimals = 6,
): [number, number] {
  if (!arr || arr.length < 2)
    return [0, 0]
  return [roundNumber(arr[0], decimals), roundNumber(arr[1], decimals)]
}

/**
 * Round a 3-element tuple (rotate)
 * @param arr - 3-element array
 * @param decimals - Number of decimal places (default: 6)
 * @returns Rounded 3-element tuple
 */
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

/**
 * Round a 4-element tuple (pixelClipExtent)
 * @param arr - 4-element array
 * @param decimals - Number of decimal places (default: 6)
 * @returns Rounded 4-element tuple
 */
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

/**
 * Round a 2D bounds array [[minLon, minLat], [maxLon, maxLat]]
 * @param bounds - 2D bounds array
 * @param decimals - Number of decimal places (default: 6)
 * @returns Rounded bounds array
 */
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

/**
 * Export service for composite projections
 */
export class CompositeExportService {
  /**
   * Export composite projection to JSON configuration
   *
   * @param compositeProjection - The CompositeProjection instance to export
   * @param atlasId - Atlas identifier (e.g., 'france', 'portugal')
   * @param atlasName - Atlas display name
   * @param compositeConfig - Original composite configuration for pattern info
   * @param parameterProvider - Parameter provider object for accessing territory parameters
   * @param referenceScale - Reference scale for projection
   * @param canvasDimensions - Canvas dimensions with width and height properties
   * @param canvasDimensions.width - Canvas width in pixels
   * @param canvasDimensions.height - Canvas height in pixels
   * @param notes - Optional user notes
   * @returns Exportable configuration object
   */
  static exportToJSON(
    compositeProjection: CompositeProjection,
    atlasId: AtlasId,
    atlasName: string,
    compositeConfig: CompositeProjectionConfig,
    parameterProvider?: ProjectionParameterProvider,
    referenceScale?: number,
    canvasDimensions?: { width: number, height: number },
    notes?: string,
  ): ExportedCompositeConfig {
    // Get raw export from CompositeProjection
    const rawExport = compositeProjection.exportConfig()

    // Extract pattern from config
    const pattern: CompositePattern = compositeConfig.type

    // Transform territories to export format
    const territories = rawExport.subProjections.map((subProj): ExportedTerritory => {
      // Resolve projection ID from projection type/name
      const projectionId = this.resolveProjectionId(subProj.projectionType)
      const projectionDef = projectionRegistry.get(projectionId)

      // Determine territory role
      const role: TerritoryRole = this.determineTerritoryRole(
        subProj.territoryCode,
        compositeConfig,
      )

      // Get all exportable parameters from parameter provider if available
      let projectionParameters: ExportedProjectionParameters
      let layoutTranslateOffset: [number, number]
      let layoutPixelClipExtent: [number, number, number, number] | null = null

      if (parameterProvider) {
        // Get all exportable parameters
        const allParams = parameterProvider.getExportableParameters(subProj.territoryCode)

        // Separate layout parameters from projection parameters
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
        // Fallback when no parameter provider
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
        role,
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

    // Create metadata
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
      pattern,
      referenceScale,
      canvasDimensions,
      territories,
    }
  }

  /**
   * Validate an exported configuration
   *
   * @param config - Configuration to validate
   * @returns Validation result with errors and warnings
   */
  static validateExportedConfig(config: ExportedCompositeConfig): ExportValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check version
    if (!config.version) {
      errors.push('Missing version field')
    }
    else if (config.version !== '1.0') {
      warnings.push(`Unknown version: ${config.version}. Expected 1.0`)
    }

    // Check metadata
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

    // Check pattern
    if (!config.pattern) {
      errors.push('Missing pattern')
    }
    else if (!['single-focus', 'equal-members'].includes(config.pattern)) {
      errors.push(`Invalid pattern: ${config.pattern}`)
    }

    // Check territories
    if (!config.territories || !Array.isArray(config.territories)) {
      errors.push('Missing or invalid territories array')
    }
    else {
      if (config.territories.length === 0) {
        errors.push('No territories in configuration')
      }

      config.territories.forEach((territory, index) => {
        const prefix = `Territory ${index} (${territory.code || 'unknown'})`

        // Required fields
        if (!territory.code) {
          errors.push(`${prefix}: Missing code`)
        }
        if (!territory.name) {
          errors.push(`${prefix}: Missing name`)
        }
        if (!territory.projection?.id) {
          errors.push(`${prefix}: Missing projection.id`)
        }

        // Validate projection exists in registry
        if (territory.projection?.id && !projectionRegistry.get(territory.projection.id)) {
          warnings.push(`${prefix}: Unknown projection ID '${territory.projection.id}'`)
        }

        // Check parameters
        if (!territory.projection?.parameters) {
          errors.push(`${prefix}: Missing projection.parameters`)
        }
        else {
          // Validate scaleMultiplier as required
          if (typeof territory.projection.parameters.scaleMultiplier !== 'number') {
            errors.push(`${prefix}: Invalid or missing scaleMultiplier`)
          }
        }

        // Check layout
        if (!territory.layout) {
          errors.push(`${prefix}: Missing layout`)
        }
        else {
          if (!Array.isArray(territory.layout.translateOffset) || territory.layout.translateOffset.length !== 2) {
            errors.push(`${prefix}: Invalid translateOffset`)
          }

          // Validate pixelClipExtent
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

        // Check bounds
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

  /**
   * Generate D3-compatible JavaScript/TypeScript code
   *
   * @param config - Exported configuration
   * @param options - Code generation options
   * @returns Generated code as string
   */
  static generateCode(
    config: ExportedCompositeConfig,
    options: CodeGenerationOptions,
  ): string {
    const generator = new CodeGenerator()
    return generator.generate(config, options)
  }

  /**
   * Resolve projection ID from projection type name
   *
   * Maps D3 constructor/function names back to projection IDs
   * Example: 'geoConicConformal' -> 'conic-conformal'
   */
  private static resolveProjectionId(projectionType: string): string {
    // Try to find projection by matching constructor name pattern
    const allProjections = projectionRegistry.getAll()

    for (const proj of allProjections) {
      // Match by constructor name if it contains the projection name
      const normalizedType = projectionType.toLowerCase().replace(/^geo/, '')
      if (proj.id.replace(/-/g, '') === normalizedType) {
        return proj.id
      }
    }

    // Fallback: try to convert constructor name to ID format
    // geoConicConformal -> conic-conformal
    const kebabCase = projectionType
      .replace(/^geo/, '')
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')

    return kebabCase
  }

  /**
   * Determine territory role based on position in composite config
   */
  private static determineTerritoryRole(
    territoryCode: TerritoryCode,
    compositeConfig: CompositeProjectionConfig,
  ): TerritoryRole {
    if (compositeConfig.type === 'single-focus') {
      if (compositeConfig.mainland.code === territoryCode) {
        return 'primary'
      }
      return 'secondary'
    }
    else {
      // equal-members pattern
      const isMainland = compositeConfig.mainlands.some(m => m.code === territoryCode)
      return isMainland ? 'member' : 'secondary'
    }
  }

  /**
   * Extract parallels parameter if available
   * Handles both function and array forms
   */
  private static extractParallels(subProj: any): [number, number] | undefined {
    // Check if parallels exist in raw export
    if (subProj.parallels) {
      if (Array.isArray(subProj.parallels)) {
        return subProj.parallels as [number, number]
      }
    }

    // Try to get from projection object if it has a parallels() method
    if (subProj.projection?.parallels) {
      const parallels = subProj.projection.parallels()
      if (Array.isArray(parallels) && parallels.length === 2) {
        return parallels as [number, number]
      }
    }

    return undefined
  }
}
