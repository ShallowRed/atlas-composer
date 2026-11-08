import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import type { CompositeConfigContext } from '@/core/presets'
import type { ImportError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import { readCompositeConfig } from '@/core/presets'
import { err } from '@/core/types/result'

type ImportResult = Result<CompositeProjectionConfig, ImportError>

const MAX_FILE_SIZE_IN_MB = 10

export class CompositeImportService {
  static importFromJSON(jsonString: string, context: CompositeConfigContext): ImportResult {
    let raw: unknown
    try {
      raw = JSON.parse(jsonString)
    }
    catch {
      return err({ code: 'IMPORT_MALFORMED_JSON' })
    }

    const read = readCompositeConfig(raw, context)
    return read.ok ? read : err({ code: 'IMPORT_INVALID', issues: read.error })
  }

  static async importFromFile(file: File, context: CompositeConfigContext): Promise<ImportResult> {
    const fileName = file.name
    if (!fileName.endsWith('.json')) {
      return err({ code: 'IMPORT_NOT_JSON_FILE', fileName })
    }

    if (file.size > MAX_FILE_SIZE_IN_MB * 1024 * 1024) {
      return err({ code: 'IMPORT_FILE_TOO_LARGE', fileName, maxSizeInMb: MAX_FILE_SIZE_IN_MB })
    }

    let text: string
    try {
      text = await file.text()
    }
    catch {
      return err({ code: 'IMPORT_FILE_UNREADABLE', fileName })
    }

    return this.importFromJSON(text, context)
  }
}
