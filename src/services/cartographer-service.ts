import type { CompositeProjectionConfig, GeoDataConfig } from '@/types/territory'
import * as Plot from '@observablehq/plot'
import { CompositeProjection } from '@/services/composite-projection'
import { GeoDataService } from '@/services/geo-data-service'
import { ProjectionService } from '@/services/projection-service'
import { getTerritoryFillColor, getTerritoryStrokeColor } from '@/utils/color-utils'
// Unified rendering options
export interface RenderOptions {
  mode: 'simple' | 'composite-custom' | 'composite-projection'
}

export interface SimpleRenderOptions extends RenderOptions {
  mode: 'simple'
  geoData: GeoJSON.FeatureCollection
  projection: string
  width: number
  height: number
  inset: number
  isMainland?: boolean
  area?: number
  preserveScale?: boolean
}

export interface CompositeRenderOptions extends RenderOptions {
  mode: 'composite-custom' | 'composite-projection'
  territoryMode: string
  territoryCodes?: readonly string[] // Optional territory codes to filter data
  projection: string
  width: number
  height: number
  settings?: CustomCompositeSettings
}

export interface CustomCompositeSettings {
  territoryProjections: Record<string, string>
  territoryTranslations: Record<string, { x: number, y: number }>
  territoryScales: Record<string, number>
}

export class Cartographer {
  private projectionService: ProjectionService
  private geoDataService: GeoDataService
  public customComposite: CompositeProjection | null = null

  constructor(geoDataConfig: GeoDataConfig, compositeConfig?: CompositeProjectionConfig) {
    this.projectionService = new ProjectionService()
    this.geoDataService = new GeoDataService(geoDataConfig)

    // Only create CompositeProjection if config is provided
    if (compositeConfig) {
      this.customComposite = new CompositeProjection(compositeConfig)
    }
  }

  async init(): Promise<void> {
    try {
      await this.geoDataService.loadData()
      this.geoDataService.getTerritoryInfo()
    }
    catch (error) {
      console.error('Cartographer initialization error:', error)
      throw error
    }
  }

  // Unified rendering API
  async render(options: SimpleRenderOptions | CompositeRenderOptions): Promise<Plot.Plot> {
    switch (options.mode) {
      case 'simple':
        return this.renderSimple(options)
      case 'composite-custom':
        return this.renderCustomComposite(options)
      case 'composite-projection':
        return this.renderProjectionComposite(options)
      default:
        throw new Error(`Unknown render mode: ${(options as any).mode}`)
    }
  }

  /**
   * Creates a Plot with the specified data, projection, and dimensions
   * Common rendering logic shared by all render modes
   */
  private createPlot(
    data: GeoJSON.FeatureCollection,
    projection: any,
    width: number,
    height: number,
    inset: number,
  ): Plot.Plot {
    const { mainlandCode } = this.geoDataService.config
    const geoDataMainlandCode = this.geoDataService.config.mainlandCode

    return Plot.plot({
      width,
      height,
      inset,
      projection,
      marks: [
        Plot.geo(data, {
          tip: true,
          channels: {
            name: (d: any) => d.properties.name,
          },
          fill: (d: any) => {
            const code = d.properties?.code || d.properties?.INSEE_DEP || 'unknown'
            return getTerritoryFillColor(code, mainlandCode, geoDataMainlandCode)
          },
          stroke: (d: any) => {
            const code = d.properties?.code || d.properties?.INSEE_DEP || 'unknown'
            return getTerritoryStrokeColor(code, mainlandCode, geoDataMainlandCode)
          },
        }),
      ],
    })
  }

  /**
   * Fetches raw unified data for composite rendering modes
   * Throws error if data is not available
   */
  private async getRawDataForComposite(
    territoryMode: string,
    territoryCodes?: readonly string[],
  ): Promise<GeoJSON.FeatureCollection> {
    const rawData = await this.geoDataService.getRawUnifiedData(territoryMode, territoryCodes)
    if (!rawData) {
      throw new Error('No raw unified data available')
    }
    return rawData
  }

  /**
   * Renders a simple map with a single projection
   * Data is provided directly in options
   */
  private renderSimple(options: SimpleRenderOptions): Plot.Plot {
    const { geoData, projection, width, height, inset } = options
    const projectionFn = this.projectionService.getProjection(projection, geoData)
    return this.createPlot(geoData, projectionFn, width, height, inset)
  }

  /**
   * Renders a composite map using a built-in composite projection (e.g., d3-composite-projections)
   * Fetches raw data and applies a pre-configured composite projection
   */
  private async renderProjectionComposite(options: CompositeRenderOptions): Promise<Plot.Plot> {
    const { territoryMode, territoryCodes, projection, width, height } = options
    const rawData = await this.getRawDataForComposite(territoryMode, territoryCodes)
    const projectionFn = this.projectionService.getProjection(projection, rawData)
    return this.createPlot(rawData, projectionFn, width, height, 20)
  }

  /**
   * Renders a custom composite map with individually positioned territories
   * Fetches raw data, applies custom settings, and uses CompositeProjection
   */
  private async renderCustomComposite(options: CompositeRenderOptions): Promise<Plot.Plot> {
    const { territoryMode, territoryCodes, width, height, settings } = options

    if (!this.customComposite) {
      throw new Error('Custom composite projection not configured for this region')
    }

    // Apply custom settings if provided
    if (settings) {
      this.applyCustomCompositeSettings(settings)
    }

    const rawData = await this.getRawDataForComposite(territoryMode, territoryCodes)

    // Dynamic projection that rebuilds on resize
    const projectionFn = ({ width: w, height: h }: { width: number, height: number }) => {
      return this.customComposite!.build(w, h, true)
    }

    return this.createPlot(rawData, projectionFn, width, height, 20)
  }

  private applyCustomCompositeSettings(settings: CustomCompositeSettings): void {
    if (!this.customComposite) {
      return
    }

    const composite = this.customComposite
    const { territoryProjections, territoryTranslations, territoryScales } = settings

    // Apply to customComposite instance
    if (territoryProjections) {
      for (const [code, proj] of Object.entries(territoryProjections)) {
        composite.updateTerritoryProjection(code, proj as any)
      }
    }

    if (territoryTranslations) {
      for (const [code, translation] of Object.entries(territoryTranslations)) {
        composite.updateTranslationOffset(code, [translation.x, translation.y])
      }
    }

    if (territoryScales) {
      for (const [code, scale] of Object.entries(territoryScales)) {
        composite.updateScale(code, scale)
      }
    }
  }
}
