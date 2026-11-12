import type { GeoProjection } from 'd3-geo'
import type { GeoDataError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { TerritoryProjection } from '@/services/rendering/d3-map-renderer'
import type { CompositeTerritories, GeoDataConfig } from '@/types'
import type { ProjectionParameterProvider, ProjectionParameters } from '@/types/projection-parameters'
import { GeoDataService } from '@/services/data/geo-data-service'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { ProjectionService } from '@/services/projection/projection-service'
import { D3MapRenderer } from '@/services/rendering/d3-map-renderer'
import { logger } from '@/utils/logger'

const debug = logger.render.cartographer

interface RenderOptions {
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
  showGraticule?: boolean
  showSphere?: boolean
  showCompositionBorders?: boolean
  showMapLimits?: boolean
}

export class Cartographer {
  private projectionService: ProjectionService
  private geoDataService: GeoDataService
  public customComposite: CompositeProjection | null = null

  private _lastProjection: GeoProjection | null = null

  constructor(
    geoDataConfig: GeoDataConfig,
    compositeConfig?: CompositeTerritories,
    projectionParams?: ProjectionParameters,
    parameterProvider?: ProjectionParameterProvider,
    referenceScale?: number,
  ) {
    this.projectionService = new ProjectionService()
    this.geoDataService = new GeoDataService(geoDataConfig)

    if (projectionParams) {
      this.projectionService.setProjectionParams(projectionParams)
    }

    if (compositeConfig && parameterProvider) {
      this.customComposite = new CompositeProjection(compositeConfig, parameterProvider, referenceScale)
    }
  }

  get lastProjection(): GeoProjection | null {
    return this._lastProjection
  }

  get geoData(): GeoDataService {
    return this.geoDataService
  }

  async init(): Promise<Result<void, GeoDataError>> {
    return this.geoDataService.loadData()
  }

  updateProjectionParams(params: ProjectionParameters): void {
    this.projectionService.setProjectionParams(params)
  }

  updateAutoFitDomain(enabled: boolean): void {
    this.projectionService.setAutoFitDomain(enabled)
  }

  updateReferenceScale(scale: number | undefined): void {
    if (this.customComposite && scale !== undefined) {
      this.customComposite.updateReferenceScale(scale)
    }
  }

  rebuildCompositeProjection(
    compositeConfig: CompositeTerritories,
    parameterProvider: ProjectionParameterProvider,
    referenceScale?: number,
  ): void {
    this.customComposite = new CompositeProjection(
      compositeConfig,
      parameterProvider,
      referenceScale,
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
    projectionOf: TerritoryProjection,
    width: number,
    height: number,
    showSphere = false,
  ): SVGSVGElement {
    const svg = D3MapRenderer.createSvgElement(width, height)

    if (showSphere) {
      D3MapRenderer.renderSphere(svg, projection)
    }

    D3MapRenderer.renderTerritories(svg, data, projectionOf, {
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

    return this.createSvg(geoData, projectionFn, () => projectionFn, width, height, showSphere)
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

    return this.createSvg(rawData, projectionFn, () => projectionFn, width, height, showSphere)
  }

  private async renderCustomComposite(options: CompositeRenderOptions): Promise<SVGSVGElement> {
    const { territoryMode, territoryCodes, width, height, showSphere } = options

    if (!this.customComposite) {
      throw new Error('Custom composite projection not configured for this region')
    }

    const rawData = await this.getRawDataForComposite(territoryMode, territoryCodes)

    const customComposite = this.customComposite
    const projectionFn = customComposite.build(width, height)

    this._lastProjection = projectionFn as GeoProjection

    const projectionOf: TerritoryProjection = feature =>
      customComposite.getSubProjectionData(feature.properties?.code)?.projection

    return this.createSvg(rawData, projectionFn as GeoProjection, projectionOf, width, height, showSphere)
  }
}
