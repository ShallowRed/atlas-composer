import type { ProjectionParameterProvider } from '@/services/projection/composite-projection'
import type { CompositeProjectionConfig, GeoDataConfig } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import * as Plot from '@observablehq/plot'
import { select } from 'd3'
import { GeoDataService } from '@/services/data/geo-data-service'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { ProjectionService } from '@/services/projection/projection-service'
import { getTerritoryFillColor, getTerritoryStrokeColor } from '@/utils/color-utils'
import { logger } from '@/utils/logger'

const debug = logger.render.cartographer

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

export interface CustomCompositeSettings {
  territoryProjections: Record<string, string>
  territoryTranslations: Record<string, { x: number, y: number }>
  // territoryScales removed - scale multipliers now come from parameter store
}

export class Cartographer {
  private projectionService: ProjectionService
  private geoDataService: GeoDataService
  public customComposite: CompositeProjection | null = null

  constructor(
    geoDataConfig: GeoDataConfig,
    compositeConfig?: CompositeProjectionConfig,
    projectionParams?: ProjectionParameters,
    parameterProvider?: ProjectionParameterProvider,
    referenceScale?: number,
    canvasDimensions?: { width: number, height: number },
  ) {
    this.projectionService = new ProjectionService()
    this.geoDataService = new GeoDataService(geoDataConfig)

    // Set projection parameters if provided
    if (projectionParams) {
      this.projectionService.setProjectionParams(projectionParams)
    }

    // Set canvas dimensions if provided
    if (canvasDimensions) {
      this.projectionService.setCanvasDimensions(canvasDimensions)
    }

    // Only create CompositeProjection if config is provided
    if (compositeConfig) {
      this.customComposite = new CompositeProjection(compositeConfig, parameterProvider, referenceScale, canvasDimensions)
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
      debug('Cartographer initialization error: %O', error)
      throw error
    }
  }

  /**
   * Update projection parameters
   * Call this when custom projection parameters change
   */
  updateProjectionParams(params: ProjectionParameters): void {
    this.projectionService.setProjectionParams(params)
  }

  /**
   * Update canvas dimensions for projection scaling calculations
   * @param dimensions - New canvas dimensions
   */
  updateCanvasDimensions(dimensions: { width: number, height: number } | null): void {
    this.projectionService.setCanvasDimensions(dimensions)
  }

  /**
   * Update reference scale for composite projection
   * @param scale - New reference scale
   */
  updateReferenceScale(scale: number | undefined): void {
    if (this.customComposite && scale !== undefined) {
      this.customComposite.updateReferenceScale(scale)
    }
  }

  /**
   * Update territory projection parameters
   * Call this when territory-specific projection parameters change (rotate, center, parallels, etc.)
   * @param territoryCode - Territory code to update
   */
  updateTerritoryParameters(territoryCode: string): void {
    if (this.customComposite) {
      this.customComposite.updateTerritoryParameters(territoryCode)
    }
  }

  /**
   * Update territory projection type
   * Call this when the projection type changes for a territory
   * @param territoryCode - Territory code to update
   * @param projectionType - New projection type (e.g., 'conic-conformal', 'azimuthal-equal-area')
   */
  updateTerritoryProjection(territoryCode: string, projectionType: string): void {
    if (this.customComposite) {
      this.customComposite.updateTerritoryProjection(territoryCode, projectionType)
    }
  }

  /**
   * Rebuild the composite projection with a new configuration
   * Call this when the set of territories changes (e.g., loading a preset with different territories)
   * @param compositeConfig - New composite projection configuration
   * @param parameterProvider - Parameter provider for territory parameters
   * @param referenceScale - Reference scale for the projection
   * @param canvasDimensions - Canvas dimensions for scaling
   * @param canvasDimensions.width - Canvas width
   * @param canvasDimensions.height - Canvas height
   */
  rebuildCompositeProjection(
    compositeConfig: CompositeProjectionConfig,
    parameterProvider?: ProjectionParameterProvider,
    referenceScale?: number,
    canvasDimensions?: { width: number, height: number },
  ): void {
    this.customComposite = new CompositeProjection(
      compositeConfig,
      parameterProvider,
      referenceScale,
      canvasDimensions,
    )
    debug('Rebuilt composite projection with new configuration')
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
    const { geoData, projection, width, height, showGraticule, showSphere } = options
    let projectionFn = this.projectionService.getProjection(projection, geoData)

    // When showing sphere, use sphere as domain instead of data for proper fitting
    if (showSphere && typeof projectionFn === 'object' && 'domain' in projectionFn) {
      projectionFn = {
        ...projectionFn,
        domain: { type: 'Sphere' },
      }
    }

    return this.createPlot(geoData, projectionFn, width, height, showGraticule, showSphere)
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

    return this.createPlot(rawData, projectionFn, width, height, showGraticule, showSphere)
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

    // Dynamic projection that rebuilds on resize
    const projectionFn = ({ width: w, height: h }: { width: number, height: number }) => {
      return this.customComposite!.build(w, h, true)
    }

    return this.createPlot(rawData, projectionFn, width, height, showGraticule, showSphere)
  }

  private applyCustomCompositeSettings(settings: CustomCompositeSettings): void {
    if (!this.customComposite) {
      return
    }

    const composite = this.customComposite
    const { territoryProjections, territoryTranslations } = settings

    // Apply to customComposite instance
    if (territoryProjections) {
      for (const [code, proj] of Object.entries(territoryProjections)) {
        // Only update if projection type is different from current
        const subProj = (composite as any).subProjections?.find((sp: any) => sp.territoryCode === code)
        if (subProj && subProj.projectionType !== proj) {
          composite.updateTerritoryProjection(code, proj as any)
        }
      }
    }

    if (territoryTranslations) {
      for (const [code, translation] of Object.entries(territoryTranslations)) {
        composite.updateTranslationOffset(code, [translation.x, translation.y])
      }
    }

    // Scale multipliers are now handled by CompositeProjection via parameter provider
    // The composite reads scaleMultiplier from parameters when updateTerritoryParameters() is called
  }

  /**
   * Add data-territory attributes to SVG paths for territory identification using D3.js
   * Should be called after plot is rendered and appended to DOM
   */
  static addTerritoryAttributes(svg: SVGSVGElement, data: GeoJSON.FeatureCollection) {
    const svgSelection = select(svg)
    const pathSelection = svgSelection.selectAll('path')

    // Use D3 selection to process paths and add territory attributes
    pathSelection.each(function (_d, i) {
      const path = this as SVGPathElement

      // Check if Observable Plot has bound data to this element
      const boundData = (path as any).__data__

      if (boundData?.properties) {
        const territoryCode = boundData.properties.code || boundData.properties.INSEE_DEP
        if (territoryCode) {
          select(path).attr('data-territory', territoryCode)
          return // Exit early if we successfully added the attribute
        }
      }

      // Fallback: try to match by index if bound data approach failed
      if (i < data.features.length) {
        const feature = data.features[i]
        if (feature) {
          const territoryCode = feature.properties?.code || feature.properties?.INSEE_DEP

          if (territoryCode) {
            select(path).attr('data-territory', territoryCode)
          }
        }
      }
    })
  }
}
