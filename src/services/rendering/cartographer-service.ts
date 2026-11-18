import type { GeoProjection } from 'd3-geo'
import type { ProjectionFrame } from '@/core/frames'
import type { GeoDataError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { TerritoryBorders, TerritoryProjection, TerritoryTitle } from '@/services/rendering/d3-map-renderer'
import type { CompositeTerritories, GeoDataConfig } from '@/types'
import type { ProjectionParameterProvider, ProjectionParameters } from '@/types/projection-parameters'
import type { ActiveTerritoryProvider } from '@/types/territory'
import { minWeightAt } from '@/core/geometry'
import { GeoDataService } from '@/services/data/geo-data-service'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { ProjectionService } from '@/services/projection/projection-service'
import { D3MapRenderer } from '@/services/rendering/d3-map-renderer'
import { logger } from '@/utils/logger'

const debug = logger.render.cartographer

const PROBE_POINTS: [number, number][] = [[0, 0], [90, 30], [-60, -30]]

// Two projections that place three points of the globe at the same pixels draw the same map
function sameProjection(a: GeoProjection, b: GeoProjection): boolean {
  return PROBE_POINTS.every((point) => {
    const [ax, ay] = a(point) ?? [Number.NaN, Number.NaN]
    const [bx, by] = b(point) ?? [Number.NaN, Number.NaN]
    return Math.abs(ax - bx) < 1e-6 && Math.abs(ay - by) < 1e-6
  })
}

interface RenderOptions {
  mode: 'simple' | 'composite-custom' | 'composite-projection'
  titleOf?: TerritoryTitle
  fillTerritories?: boolean
}

// The map drawn, and the frames of its projections for the basemap, taken at the same render
export interface RenderedMap {
  svg: SVGSVGElement
  frames: ProjectionFrame[]
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

// The custom composite of the atlas, and the providers that it reads at each build
export interface CustomCompositeSetup {
  config: CompositeTerritories
  parameterProvider: ProjectionParameterProvider
  activeTerritoryProvider: ActiveTerritoryProvider
  referenceScale?: number
}

export class Cartographer {
  private projectionService: ProjectionService
  private geoDataService: GeoDataService
  public customComposite: CompositeProjection | null = null

  private _lastProjection: GeoProjection | null = null

  constructor(
    geoDataConfig: GeoDataConfig,
    projectionParams?: ProjectionParameters,
    composite?: CustomCompositeSetup,
  ) {
    this.projectionService = new ProjectionService()
    this.geoDataService = new GeoDataService(geoDataConfig)

    if (projectionParams) {
      this.projectionService.setProjectionParams(projectionParams)
    }

    if (composite) {
      this.rebuildCompositeProjection(composite)
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

  rebuildCompositeProjection({ config, parameterProvider, activeTerritoryProvider, referenceScale }: CustomCompositeSetup): void {
    this.customComposite = new CompositeProjection(config, parameterProvider, activeTerritoryProvider, referenceScale)
    debug('Built composite projection')
  }

  async render(options: SimpleRenderOptions | CompositeRenderOptions): Promise<RenderedMap> {
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
    titleOf?: TerritoryTitle,
    fillTerritories = true,
    meshBorders = true,
  ): SVGSVGElement {
    const svg = D3MapRenderer.createSvgElement(width, height)

    if (showSphere) {
      D3MapRenderer.renderSphere(svg, projection)
    }

    const { territories, mesh } = this.simplify(data, projectionOf)
    D3MapRenderer.renderTerritories(svg, territories, projectionOf, {
      enableTooltips: true,
      bordersOf: meshBorders ? mesh : undefined,
      titleOf,
      fillTerritories,
    })

    return svg
  }

  // Each territory simplified to the scale of the projection that draws it, at its centroid, and the meshes of their borders
  private simplify(data: GeoJSON.FeatureCollection, projectionOf: TerritoryProjection): { territories: GeoJSON.FeatureCollection, mesh?: TerritoryBorders } {
    const minWeights = new Map<string, number>()
    for (const feature of data.features) {
      const code = feature.properties?.code
      const projection = projectionOf(feature)
      const centroid = code === undefined ? undefined : this.geoDataService.centroid(code)
      if (projection && centroid) {
        minWeights.set(code, minWeightAt(projection, centroid))
      }
    }
    // A collection without a territory of the loaded topology is drawn as given
    if (minWeights.size === 0) {
      return { territories: data }
    }
    const simplified = this.geoDataService.simplified(minWeights)
    return {
      territories: {
        type: 'FeatureCollection',
        features: data.features.map(feature => simplified.feature(feature.properties?.code) ?? feature),
      },
      mesh: simplified.mesh,
    }
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

  private renderSimple(options: SimpleRenderOptions): RenderedMap {
    const { geoData, projection, width, height, showSphere, titleOf, fillTerritories } = options

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

    return {
      svg: this.createSvg(geoData, projectionFn, () => projectionFn, width, height, showSphere, titleOf, fillTerritories),
      frames: [{ code: '*', projection: projectionFn, extent: [[0, 0], [width, height]] }],
    }
  }

  private async renderProjectionComposite(options: CompositeRenderOptions): Promise<RenderedMap> {
    const { territoryMode, territoryCodes, projection, width, height, showSphere, titleOf, fillTerritories } = options
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

    return {
      // A composite of d3-composite-projections sends each point to the projection of its region: a line of a mesh, which
      // joins the borders of several territories, would cross from one frame to another, so each territory draws its outline
      svg: this.createSvg(rawData, projectionFn, () => projectionFn, width, height, showSphere, titleOf, fillTerritories, false),
      frames: [{ code: '*', projection: projectionFn, extent: [[0, 0], [width, height]] }],
    }
  }

  private async renderCustomComposite(options: CompositeRenderOptions): Promise<RenderedMap> {
    const { territoryMode, width, height, showSphere, titleOf, fillTerritories } = options

    if (!this.customComposite) {
      throw new Error('Custom composite projection not configured for this region')
    }

    const customComposite = this.customComposite
    const projectionFn = customComposite.build(width, height)

    this._lastProjection = projectionFn

    if (!projectionFn) {
      return { svg: D3MapRenderer.createSvgElement(width, height), frames: [] }
    }

    const subProjections = customComposite.getAllSubProjectionData()
    const rawData = await this.getRawDataForComposite(territoryMode, subProjections.map(({ territoryCode }) => territoryCode))

    const projectionOf: TerritoryProjection = feature =>
      customComposite.getSubProjectionData(feature.properties?.code)?.projection

    // One frame per active territory, in the order of the configuration. A territory without frame covers the
    // canvas: it goes under the framed ones, and the territories that share its projection need no other frame
    const framed = subProjections.filter(({ projection }) => projection.clipExtent?.())
    const unframed = subProjections
      .filter(({ projection }) => !projection.clipExtent?.())
      .filter(({ projection }, index, all) => all.findIndex(other => sameProjection(other.projection, projection)) === index)
    const frames = [...unframed, ...framed].map(({ territoryCode, projection }) => ({
      code: territoryCode,
      projection,
      extent: (projection.clipExtent?.() ?? [[0, 0], [width, height]]) as ProjectionFrame['extent'],
    }))

    return {
      svg: this.createSvg(rawData, projectionFn, projectionOf, width, height, showSphere, titleOf, fillTerritories),
      frames,
    }
  }
}
