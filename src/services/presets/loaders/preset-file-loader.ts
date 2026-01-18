export interface FileLoadResult<T = unknown> {
  success: boolean
  data?: T
  errors: string[]
  warnings: string[]
}

export interface LoadOptions {
  maxFileSize?: number
  verbose?: boolean
}

export class PresetFileLoader {
  private static readonly DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private static readonly BASE_URL = import.meta.env.BASE_URL

  static async loadJSON<T = unknown>(
    relativePath: string,
    options: LoadOptions = {},
  ): Promise<FileLoadResult<T>> {
    const { maxFileSize = this.DEFAULT_MAX_FILE_SIZE, verbose = true } = options
    const warnings: string[] = []

    try {
      const fullPath = `${this.BASE_URL}${relativePath}`

      const response = await fetch(fullPath)

      if (!response.ok) {
        const errorMsg = verbose
          ? `Failed to load '${relativePath}': HTTP ${response.status} ${response.statusText}`
          : `Failed to load file: ${response.statusText}`

        return {
          success: false,
          errors: [errorMsg],
          warnings,
        }
      }

      const contentLength = response.headers.get('content-length')
      if (contentLength) {
        const size = Number.parseInt(contentLength, 10)
        if (size > maxFileSize) {
          return {
            success: false,
            errors: [`File too large: ${(size / 1024 / 1024).toFixed(2)}MB (max ${(maxFileSize / 1024 / 1024).toFixed(0)}MB)`],
            warnings,
          }
        }
      }

      const text = await response.text()

      if (text.length > maxFileSize) {
        return {
          success: false,
          errors: [`File too large: ${(text.length / 1024 / 1024).toFixed(2)}MB (max ${(maxFileSize / 1024 / 1024).toFixed(0)}MB)`],
          warnings,
        }
      }

      let data: T
      try {
        data = JSON.parse(text) as T
      }
      catch (parseError) {
        const errorMsg = verbose
          ? `Invalid JSON in '${relativePath}': ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
          : `Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`

        return {
          success: false,
          errors: [errorMsg],
          warnings,
        }
      }

      return {
        success: true,
        data,
        errors: [],
        warnings,
      }
    }
    catch (error) {
      const errorMsg = verbose
        ? `Error loading '${relativePath}': ${error instanceof Error ? error.message : 'Unknown error'}`
        : `Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`

      return {
        success: false,
        errors: [errorMsg],
        warnings,
      }
    }
  }

  static async loadRegistry<T = unknown>(
    registryPath: string,
  ): Promise<FileLoadResult<T>> {
    return this.loadJSON<T>(registryPath, {
      maxFileSize: 1024 * 1024, // 1MB for registry files
      verbose: true,
    })
  }

  static async loadFromFile<T = unknown>(
    file: File,
    options: LoadOptions = {},
  ): Promise<FileLoadResult<T>> {
    const { maxFileSize = this.DEFAULT_MAX_FILE_SIZE, verbose = true } = options
    const warnings: string[] = []

    if (!file.name.endsWith('.json')) {
      return {
        success: false,
        errors: ['File must be a JSON file (.json extension)'],
        warnings,
      }
    }

    if (file.size > maxFileSize) {
      return {
        success: false,
        errors: [`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max ${(maxFileSize / 1024 / 1024).toFixed(0)}MB)`],
        warnings,
      }
    }

    try {
      const text = await file.text()

      let data: T
      try {
        data = JSON.parse(text) as T
      }
      catch (parseError) {
        const errorMsg = verbose
          ? `Invalid JSON in '${file.name}': ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
          : `Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`

        return {
          success: false,
          errors: [errorMsg],
          warnings,
        }
      }

      return {
        success: true,
        data,
        errors: [],
        warnings,
      }
    }
    catch (error) {
      const errorMsg = verbose
        ? `Failed to read file '${file.name}': ${error instanceof Error ? error.message : 'Unknown error'}`
        : `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`

      return {
        success: false,
        errors: [errorMsg],
        warnings,
      }
    }
  }
}
