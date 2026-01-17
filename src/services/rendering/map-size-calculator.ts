/**
 * Configuration for map size calculation
 */
export interface MapSizeConfig {
  /**
   * Reference area for scale calculation (e.g., France métropolitaine)
   */
  referenceArea: number

  /**
   * Base dimensions for the reference territory
   */
  baseWidth: number
  baseHeight: number

  /**
   * Minimum dimensions for scaled territories
   */
  minWidth: number
  minHeight: number

  /**
   * Maximum dimensions for scaled territories
   */
  maxWidth: number
  maxHeight: number

  /**
   * Fixed dimensions for composite maps
   */
  compositeWidth: number
  compositeHeight: number
}

/**
 * Result of map size calculation
 */
export interface MapSize {
  width: number
  height: number
}

/**
 * Service for calculating map dimensions based on various criteria
 * Handles territory area-based scaling and mode-specific sizing
 */
export class MapSizeCalculator {
  private static readonly DEFAULT_CONFIG: MapSizeConfig = {
    referenceArea: 550000, // France métropolitaine in km²
    baseWidth: 500,
    baseHeight: 400,
    minWidth: 50,
    minHeight: 40,
    maxWidth: 300,
    maxHeight: 240,
    compositeWidth: 800,
    compositeHeight: 600,
  }

  /**
   * Calculate map size based on mode and territory properties
   *
   * @param options - Calculation options
   * @param options.mode - Map rendering mode
   * @param options.preserveScale - Whether to preserve area-based scale
   * @param options.area - Territory area in km²
   * @param options.width - Explicit width override
   * @param options.height - Explicit height override
   * @param options.config - Custom configuration overrides
   * @returns Calculated map dimensions
   */
  static calculateSize(options: {
    mode?: 'composite' | 'territory'
    preserveScale?: boolean
    area?: number
    width?: number
    height?: number
    config?: Partial<MapSizeConfig>
  }): MapSize {
    const config = { ...this.DEFAULT_CONFIG, ...options.config }

    // For composite maps, use fixed larger dimensions
    if (options.mode === 'composite') {
      return {
        width: config.compositeWidth,
        height: config.compositeHeight,
      }
    }

    // If explicit dimensions provided without scale preservation, use them
    if (options.width && options.height && !options.preserveScale) {
      return {
        width: options.width,
        height: options.height,
      }
    }

    // For territories with scale preservation
    if (options.preserveScale && options.area) {
      return this.calculateProportionalSize(options.area, config)
    }

    // Default dimensions
    return {
      width: options.width || config.baseWidth,
      height: options.height || config.baseHeight,
    }
  }

  /**
   * Calculate proportional size based on territory area
   *
   * @param area - Territory area in km²
   * @param config - Size configuration
   * @returns Proportional map dimensions
   */
  private static calculateProportionalSize(
    area: number,
    config: MapSizeConfig,
  ): MapSize {
    // Calculate scale factor based on area ratio
    const scaleFactor = Math.sqrt(area / config.referenceArea)

    // Apply scale factor to base dimensions
    const proportionalWidth = config.baseWidth * scaleFactor
    const proportionalHeight = config.baseHeight * scaleFactor

    // Clamp to min/max bounds
    const width = Math.max(
      config.minWidth,
      Math.min(config.maxWidth, proportionalWidth),
    )
    const height = Math.max(
      config.minHeight,
      Math.min(config.maxHeight, proportionalHeight),
    )

    return {
      width: Math.round(width),
      height: Math.round(height),
    }
  }

  /**
   * Calculate scale factor between two areas
   *
   * @param area - Territory area
   * @param referenceArea - Reference area for comparison
   * @returns Scale factor (square root of area ratio)
   */
  static calculateScaleFactor(area: number, referenceArea: number): number {
    return Math.sqrt(area / referenceArea)
  }

  /**
   *
   * @returns Default map size configuration
   */
  static getDefaultConfig(): MapSizeConfig {
    return { ...this.DEFAULT_CONFIG }
  }
}
