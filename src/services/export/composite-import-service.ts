import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { CompositeConfigContext } from '@/core/presets'
import type { Result } from '@/core/types/result'
import { readCompositeConfig } from '@/core/presets'
import { err } from '@/core/types/result'

type ImportResult = Result<CompositeProjectionConfig, string[]>

export class CompositeImportService {
  static importFromJSON(jsonString: string, context: CompositeConfigContext): ImportResult {
    let raw: unknown
    try {
      raw = JSON.parse(jsonString)
    }
    catch (error) {
      return err([`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`])
    }

    return readCompositeConfig(raw, context)
  }

  static async importFromFile(file: File, context: CompositeConfigContext): Promise<ImportResult> {
    if (!file.name.endsWith('.json')) {
      return err(['File must be a JSON file (.json extension)'])
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return err([`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`])
    }

    try {
      const text = await file.text()
      return this.importFromJSON(text, context)
    }
    catch (error) {
      return err([`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`])
    }
  }
}
