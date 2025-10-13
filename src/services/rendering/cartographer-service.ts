import type { ProjectionParams } from '@/core/atlases/loader'
import type { CompositeProjectionConfig, GeoDataConfig } from '@/types'
import * as Plot from '@observablehq/plot'
import { GeoDataService } from '@/services/data/geo-data-service'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { ProjectionService } from '@/services/projection/projection-service'
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
  showGraticule?: boolean
  showSphere?: boolean
  showCompositionBorders?: boolean
  showMapLimits?: boolean
}

export interface CompositeRenderOptions extends RenderOptions {
  mode: 'composite-custom' | 'composite-projection'
  territoryMode: string
  territoryCodes?: readonly string[] // Optional territory codes to filter data
  projection: string
  width: number
  height: number
  settings?: CustomCompositeSettings
  showGraticule?: boolean
  showSphere?: boolean
  showCompositionBorders?: boolean
  showMapLimits?: boolean
}

export interface TerritoryProjectionParams {
  rotateLongitude?: number
  rotateLatitude?: number
  centerLongitude?: number
  centerLatitude?: number
  parallel1?: number
  parallel2?: number
}

export interface CustomCompositeSettings {
  territoryProjections: Record<string, string>
  territoryTranslations: Record<string, { x: number, y: number }>
  territoryScales: Record<string, number>
  territoryProjectionParams?: Record<string, TerritoryProjectionParams>
  compositeScale?: number
  compositeWidth?: number
  compositeHeight?: number
}

export class Cartographer {
  private projectionService: ProjectionService
  private geoDataService: GeoDataService
  public customComposite: CompositeProjection | null = null

  constructor(
    geoDataConfig: GeoDataConfig,
    compositeConfig?: CompositeProjectionConfig,
    projectionParams?: ProjectionParams,
  ) {
    this.projectionService = new ProjectionService()
    this.geoDataService = new GeoDataService(geoDataConfig)

    // Set projection parameters if provided
    if (projectionParams) {
      this.projectionService.setProjectionParams(projectionParams)
    }

    // Only create CompositeProjection if config is provided
    if (compositeConfig) {
      this.customComposite = new CompositeProjection(compositeConfig)
    }
  }

  /**
   * Public getter for GeoDataService
   * Provides type-safe access to geo data operations
   */
  get geoData(): GeoDataService {
    return this.geoDataService
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

  /**
   * Update projection parameters
   * Call this when custom projection parameters change
   */
  updateProjectionParams(params: ProjectionParams): void {
    console.log('[Cartographer] updateProjectionParams called with:', params)
    this.projectionService.setProjectionParams(params)
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
    showGraticule = true,
    showSphere = false,
  ): Plot.Plot {
    const { mainlandCode } = this.geoDataService.config
    const geoDataMainlandCode = this.geoDataService.config.mainlandCode

    const marks: any[] = []

    // Add sphere outline if enabled (should be rendered first, behind other elements)
    if (showSphere) {
      marks.push(
        Plot.sphere({ stroke: 'currentColor', strokeWidth: 1.5 }),
      )
    }

    // Add graticule if enabled
    if (showGraticule) {
      marks.push(
        Plot.graticule(),
      )
    }

    // Add geography
    marks.push(
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
    )

    return Plot.plot({
      width,
      height,
      inset,
      projection,
      marks,
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
    const { geoData, projection, width, height, inset, showGraticule, showSphere } = options
    console.log('[Cartographer] renderSimple: About to get projection for:', projection)
    let projectionFn = this.projectionService.getProjection(projection, geoData)

    // When showing sphere, use sphere as domain instead of data for proper fitting
    if (showSphere && typeof projectionFn === 'object' && 'domain' in projectionFn) {
      projectionFn = {
        ...projectionFn,
        domain: { type: 'Sphere' },
      }
    }

    return this.createPlot(geoData, projectionFn, width, height, inset, showGraticule, showSphere)
  }

  /**
   * Renders a composite map using a built-in composite projection (e.g., d3-composite-projections)
   * Fetches raw data and applies a pre-configured composite projection
   */
  private async renderProjectionComposite(options: CompositeRenderOptions): Promise<Plot.Plot> {
    const { territoryMode, territoryCodes, projection, width, height, showGraticule, showSphere } = options
    const rawData = await this.getRawDataForComposite(territoryMode, territoryCodes)
    let projectionFn = this.projectionService.getProjection(projection, rawData)

    // When showing sphere, use sphere as domain instead of data for proper fitting
    if (showSphere && typeof projectionFn === 'object' && 'domain' in projectionFn) {
      projectionFn = {
        ...projectionFn,
        domain: { type: 'Sphere' },
      }
    }

    return this.createPlot(rawData, projectionFn, width, height, 20, showGraticule, showSphere)
  }

  /**
   * Renders a custom composite map with individually positioned territories
   * Fetches raw data, applies custom settings, and uses CompositeProjection
   */
  private async renderCustomComposite(options: CompositeRenderOptions): Promise<Plot.Plot> {
    const { territoryMode, territoryCodes, width, height, settings, showGraticule, showSphere } = options

    if (!this.customComposite) {
      throw new Error('Custom composite projection not configured for this region')
    }

    // Apply custom settings if provided
    if (settings) {
      this.applyCustomCompositeSettings(settings)
    }

    const rawData = await this.getRawDataForComposite(territoryMode, territoryCodes)

    // Use custom dimensions if provided in settings, otherwise use defaults
    const effectiveWidth = settings?.compositeWidth ?? width
    const effectiveHeight = settings?.compositeHeight ?? height

    // Dynamic projection that rebuilds on resize
    const projectionFn = () => {
      // Use the effective dimensions for building the projection
      // This ensures the composite projection uses custom dimensions
      return this.customComposite!.build(effectiveWidth, effectiveHeight, true)
    }

    return this.createPlot(rawData, projectionFn, effectiveWidth, effectiveHeight, 20, showGraticule, showSphere)
  }

  private applyCustomCompositeSettings(settings: CustomCompositeSettings): void {
    if (!this.customComposite) {
      return
    }

    const composite = this.customComposite
    const { territoryProjections, territoryTranslations, territoryScales, territoryProjectionParams, compositeScale } = settings

    // Apply global reference scale if provided
    if (compositeScale !== undefined) {
      composite.updateReferenceScale(compositeScale)
    }

    // Apply to customComposite instance
    if (territoryProjections) {
      for (const [code, proj] of Object.entries(territoryProjections)) {
        composite.updateTerritoryProjection(code, proj as any, territoryProjectionParams?.[code])
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
