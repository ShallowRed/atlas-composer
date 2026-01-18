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

export interface RenderOptions {
  mode: 'simple' | 'composite-custom' | 'composite-projection'
}

export interface SimpleRenderOptions extends RenderOptions {
  mode: 'simple'
  geoData: GeoJSON.FeatureCollection
  projection: string
  width: number
  height: number
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
}

export class Cartographer {
  private projectionService: ProjectionService
  private geoDataService: GeoDataService
  public customComposite: CompositeProjection | null = null

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

    if (projectionParams) {
      this.projectionService.setProjectionParams(projectionParams)
    }

    if (canvasDimensions) {
      this.projectionService.setCanvasDimensions(canvasDimensions)
    }

    if (compositeConfig) {
      this.customComposite = new CompositeProjection(compositeConfig, parameterProvider, referenceScale, canvasDimensions)
    }
  }

  get lastProjection(): GeoProjection | null {
    return this._lastProjection
  }

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

  updateProjectionParams(params: ProjectionParameters): void {
    this.projectionService.setProjectionParams(params)
  }

  updateCanvasDimensions(dimensions: { width: number, height: number } | null): void {
    this.projectionService.setCanvasDimensions(dimensions)
  }

  updateAutoFitDomain(enabled: boolean): void {
    this.projectionService.setAutoFitDomain(enabled)
  }

  updateReferenceScale(scale: number | undefined): void {
    if (this.customComposite && scale !== undefined) {
      this.customComposite.updateReferenceScale(scale)
    }
  }

  updateTerritoryParameters(territoryCode: TerritoryCode): void {
    if (this.customComposite) {
      this.customComposite.updateTerritoryParameters(territoryCode)
    }
  }

  updateTerritoryProjection(territoryCode: TerritoryCode, projectionType: ProjectionId): void {
    if (this.customComposite) {
      this.customComposite.updateTerritoryProjection(territoryCode, projectionType)
    }
  }

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

  private createSvg(
    data: GeoJSON.FeatureCollection,
    projection: GeoProjection,
    width: number,
    height: number,
    showSphere = false,
  ): SVGSVGElement {
    const svg = D3MapRenderer.createSvgElement(width, height)

    if (showSphere) {
      D3MapRenderer.renderSphere(svg, projection)
    }

    D3MapRenderer.renderTerritories(svg, data, projection, {
      enableTooltips: true,
    })

    return svg
  }

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

  private renderSimple(options: SimpleRenderOptions): SVGSVGElement {
    const { geoData, projection, width, height, showSphere } = options

    const projectionFn = this.projectionService.getD3Projection(
      projection,
      geoData,
      width,
      height,
      showSphere,
    )

    if (!projectionFn) {
      throw new Error(`Failed to create projection: ${projection}`)
    }

    this._lastProjection = projectionFn

    return this.createSvg(geoData, projectionFn, width, height, showSphere)
  }

  private async renderProjectionComposite(options: CompositeRenderOptions): Promise<SVGSVGElement> {
    const { territoryMode, territoryCodes, projection, width, height, showSphere } = options
    const rawData = await this.getRawDataForComposite(territoryMode, territoryCodes)

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

    this._lastProjection = projectionFn

    return this.createSvg(rawData, projectionFn, width, height, showSphere)
  }

  private async renderCustomComposite(options: CompositeRenderOptions): Promise<SVGSVGElement> {
    const { territoryMode, territoryCodes, width, height, settings, showSphere } = options

    if (!this.customComposite) {
      throw new Error('Custom composite projection not configured for this region')
    }

    if (settings) {
      this.applyCustomCompositeSettings(settings)
    }

    const rawData = await this.getRawDataForComposite(territoryMode, territoryCodes)

    const projectionFn = this.customComposite.build(width, height, true)

    this._lastProjection = projectionFn as GeoProjection

    return this.createSvg(rawData, projectionFn as GeoProjection, width, height, showSphere)
  }

  private applyCustomCompositeSettings(settings: CustomCompositeSettings): void {
    if (!this.customComposite) {
      return
    }

    const composite = this.customComposite
    const { territoryProjections, territoryTranslations } = settings

    if (territoryProjections) {
      for (const [code, proj] of Object.entries(territoryProjections)) {
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
  }

  static addTerritoryAttributes(svg: SVGSVGElement, data: GeoJSON.FeatureCollection): void {
    D3MapRenderer.addTerritoryAttributes(svg, data)
  }
}
