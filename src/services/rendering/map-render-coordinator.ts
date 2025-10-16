import type * as Plot from '@observablehq/plot'
import type { CompositeRenderOptions, SimpleRenderOptions } from '@/services/rendering/cartographer-service'
import { CompositeSettingsBuilder } from '@/services/rendering/composite-settings-builder'
import { InsetCalculator } from '@/services/rendering/inset-calculator'
import { MapOverlayService } from '@/services/rendering/map-overlay-service'

/**
 * Territory type from store (simplified version)
 */
export interface Territory {
  name: string
  code: string
  area: number
  region: string
  data: GeoJSON.FeatureCollection
}

/**
 * Minimal cartographer interface for rendering
 * Accepts what the store provides (simplified interface)
 */
export interface CartographerLike {
  render: (options: SimpleRenderOptions | CompositeRenderOptions) => Promise<Plot.Plot>
  customComposite?: any
}

/**
 * Configuration for simple map rendering
 */
export interface SimpleMapConfig {
  geoData: GeoJSON.FeatureCollection
  projection: string
  width: number
  height: number
  inset: number
  isMainland?: boolean
  area?: number
  preserveScale?: boolean
  showGraticule: boolean
  showSphere: boolean
  showCompositionBorders: boolean
  showMapLimits: boolean
}

/**
 * Configuration for composite map rendering
 */
export interface CompositeMapConfig {
  viewMode: 'composite-custom' | 'composite-existing' | 'individual'
  projectionMode: 'uniform' | 'individual'
  territoryMode: string
  selectedProjection: string
  compositeProjection?: string
  width: number
  height: number
  showGraticule: boolean
  showSphere: boolean
  showCompositionBorders: boolean
  showMapLimits: boolean
  // For composite-custom mode
  currentAtlasConfig?: any
  territoryProjections?: Record<string, string>
  territoryTranslations?: Record<string, { x: number, y: number }>
  territoryScales?: Record<string, number>
  filteredTerritories?: Territory[]
}

/**
 * MapRenderCoordinator
 *
 * Coordinates map rendering by:
 * - Building render options from configuration
 * - Orchestrating cartographer calls
 * - Applying overlays to rendered maps
 *
 * Extracts all rendering logic from components
 */
export class MapRenderCoordinator {
  /**
   * Render a simple territory map
   */
  static async renderSimpleMap(
    cartographer: CartographerLike,
    config: SimpleMapConfig,
  ): Promise<Plot.Plot> {
    const options: SimpleRenderOptions = {
      mode: 'simple',
      geoData: config.geoData,
      projection: config.projection,
      width: config.width,
      height: config.height,
      inset: config.inset,
      isMainland: config.isMainland,
      area: config.area,
      preserveScale: config.preserveScale,
      showGraticule: config.showGraticule,
      showSphere: config.showSphere,
      showCompositionBorders: config.showCompositionBorders,
      showMapLimits: config.showMapLimits,
    }

    return await cartographer.render(options)
  }

  /**
   * Render a composite map (custom or existing projection)
   */
  static async renderCompositeMap(
    cartographer: CartographerLike,
    config: CompositeMapConfig,
  ): Promise<Plot.Plot> {
    // Build custom settings if in custom mode
    let customSettings
    if (config.viewMode === 'composite-custom') {
      const compositeConfig = config.currentAtlasConfig?.compositeProjectionConfig

      customSettings = CompositeSettingsBuilder.buildSettings(
        compositeConfig,
        config.projectionMode,
        config.selectedProjection,
        config.territoryProjections || {},
        config.territoryTranslations || {},
        config.territoryScales || {},
      )
    }

    // Determine rendering mode
    const mode = config.viewMode === 'composite-custom'
      ? 'composite-custom'
      : 'composite-projection'

    // Get territory codes
    // For composite-existing mode, territories may not be loaded, use undefined
    // For composite-custom mode, use filtered territories
    const territoryCodes = config.viewMode === 'composite-existing'
      ? undefined
      : config.filteredTerritories?.map(t => t.code)

    const projectionId = config.compositeProjection || config.selectedProjection

    const options: CompositeRenderOptions = {
      mode,
      territoryMode: config.territoryMode,
      territoryCodes,
      projection: projectionId,
      width: config.width,
      height: config.height,
      settings: customSettings,
      showGraticule: config.showGraticule,
      showSphere: config.showSphere,
      showCompositionBorders: config.showCompositionBorders,
      showMapLimits: config.showMapLimits,
    }

    return await cartographer.render(options)
  }

  /**
   * Apply overlays to a rendered SVG map
   */
  static applyOverlays(
    svg: SVGSVGElement,
    viewMode: 'composite-custom' | 'composite-existing' | 'individual',
    config: {
      showBorders: boolean
      showLimits: boolean
      projectionId: string
      width: number
      height: number
      customComposite?: any
      isMainland?: boolean
    },
  ): void {
    // Calculate inset to match the rendering inset
    const inset = InsetCalculator.calculateInset(viewMode, config.isMainland)

    MapOverlayService.applyOverlays(svg, {
      showBorders: config.showBorders,
      showLimits: config.showLimits,
      viewMode,
      projectionId: config.projectionId,
      width: config.width,
      height: config.height,
      customComposite: config.customComposite,
      inset,
      isMainland: config.isMainland,
    })
  }
}
