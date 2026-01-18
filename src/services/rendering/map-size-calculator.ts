export interface MapSizeConfig {
  referenceArea: number
  baseWidth: number
  baseHeight: number
  minWidth: number
  minHeight: number
  maxWidth: number
  maxHeight: number
  compositeWidth: number
  compositeHeight: number
}

export interface MapSize {
  width: number
  height: number
}

export class MapSizeCalculator {
  private static readonly DEFAULT_CONFIG: MapSizeConfig = {
    referenceArea: 550000,
    baseWidth: 500,
    baseHeight: 400,
    minWidth: 50,
    minHeight: 40,
    maxWidth: 300,
    maxHeight: 240,
    compositeWidth: 800,
    compositeHeight: 600,
  }

  static calculateSize(options: {
    mode?: 'composite' | 'territory'
    preserveScale?: boolean
    area?: number
    width?: number
    height?: number
    config?: Partial<MapSizeConfig>
  }): MapSize {
    const config = { ...this.DEFAULT_CONFIG, ...options.config }

    if (options.mode === 'composite') {
      return {
        width: config.compositeWidth,
        height: config.compositeHeight,
      }
    }

    if (options.width && options.height && !options.preserveScale) {
      return {
        width: options.width,
        height: options.height,
      }
    }

    if (options.preserveScale && options.area) {
      return this.calculateProportionalSize(options.area, config)
    }

    return {
      width: options.width || config.baseWidth,
      height: options.height || config.baseHeight,
    }
  }

  private static calculateProportionalSize(
    area: number,
    config: MapSizeConfig,
  ): MapSize {
    const scaleFactor = Math.sqrt(area / config.referenceArea)

    const proportionalWidth = config.baseWidth * scaleFactor
    const proportionalHeight = config.baseHeight * scaleFactor

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

  static calculateScaleFactor(area: number, referenceArea: number): number {
    return Math.sqrt(area / referenceArea)
  }

  static getDefaultConfig(): MapSizeConfig {
    return { ...this.DEFAULT_CONFIG }
  }
}
