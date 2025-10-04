import * as Plot from '@observablehq/plot'
import { CustomCompositeProjection } from '../services/CustomCompositeProjection'
import { GeoDataService } from '../services/GeoDataService'
import { GeoProjectionService } from '../services/GeoProjectionService'
import {
  getTerritoryFillColor,
  getTerritoryStrokeColor,
} from '../utils/colorUtils'

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
  private projectionService: GeoProjectionService
  private geoDataService: GeoDataService
  public customComposite: CustomCompositeProjection

  constructor() {
    this.projectionService = new GeoProjectionService()
    this.geoDataService = new GeoDataService()
    this.customComposite = new CustomCompositeProjection()
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

  private renderSimple(options: SimpleRenderOptions): Plot.Plot {
    const { geoData, projection, width, height, inset } = options

    // Get projection function
    const projectionFn = this.projectionService.getProjection(projection, geoData)

    // Create plot
    const plot = Plot.plot({
      width,
      height,
      inset,
      projection: projectionFn,
      marks: [
        Plot.geo(geoData, {
          fill: (d: any) => {
            const code = d.properties?.code || d.properties?.INSEE_DEP || 'unknown'
            return getTerritoryFillColor(code)
          },
          stroke: getTerritoryStrokeColor(),
        }),
      ],
    })

    return plot
  }

  private async renderProjectionComposite(options: CompositeRenderOptions): Promise<Plot.Plot> {
    const { territoryMode, projection, width, height } = options

    // Get raw data (original coordinates)
    const rawData = await this.geoDataService.getRawUnifiedData(territoryMode)
    if (!rawData) {
      throw new Error('No raw unified data available')
    }

    // Use the selected composite projection
    const projectionFn = this.projectionService.getProjection(projection, rawData)

    // Create plot
    const plot = Plot.plot({
      width,
      height,
      inset: 20,
      projection: projectionFn,
      marks: [
        Plot.geo(rawData, {
          fill: (d: any) => {
            const code = d.properties?.code || d.properties?.INSEE_DEP || 'unknown'
            return getTerritoryFillColor(code)
          },
          stroke: getTerritoryStrokeColor(),
        }),
      ],
    })

    return plot
  }

  private async renderCustomComposite(options: CompositeRenderOptions): Promise<Plot.Plot> {
    const { territoryMode, width, height, settings } = options

    // Apply custom settings if provided
    if (settings) {
      this.applyCustomCompositeSettings(settings)
    }

    // Get raw data (original coordinates)
    const rawData = await this.geoDataService.getRawUnifiedData(territoryMode)
    if (!rawData) {
      throw new Error('No raw unified data available')
    }

    // Create plot with projection as a function
    const plot = Plot.plot({
      width,
      height,
      inset: 20,
      projection: ({ width: w, height: h }) => {
        return this.customComposite.build(w, h, true)
      },
      marks: [
        Plot.geo(rawData, {
          fill: (d: any) => {
            const code = d.properties?.code || d.properties?.INSEE_DEP || 'unknown'
            return getTerritoryFillColor(code)
          },
          stroke: getTerritoryStrokeColor(),
        }),
      ],
    })

    return plot
  }

  private applyCustomCompositeSettings(settings: CustomCompositeSettings): void {
    const { territoryProjections, territoryTranslations, territoryScales } = settings

    // Apply to customComposite instance
    if (territoryProjections) {
      for (const [code, proj] of Object.entries(territoryProjections)) {
        this.customComposite.updateTerritoryProjection(code, proj as any)
      }
    }

    if (territoryTranslations) {
      for (const [code, translation] of Object.entries(territoryTranslations)) {
        this.customComposite.updateTranslationOffset(code, [translation.x, translation.y])
      }
    }

    if (territoryScales) {
      for (const [code, scale] of Object.entries(territoryScales)) {
        this.customComposite.updateScale(code, scale)
      }
    }
  }
}
