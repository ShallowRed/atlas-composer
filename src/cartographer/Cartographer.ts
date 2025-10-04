import * as Plot from '@observablehq/plot'
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
  private settings: CartographerSettings = {
    scalePreservation: true,
    selectedProjection: 'albers-france',
    territoryMode: 'metropole-major',
    activeTab: 'vue-composite',
  }

  constructor() {
    this.projectionService = new GeoProjectionService()
    this.geoDataService = new RealGeoDataService()
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

  async renderVueComposite(container: HTMLElement): Promise<void> {
    console.log('Rendering Vue composite map...')

    if (!container) {
      console.error('Vue composite container is null')
      throw new Error('Container element is not available')
    }

    try {
      // Clear container
      container.innerHTML = ''

      // Get repositioned data with custom translations and scales (like the original unified map)
      const data = await this.geoDataService.getUnifiedData(
        this.settings.territoryMode,
        this.settings.territoryTranslations,
        this.settings.territoryScales,
      )
      if (!data) {
        throw new Error('No unified data available')
      }

      // Get projection (not composite for this view)
      const projection = this.projectionService.getProjection(
        this.settings.selectedProjection === 'albers-france' ? 'albers' : this.settings.selectedProjection,
        data.metropole,
      )

      // Create unified dataset from metropole + repositioned DOM-TOM
      const unifiedFeatures = [...data.metropole.features]
      data.domtom.forEach((territory: any) => {
        if (territory.repositionedGeometry?.features) {
          unifiedFeatures.push(...territory.repositionedGeometry.features)
        }
      })

      const unifiedCollection = {
        type: 'FeatureCollection' as const,
        features: unifiedFeatures,
      }

      // Create plot
      const plot = Plot.plot({
        width: 800,
        height: 600,
        inset: 20,
        projection,
        marks: [
          Plot.geo(unifiedCollection, {
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
      console.error('Error rendering Vue composite:', error)
      throw error
    }
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
}
