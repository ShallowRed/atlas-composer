import * as Plot from '@observablehq/plot'
import { CustomCompositeProjection } from '../services/CustomCompositeProjection'
import { GeoDataService } from '../services/GeoDataService'
import { GeoProjectionService } from '../services/GeoProjectionService'
import {
  getTerritoryFillColor,
  getTerritoryStrokeColor,
} from '../utils/colorUtils'

export interface CartographerSettings {
  scalePreservation: boolean
  selectedProjection: string
  territoryMode: string
  territoryTranslations?: Record<string, { x: number, y: number }>
  territoryScales?: Record<string, number>
}

export class Cartographer {
  private projectionService: GeoProjectionService
  private geoDataService: GeoDataService
  public customComposite: CustomCompositeProjection
  private settings: CartographerSettings = {
    scalePreservation: true,
    selectedProjection: 'albers-france',
    territoryMode: 'metropole-major',
  }

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

  updateSettings(newSettings: Partial<CartographerSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
  }

  async renderProjectionComposite(container: HTMLElement): Promise<void> {
    if (!container) {
      console.error('Container element is not available for projection composite rendering')
      return
    }

    try {
      // Clear container
      container.innerHTML = ''

      // Get raw data (original coordinates)
      const rawData = await this.geoDataService.getRawUnifiedData(this.settings.territoryMode)
      if (!rawData) {
        throw new Error('No raw unified data available')
      }

      // Use the selected composite projection (albers-france or conic-conformal-france)
      const projection = this.projectionService.getProjection(this.settings.selectedProjection, rawData)

      // Create plot
      const plot = Plot.plot({
        width: 800,
        height: 600,
        inset: 20,
        projection,
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

      container.appendChild(plot)
    }
    catch (error) {
      console.error('Error rendering projection composite:', error)
      throw error
    }
  }

  async renderCustomComposite(container: HTMLElement): Promise<void> {
    if (!container) {
      console.error('Container element is not available for custom composite rendering')
      return
    }

    try {
      // Clear container
      container.innerHTML = ''

      // Get raw data (original coordinates)
      const rawData = await this.geoDataService.getRawUnifiedData(this.settings.territoryMode)
      if (!rawData) {
        throw new Error('No raw unified data available')
      }

      // Create plot with projection as a function (Observable Plot expects this)
      const plot = Plot.plot({
        width: 800,
        height: 600,
        inset: 20,
        projection: ({ width, height }) => {
          return this.customComposite.build(width, height, true)
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

      container.appendChild(plot)
    }
    catch (error) {
      console.error('Error rendering custom composite:', error)
      throw error
    }
  }
}
