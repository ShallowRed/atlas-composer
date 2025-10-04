import * as Plot from '@observablehq/plot'
import { CustomCompositeProjection } from '../services/CustomCompositeProjection'
import { RealGeoDataService } from '../services/GeoDataService'
import { GeoProjectionService } from '../services/GeoProjectionService'
import {
  getDefaultStrokeColor,
  getTerritoryColor,
} from '../utils/colorUtils'

export interface CartographerSettings {
  scalePreservation: boolean
  selectedProjection: string
  territoryMode: string
  activeTab: string
  territoryTranslations?: Record<string, { x: number, y: number }>
  territoryScales?: Record<string, number>
}

export class Cartographer {
  private projectionService: GeoProjectionService
  private geoDataService: RealGeoDataService
  private customComposite: CustomCompositeProjection
  private settings: CartographerSettings = {
    scalePreservation: true,
    selectedProjection: 'albers-france',
    territoryMode: 'metropole-major',
    activeTab: 'vue-composite',
  }

  constructor() {
    this.projectionService = new GeoProjectionService()
    this.geoDataService = new RealGeoDataService()
    this.customComposite = new CustomCompositeProjection()
  }

  async init(): Promise<void> {
    console.log('Initializing Vue cartographer...')

    try {
      await this.geoDataService.loadData()
      this.geoDataService.getTerritoryInfo()
      console.log('Vue cartographer initialized successfully')
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
    console.log('Rendering projection composite map...')

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
              return getTerritoryColor(code)
            },
            stroke: getDefaultStrokeColor(),
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
    console.log('Rendering custom composite map...')

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

      // Build custom composite projection
      const projection = this.customComposite.build(800, 600)

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
              return getTerritoryColor(code)
            },
            stroke: getDefaultStrokeColor(),
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

  // Proxy methods for CustomCompositeProjection

  updateTerritoryProjection(territoryCode: string, projectionType: string): void {
    this.customComposite.updateTerritoryProjection(territoryCode, projectionType)
  }

  updateTerritoryTranslationOffset(territoryCode: string, offset: [number, number]): void {
    this.customComposite.updateTranslationOffset(territoryCode, offset)
  }

  updateTerritoryScale(territoryCode: string, scaleFactor: number): void {
    this.customComposite.updateScale(territoryCode, scaleFactor)
  }

  getCompositionBorders(width: number, height: number) {
    return this.customComposite.getCompositionBorders(width, height)
  }

  exportCustomCompositeConfig() {
    return this.customComposite.exportConfig()
  }
}
