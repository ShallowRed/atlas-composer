import type { AtlasId } from '@/types/branded'
import type { ExportedCompositeConfig, ExportValidationResult } from '@/types/export-config'
import { CompositeExportService } from './composite-export-service'

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
}
