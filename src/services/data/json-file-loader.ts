import type { JsonFileError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import { err, ok } from '@/core/types/result'
import { logger } from '@/utils/logger'

const debug = logger.data.loader

export class JsonFileLoader {
  private static readonly BASE_URL = import.meta.env.BASE_URL

  static loadJSON<T = unknown>(path: string): Promise<Result<T, JsonFileError>> {
    return this.loadUrl<T>(`${this.BASE_URL}${path}`)
  }

  static async loadUrl<T = unknown>(url: string): Promise<Result<T, JsonFileError>> {
    let response: Response
    try {
      // Without this header, the Vite server answers a missing file with index.html
      response = await fetch(url, { headers: { Accept: 'application/json' } })
    }
    catch (error) {
      debug('Failed to reach %s: %O', url, error)
      return err({ code: 'JSON_FILE_UNREACHABLE', path: url })
    }

    if (!response.ok) {
      return response.status === 404
        ? err({ code: 'JSON_FILE_NOT_FOUND', path: url })
        : err({ code: 'JSON_FILE_NETWORK_ERROR', path: url, status: response.status })
    }

    try {
      return ok(await response.json() as T)
    }
    catch (error) {
      debug('Failed to read %s: %O', url, error)
      return err({ code: 'JSON_FILE_MALFORMED', path: url })
    }
  }
}
