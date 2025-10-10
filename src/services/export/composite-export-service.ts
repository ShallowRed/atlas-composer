/**
 * Composite Export Service
 *
 * Handles exporting composite projection configurations to JSON format.
 * Provides functionality to:
 * - Export current composite projection state
 * - Validate exported configurations
 * - Prepare configurations for code generation
 */

import type { CompositeProjection } from '@/services/projection/composite-projection'
import type { CompositeProjectionConfig } from '@/types'
import type {
  CodeGenerationOptions,
  CompositePattern,
  ExportedCompositeConfig,
  ExportedTerritory,
  ExportMetadata,
  ExportValidationResult,
  TerritoryRole,
} from '@/types/export-config'
import { projectionRegistry } from '@/core/projections/registry'

/**
 * Application version for metadata
 * TODO: Import from package.json
 */
const APP_VERSION = 'Atlas Composer v1.0'

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
   * @param notes - Optional user notes
   * @returns Exportable configuration object
   */
  static exportToJSON(
    compositeProjection: CompositeProjection,
    atlasId: string,
    atlasName: string,
    compositeConfig: CompositeProjectionConfig,
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

      return {
        code: subProj.territoryCode,
        name: subProj.territoryName,
        role,
        projectionId,
        projectionFamily: projectionDef?.family || 'unknown',
        parameters: {
          center: subProj.center,
          rotate: subProj.rotate,
          scale: subProj.scale,
          baseScale: subProj.baseScale,
          scaleMultiplier: subProj.scaleMultiplier,
          // Extract parallels if available (for conic projections)
          parallels: this.extractParallels(subProj),
        },
        layout: {
          translateOffset: subProj.translateOffset,
          clipExtent: subProj.clipExtent || null,
        },
        bounds: subProj.bounds || [
          [0, 0],
          [0, 0],
        ],
      }
    })

    // Calculate reference scale (use first territory's base scale)
    const referenceScale = territories[0]?.parameters.baseScale || 2700

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
        if (!territory.projectionId) {
          errors.push(`${prefix}: Missing projectionId`)
        }

        // Validate projection exists in registry
        if (territory.projectionId && !projectionRegistry.get(territory.projectionId)) {
          warnings.push(`${prefix}: Unknown projection ID '${territory.projectionId}'`)
        }

        // Check parameters
        if (!territory.parameters) {
          errors.push(`${prefix}: Missing parameters`)
        }
        else {
          if (typeof territory.parameters.scale !== 'number') {
            errors.push(`${prefix}: Invalid or missing scale`)
          }
          if (typeof territory.parameters.baseScale !== 'number') {
            errors.push(`${prefix}: Invalid or missing baseScale`)
          }
          if (typeof territory.parameters.scaleMultiplier !== 'number') {
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
    // TODO: Implement code generation in Phase 2
    // This will be implemented in code-generator.ts
    return `// Code generation will be implemented in Phase 2\n// Configuration: ${config.metadata.atlasId}\n// Format: ${options.format}\n// Language: ${options.language}`
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
    territoryCode: string,
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
