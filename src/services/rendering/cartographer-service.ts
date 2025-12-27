import type { GeoProjection } from 'd3-geo'
import type { ProjectionParameterProvider } from '@/services/projection/composite-projection'
import type { CompositeProjectionConfig, GeoDataConfig } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { GeoDataService } from '@/services/data/geo-data-service'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { ProjectionService } from '@/services/projection/projection-service'
import { D3MapRenderer } from '@/services/rendering/d3-map-renderer'
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

  /**
   * The projection used for the last render call.
   * Available for overlay services to use the exact same projection.
   */
  private _lastProjection: GeoProjection | null = null

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
   * Get the projection used for the last render call.
   * This allows overlay services to use the exact same projection instance.
   */
  get lastProjection(): GeoProjection | null {
    return this._lastProjection
  }

  /**
   * Public getter for GeoDataService
   * Provides type-safe access to geo data operations
   */
  get geoData(): GeoDataService {
    return this.geoDataService
  }

  async init(): Promise<void> {
    const result = await this.geoDataService.loadData()
    if (!result.ok) {
      debug('Cartographer initialization error: %O', result.error)
      throw new Error(`Failed to load geographic data: ${result.error.type}`)
    }
    this.geoDataService.getTerritoryInfo()
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
   * Update auto fit domain mode
   * @param enabled - When true, uses domain fitting (auto-zoom to data extent)
   *                  When false, uses manual fitting with scaleMultiplier control
   */
  updateAutoFitDomain(enabled: boolean): void {
    this.projectionService.setAutoFitDomain(enabled)
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
  updateTerritoryParameters(territoryCode: TerritoryCode): void {
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
  updateTerritoryProjection(territoryCode: TerritoryCode, projectionType: ProjectionId): void {
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
  async render(options: SimpleRenderOptions | CompositeRenderOptions): Promise<SVGSVGElement> {
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
   * Creates an SVG with the specified data, projection, and dimensions
   * Common rendering logic shared by all render modes
   *
   * Note: Graticule is now rendered as an overlay by GraticuleOverlayService
   * for scale-adaptive density.
   */
  private createSvg(
    data: GeoJSON.FeatureCollection,
    projection: GeoProjection,
    width: number,
    height: number,
    showSphere = false,
  ): SVGSVGElement {
    const { mainlandCode } = this.geoDataService.config
    const geoDataMainlandCode = this.geoDataService.config.mainlandCode

    // Create SVG container
    const svg = D3MapRenderer.createSvgElement(width, height)

    // Add sphere outline if enabled (should be rendered first, behind other elements)
    if (showSphere) {
      D3MapRenderer.renderSphere(svg, projection)
    }

    // Add territories
    D3MapRenderer.renderTerritories(svg, data, projection, {
      mainlandCode,
      geoDataMainlandCode,
      enableTooltips: true,
    })

    return svg
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
  private renderSimple(options: SimpleRenderOptions): SVGSVGElement {
    const { geoData, projection, width, height, showSphere } = options

    // Get fitted D3 projection
    const projectionFn = this.projectionService.getD3Projection(
      projection,
      geoData,
      width,
      height,
      showSphere, // fitToSphere when showing sphere
    )

    if (!projectionFn) {
      throw new Error(`Failed to create projection: ${projection}`)
    }

    // Store for overlay use
    this._lastProjection = projectionFn

    return this.createSvg(geoData, projectionFn, width, height, showSphere)
  }

  /**
   * Renders a composite map using a built-in composite projection (e.g., d3-composite-projections)
   * Fetches raw data and applies a pre-configured composite projection
   */
  private async renderProjectionComposite(options: CompositeRenderOptions): Promise<SVGSVGElement> {
    const { territoryMode, territoryCodes, projection, width, height, showSphere } = options
    const rawData = await this.getRawDataForComposite(territoryMode, territoryCodes)

    // Get fitted D3 projection
    const projectionFn = this.projectionService.getD3Projection(
      projection,
      rawData,
      width,
      height,
      showSphere,
    )

    if (!projectionFn) {
      throw new Error(`Failed to create projection: ${projection}`)
    }

    // Store for overlay use
    this._lastProjection = projectionFn

    return this.createSvg(rawData, projectionFn, width, height, showSphere)
  }

  /**
   * Renders a custom composite map with individually positioned territories
   * Fetches raw data, applies custom settings, and uses CompositeProjection
   */
  private async renderCustomComposite(options: CompositeRenderOptions): Promise<SVGSVGElement> {
    const { territoryMode, territoryCodes, width, height, settings, showSphere } = options

    if (!this.customComposite) {
      throw new Error('Custom composite projection not configured for this region')
    }

    // Apply custom settings if provided
    if (settings) {
      this.applyCustomCompositeSettings(settings)
    }

    const rawData = await this.getRawDataForComposite(territoryMode, territoryCodes)

    // Build the composite projection with current dimensions
    const projectionFn = this.customComposite.build(width, height, true)

    // Store for overlay use
    this._lastProjection = projectionFn as GeoProjection

    return this.createSvg(rawData, projectionFn as GeoProjection, width, height, showSphere)
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
          composite.updateTerritoryProjection(code as TerritoryCode, proj as ProjectionId)
        }
      }
    }

    if (territoryTranslations) {
      for (const [code, translation] of Object.entries(territoryTranslations)) {
        composite.updateTranslationOffset(code as TerritoryCode, [translation.x, translation.y])
      }
    }

    // Scale multipliers are now handled by CompositeProjection via parameter provider
    // The composite reads scaleMultiplier from parameters when updateTerritoryParameters() is called
  }

  /**
   * Add data-territory attributes to SVG paths for territory identification
   * Should be called after plot is rendered and appended to DOM
   *
   * Delegates to D3MapRenderer.addTerritoryAttributes
   */
  static addTerritoryAttributes(svg: SVGSVGElement, data: GeoJSON.FeatureCollection): void {
    D3MapRenderer.addTerritoryAttributes(svg, data)
  }
}
