import type { GeoProjection } from 'd3-geo'
import type { CompositeProjection } from '@/services/projection/composite-projection'
import type { CompositeRenderOptions, SimpleRenderOptions } from '@/services/rendering/cartographer-service'
import type { Territory, ViewMode } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'
import { GraticuleOverlayService } from '@/services/rendering/graticule-overlay-service'
import { MapOverlayService } from '@/services/rendering/map-overlay-service'

export interface CartographerLike {
  render: (options: SimpleRenderOptions | CompositeRenderOptions) => Promise<SVGSVGElement>
  customComposite?: any
  lastProjection?: GeoProjection | null
}

export interface SimpleMapConfig {
  geoData: GeoJSON.FeatureCollection
  projection: string
  width: number
  height: number
  area?: number
  preserveScale?: boolean
  showGraticule: boolean
  showSphere: boolean
  showCompositionBorders: boolean
  showMapLimits: boolean
}

export interface CompositeMapConfig {
  viewMode: ViewMode
  territoryMode: string
  selectedProjection: string
  compositeProjection?: string
  width: number
  height: number
  showGraticule: boolean
  showSphere: boolean
  showCompositionBorders: boolean
  showMapLimits: boolean
  territories?: Territory[]
}

export class MapRenderCoordinator {
  static async renderSimpleMap(
    cartographer: CartographerLike,
    config: SimpleMapConfig,
  ): Promise<SVGSVGElement> {
    const options: SimpleRenderOptions = {
      mode: 'simple',
      geoData: config.geoData,
      projection: config.projection,
      width: config.width,
      height: config.height,
      area: config.area,
      preserveScale: config.preserveScale,
      showGraticule: config.showGraticule,
      showSphere: config.showSphere,
      showCompositionBorders: config.showCompositionBorders,
      showMapLimits: config.showMapLimits,
    }

    return await cartographer.render(options)
  }

  static async renderCompositeMap(
    cartographer: CartographerLike,
    config: CompositeMapConfig,
  ): Promise<SVGSVGElement> {
    const mode = config.viewMode === 'composite-custom'
      ? 'composite-custom'
      : 'composite-projection'

    const territoryCodes = config.viewMode === 'built-in-composite'
      ? undefined
      : config.territories?.map(t => t.code)

    const projectionId = config.compositeProjection || config.selectedProjection

    const options: CompositeRenderOptions = {
      mode,
      territoryMode: config.territoryMode,
      territoryCodes,
      projection: projectionId,
      width: config.width,
      height: config.height,
      showGraticule: config.showGraticule,
      showSphere: config.showSphere,
      showCompositionBorders: config.showCompositionBorders,
      showMapLimits: config.showMapLimits,
    }

    return await cartographer.render(options)
  }

  static applyOverlays(
    svg: SVGSVGElement,
    viewMode: ViewMode | undefined,
    config: {
      showBorders: boolean
      showLimits: boolean
      width: number
      height: number
      customComposite?: any
      renderedProjection?: GeoProjection | null
      filteredTerritoryCodes?: Set<string>
    },
  ): void {
    MapOverlayService.applyOverlays(svg, {
      showBorders: config.showBorders,
      showLimits: config.showLimits,
      viewMode,
      width: config.width,
      height: config.height,
      customComposite: config.customComposite,
      renderedProjection: config.renderedProjection,
      filteredTerritoryCodes: config.filteredTerritoryCodes,
    })
  }

  static applyGraticuleOverlay(
    svg: SVGSVGElement,
    config: {
      showGraticule: boolean
      width: number
      height: number
      projection?: GeoProjection
      projectionId?: string
      viewMode?: ViewMode
      customComposite?: CompositeProjection | null
      effectiveScale?: number
      geoData?: GeoJSON.FeatureCollection | GeoJSON.Feature | { type: 'Sphere' }
      projectionParams?: ProjectionParameters
      showSphere?: boolean
      filteredTerritoryCodes?: Set<string>
    },
  ): void {
    if (!config.showGraticule) {
      return
    }

    GraticuleOverlayService.applyGraticuleOverlays(svg, {
      showGraticule: config.showGraticule,
      width: config.width,
      height: config.height,
      projection: config.projection as GeoProjection,
      projectionId: config.projectionId,
      viewMode: config.viewMode,
      customComposite: config.customComposite,
      effectiveScale: config.effectiveScale,
      geoData: config.geoData,
      projectionParams: config.projectionParams,
      showSphere: config.showSphere,
      filteredTerritoryCodes: config.filteredTerritoryCodes,
    })
  }
}
