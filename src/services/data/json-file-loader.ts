import type { JsonFileError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import { err, ok } from '@/core/types/result'
import { logger } from '@/utils/logger'

const debug = logger.data.loader

export class JsonFileLoader {
  private static readonly BASE_URL = import.meta.env.BASE_URL

  static async loadJSON<T = unknown>(path: string): Promise<Result<T, JsonFileError>> {
    let response: Response
    try {
      response = await fetch(`${this.BASE_URL}${path}`)
    }
    catch (error) {
      debug('Failed to reach %s: %O', path, error)
      return err({ code: 'JSON_FILE_UNREACHABLE', path })
    }

    if (!response.ok) {
      return response.status === 404
        ? err({ code: 'JSON_FILE_NOT_FOUND', path })
        : err({ code: 'JSON_FILE_NETWORK_ERROR', path, status: response.status })
    }

    try {
      return ok(await response.json() as T)
    }
    catch (error) {
      debug('Failed to read %s: %O', path, error)
      return err({ code: 'JSON_FILE_MALFORMED', path })
    }
  }
}
