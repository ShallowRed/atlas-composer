import type { GeoProjection } from 'd3-geo'
import type { ProjectionFrame } from '@/core/frames'
import type { GeoDataError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { EntryPaths, TerritoryBorders, TerritoryTitle } from '@/services/rendering/d3-map-renderer'
import type { GeoDataConfig } from '@/types'
import type { ProjectionParameterProvider, ProjectionParameters } from '@/types/projection-parameters'
import type { ActiveTerritoryProvider, EntryProvider } from '@/types/territory'
import { minWeightAt } from '@/core/geometry'
import { GeoDataService } from '@/services/data/geo-data-service'
import { CompositeProjection } from '@/services/projection/composite-projection'
import { ProjectionService } from '@/services/projection/projection-service'
import { D3MapRenderer } from '@/services/rendering/d3-map-renderer'
import { createTerritoryCode } from '@/types/branded'
import { isConicProjection } from '@/types/d3-geo-extended'
import { logger } from '@/utils/logger'

const debug = logger.render.cartographer

// The projection whose scale simplifies a territory, or undefined when the territory has none
type TerritoryProjection = (feature: GeoJSON.Feature) => GeoProjection | undefined

// What the paths of an entry depend on: its projection and the parameters applied to it, the simplified topology and the codes of the layer
export interface EntryPathsKey {
  projectionId: string | undefined
  parameters: string
  topology: object
  codes: string
}

export function samePathsKey(a: EntryPathsKey, b: EntryPathsKey): boolean {
  return a.projectionId === b.projectionId && a.parameters === b.parameters && a.topology === b.topology && a.codes === b.codes
}

// The parameters that d3 applies, each absent value written as null
function appliedParameters(projection: GeoProjection): string {
  const parallels = isConicProjection(projection) ? projection.parallels() : null
  return JSON.stringify([
    projection.center(),
    projection.rotate(),
    parallels,
    projection.scale(),
    projection.translate(),
    projection.clipExtent() ?? null,
    projection.clipAngle() ?? null,
    projection.precision(),
  ])
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

// The providers that the custom composite reads at each build
export interface CustomCompositeSetup {
  entryProvider: EntryProvider
  parameterProvider: ProjectionParameterProvider
  activeTerritoryProvider: ActiveTerritoryProvider
  referenceScale?: number
}

export class Cartographer {
  private projectionService: ProjectionService
  private geoDataService: GeoDataService
  public customComposite: CompositeProjection | null = null

  private _lastProjection: GeoProjection | null = null
  private parameterProvider: ProjectionParameterProvider | null = null
  // The paths of each entry of the custom composite at its last render, with the key that gave them
  private entryPaths = new Map<string, { key: EntryPathsKey, paths: EntryPaths }>()

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
    this.entryPaths.clear()
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

  rebuildCompositeProjection({ entryProvider, parameterProvider, activeTerritoryProvider, referenceScale }: CustomCompositeSetup): void {
    this.customComposite = new CompositeProjection(entryProvider, parameterProvider, activeTerritoryProvider, referenceScale)
    this.parameterProvider = parameterProvider
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
    width: number,
    height: number,
    showSphere = false,
    titleOf?: TerritoryTitle,
    fillTerritories = true,
    meshBorders = true,
  ): SVGSVGElement {
    const svg = this.createSphereSvg(projection, width, height, showSphere)
    const { territories, mesh } = this.simplify(data, () => projection)
    D3MapRenderer.renderTerritories(svg, territories, projection, {
      enableTooltips: true,
      bordersOf: meshBorders ? mesh : undefined,
      titleOf,
      fillTerritories,
    })
    return svg
  }

  private createSphereSvg(projection: GeoProjection, width: number, height: number, showSphere: boolean): SVGSVGElement {
    const svg = D3MapRenderer.createSvgElement(width, height)
    if (showSphere) {
      D3MapRenderer.renderSphere(svg, projection)
    }
    return svg
  }

  // Each territory simplified to the scale of the projection that draws it, at its centroid, and the meshes of their borders
  // The source is the simplified topology, or the collection drawn as given
  private simplify(data: GeoJSON.FeatureCollection, projectionOf: TerritoryProjection): { territories: GeoJSON.FeatureCollection, mesh?: TerritoryBorders, source: object } {
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
      return { territories: data, source: data }
    }
    const simplified = this.geoDataService.simplified(minWeights)
    return {
      territories: {
        type: 'FeatureCollection',
        features: data.features.map(feature => simplified.feature(feature.properties?.code) ?? feature),
      },
      mesh: simplified.mesh,
      source: simplified,
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
      svg: this.createSvg(geoData, projectionFn, width, height, showSphere, titleOf, fillTerritories),
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
      svg: this.createSvg(rawData, projectionFn, width, height, showSphere, titleOf, fillTerritories, false),
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

    // One frame per active territory, in the order of the configuration
    const frames = subProjections.map(({ territoryCode, projection }) => ({
      code: territoryCode,
      projection,
      extent: (projection.clipExtent?.() ?? [[0, 0], [width, height]]) as ProjectionFrame['extent'],
    }))

    // Each territory keeps the simplification at the scale of its own entry, in the frames of the other entries too
    const { territories, mesh, source } = this.simplify(rawData, feature => customComposite.getSubProjectionData(feature.properties?.code)?.projection)
    const codes = JSON.stringify(territories.features.map(feature => feature.properties?.code ?? null))
    const entries = frames.map(({ code, projection }) => {
      const key: EntryPathsKey = {
        projectionId: this.parameterProvider?.getEffectiveParameters(createTerritoryCode(code)).projectionId,
        parameters: appliedParameters(projection),
        topology: source,
        codes,
      }
      return { code, paths: this.pathsOfEntry(code, projection, territories, mesh, key) }
    })
    // An entry that leaves the composition leaves the memory of the paths
    for (const code of this.entryPaths.keys()) {
      if (!frames.some(frame => frame.code === code)) {
        this.entryPaths.delete(code)
      }
    }
    const svg = this.createSphereSvg(projectionFn, width, height, showSphere ?? false)
    D3MapRenderer.renderEntries(svg, territories, entries, { enableTooltips: true, titleOf, fillTerritories })

    return { svg, frames }
  }

  // The paths of the last render of an entry when their key is the same, computed otherwise
  private pathsOfEntry(code: string, projection: GeoProjection, territories: GeoJSON.FeatureCollection, mesh: TerritoryBorders | undefined, key: EntryPathsKey): EntryPaths {
    const kept = this.entryPaths.get(code)
    if (kept && samePathsKey(kept.key, key)) {
      return kept.paths
    }
    const paths = D3MapRenderer.entryPaths(territories, projection, mesh)
    this.entryPaths.set(code, { key, paths })
    return paths
  }
}
