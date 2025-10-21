/**
 * Preset File Loader
 *
 * Shared utility for loading preset files from the filesystem.
 * Provides common patterns for file loading, JSON parsing, and error handling
 * used by both composite and view preset loaders.
 *
 * Key responsibilities:
 * - Fetch JSON files from configs directory
 * - Parse JSON with error handling
 * - Validate file size and format
 * - Provide consistent error messages
 */

/**
 * Result of loading a JSON file
 */
export interface FileLoadResult<T = unknown> {
  /** Whether the file was loaded successfully */
  success: boolean

  /** Parsed JSON data (only if success is true) */
  data?: T

  /** Array of error messages */
  errors: string[]

  /** Array of warning messages */
  warnings: string[]
}

/**
 * Options for loading a JSON file
 */
export interface LoadOptions {
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number

  /** Whether to include detailed error messages */
  verbose?: boolean
}

/**
 * Shared preset file loader utility
 */
export class PresetFileLoader {
  private static readonly DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private static readonly BASE_URL = import.meta.env.BASE_URL

  /**
   * Load and parse a JSON file from the configs directory
   *
   * @param relativePath - Path relative to BASE_URL (e.g., 'configs/presets/france-default.json')
   * @param options - Loading options
   * @returns Load result with parsed data or error messages
   */
  static async loadJSON<T = unknown>(
    relativePath: string,
    options: LoadOptions = {},
  ): Promise<FileLoadResult<T>> {
    const { maxFileSize = this.DEFAULT_MAX_FILE_SIZE, verbose = true } = options
    const warnings: string[] = []

    try {
      // Construct full path
      const fullPath = `${this.BASE_URL}${relativePath}`

      // Fetch file
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

      // Check content length if available
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

      // Parse JSON
      const text = await response.text()

      // Check text size
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

  /**
   * Load a preset registry file
   *
   * @param registryPath - Path to registry file relative to BASE_URL
   * @returns Load result with registry data
   */
  static async loadRegistry<T = unknown>(
    registryPath: string,
  ): Promise<FileLoadResult<T>> {
    return this.loadJSON<T>(registryPath, {
      maxFileSize: 1024 * 1024, // 1MB for registry files
      verbose: true,
    })
  }

  /**
   * Load a JSON file from a File object (browser File API)
   *
   * @param file - File object to read
   * @param options - Loading options
   * @returns Promise with load result
   */
  static async loadFromFile<T = unknown>(
    file: File,
    options: LoadOptions = {},
  ): Promise<FileLoadResult<T>> {
    const { maxFileSize = this.DEFAULT_MAX_FILE_SIZE, verbose = true } = options
    const warnings: string[] = []

    // Validate file type
    if (!file.name.endsWith('.json')) {
      return {
        success: false,
        errors: ['File must be a JSON file (.json extension)'],
        warnings,
      }
    }

    // Validate file size
    if (file.size > maxFileSize) {
      return {
        success: false,
        errors: [`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max ${(maxFileSize / 1024 / 1024).toFixed(0)}MB)`],
        warnings,
      }
    }

    // Read file content
    try {
      const text = await file.text()

      // Parse JSON
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
