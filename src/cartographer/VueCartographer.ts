import * as Plot from '@observablehq/plot'
import { GeoProjectionService } from '../services/GeoProjectionService'
import { RealGeoDataService } from '../services/GeoDataService'

export interface CartographerSettings {
  scalePreservation: boolean
  selectedProjection: string
  territoryMode: string
  activeTab: string
}

export class VueCartographer {
  private projectionService: GeoProjectionService
  private geoDataService: RealGeoDataService
  private settings: CartographerSettings = {
    scalePreservation: true,
    selectedProjection: 'albers-france',
    territoryMode: 'metropole-major',
    activeTab: 'vue-composite'
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
    } catch (error) {
      console.error('Cartographer initialization error:', error)
      throw error
    }
  }

  updateSettings(newSettings: Partial<CartographerSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
  }

  async renderVueComposite(container: HTMLElement): Promise<void> {
    console.log('Rendering Vue composite map...')
    
    try {
      // Clear container
      container.innerHTML = ''
      
      // Get repositioned data (like the original unified map)
      const data = await this.geoDataService.getUnifiedData(this.settings.territoryMode)
      if (!data) {
        throw new Error('No unified data available')
      }

      // Get projection (not composite for this view)
      const projection = this.projectionService.getProjection(
        this.settings.selectedProjection === 'albers-france' ? 'albers' : this.settings.selectedProjection, 
        data.metropole
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
        features: unifiedFeatures
      }

      // Create plot
      const plot = Plot.plot({
        width: 800,
        height: 600,
        projection: projection,
        marks: [
          Plot.geo(unifiedCollection, {
            fill: (d: any) => {
              const code = d.properties?.code || d.properties?.INSEE_DEP || 'unknown'
              return this.getTerritoryColor(code)
            },
            stroke: '#94a3b8',
            strokeWidth: 0.3
          }),
          Plot.frame({ opacity: 0.2 })
        ]
      })

      container.appendChild(plot)
    } catch (error) {
      console.error('Error rendering Vue composite:', error)
      throw error
    }
  }

  async renderProjectionComposite(container: HTMLElement): Promise<void> {
    console.log('Rendering projection composite map...')
    
    try {
      // Clear container
      container.innerHTML = ''
      
      // Get raw data (original coordinates)
      const rawData = await this.geoDataService.getRawUnifiedData(this.settings.territoryMode)
      if (!rawData) {
        throw new Error('No raw unified data available')
      }

      // ALWAYS use the composite geoAlbersFrance projection
      const projection = this.projectionService.getProjection('albers-france', rawData)

      // Create plot
      const plot = Plot.plot({
        width: 800,
        height: 600,
        projection: projection,
        marks: [
          Plot.geo(rawData, {
            fill: (d: any) => {
              const code = d.properties?.code || d.properties?.INSEE_DEP || 'unknown'
              return this.getTerritoryColor(code)
            },
            stroke: '#94a3b8',
            strokeWidth: 0.3
          }),
          Plot.frame({ stroke: '#e2e8f0', strokeWidth: 1 })
        ]
      })

      container.appendChild(plot)
    } catch (error) {
      console.error('Error rendering projection composite:', error)
      throw error
    }
  }

  async renderIndividualTerritories(container: HTMLElement): Promise<void> {
    
    try {
      // Get metropolitan France data
      const metropoleData = await this.geoDataService.getMetropoleData()
      if (!metropoleData) {
        throw new Error('No metropolitan France data available')
      }

      // Get DOM-TOM data (same method as original cartographer)
      const domtomData = await this.geoDataService.getDOMTOMData()
      
      if (!domtomData || !Array.isArray(domtomData)) {
        console.error('Invalid DOM-TOM data:', domtomData)
        throw new Error('No DOM-TOM data available')
      }

      // Filter DOM-TOM territories based on selected mode
      let filteredDomtom: any[] = []
      
      switch (this.settings.territoryMode) {
        case 'metropole-only':
          filteredDomtom = []
          break
        case 'metropole-major':
          filteredDomtom = domtomData.filter(territory => 
            territory && territory.code && ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT'].includes(territory.code)
          )
          break
        case 'metropole-uncommon':
          filteredDomtom = domtomData.filter(territory => 
            territory && territory.code && ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT', 'FR-MF', 'FR-PF', 'FR-NC'].includes(territory.code)
          )
          break
        case 'all-territories':
        default:
          filteredDomtom = domtomData.filter(territory => 
            territory && territory.code && ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT', 'FR-MF', 'FR-PF', 'FR-NC', 'FR-TF', 'FR-WF', 'FR-PM'].includes(territory.code)
          )
          break
      }

      // The container ref is on the Metropolitan France section, so we need to navigate up to find both sections
      const parentContainer = container.closest('.tab-content')
      
      // Find the metropolitan France container 
      const metroMapContainer = parentContainer?.querySelector('.flex.flex-row.gap-12 > div:first-child .map-plot')
      
      if (metroMapContainer) {
        // Clear and render metropolitan France
        metroMapContainer.innerHTML = ''
        
        // Use specialized projection for metropolitan France (like original)
        const metroProjection = this.settings.selectedProjection === 'albers' 
          ? {
              type: 'conic-conformal' as const,
              parallels: [45.898889, 47.696014] as [number, number],
              rotate: [-3, 0] as [number, number],
              domain: metropoleData
            }
          : this.projectionService.getProjection(this.settings.selectedProjection, metropoleData)

        const metroPlot = Plot.plot({
          width: 500,
          height: 400,
          projection: metroProjection,
          marks: [
            Plot.geo(metropoleData, {
              fill: '#e8f5e8',
              stroke: '#2d5a2d',
              strokeWidth: 1.2
            }),
            Plot.frame({ stroke: '#333', strokeWidth: 1 })
          ]
        })
        metroMapContainer.appendChild(metroPlot)
      }

      // Find the DOM-TOM container within the template  
      const domtomMapContainer = parentContainer?.querySelector('.flex.flex-row.gap-12 > div:last-child .map-plot')
      
      if (domtomMapContainer) {
        // Clear the container
        domtomMapContainer.innerHTML = ''
        
        if (filteredDomtom.length > 0) {
          // Create grid container like the original implementation
          const gridContainer = document.createElement('div')
          gridContainer.className = 'domtom-grid'
          gridContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            width: 100%;
          `

          // Group territories by region (like original)
          const territoryGroups = new Map<string, any[]>()
          for (const territory of filteredDomtom) {
            const region = territory.region || 'Other'
            if (!territoryGroups.has(region)) {
              territoryGroups.set(region, [])
            }
            territoryGroups.get(region)!.push(territory)
          }

          // Render by region groups
          for (const [region, territories] of territoryGroups) {
            const regionContainer = document.createElement('div')
            regionContainer.className = 'region-container mb-6'
            
            const regionTitle = document.createElement('h3')
            regionTitle.textContent = region
            regionTitle.className = 'text-lg font-semibold mb-4 text-gray-700'
            regionContainer.appendChild(regionTitle)
            
            for (const territory of territories) {
              const territoryContainer = document.createElement('div')
              territoryContainer.className = 'territory-container text-center mb-4'
              
              const title = document.createElement('h4')
              title.textContent = `${territory.name} (${territory.area.toLocaleString()} km²)`
              title.className = 'font-medium mb-2 text-sm text-gray-600'
              
              const mapDiv = document.createElement('div')
              
              // Use territory.data (GeoJSON.FeatureCollection) like the original
              const projection = this.projectionService.getProjection(this.settings.selectedProjection, territory.data)
              
              // Calculate size with scale preservation logic from original
              const { width, height } = this.getTerritorySize(territory, true)
              
              const plot = Plot.plot({
                width,
                height,
                projection,
                marks: [
                  Plot.geo(territory.data, {
                    fill: this.getRegionColor(territory.region),
                    stroke: '#2d4a2d',
                    strokeWidth: 0.8
                  }),
                  Plot.frame({ stroke: '#333' })
                ]
              })

              territoryContainer.appendChild(title)
              territoryContainer.appendChild(mapDiv)
              mapDiv.appendChild(plot)
              regionContainer.appendChild(territoryContainer)
            }
            
            gridContainer.appendChild(regionContainer)
          }

          domtomMapContainer.appendChild(gridContainer)
        } else {
          // Show a message when no DOM-TOM territories are available
          const messageDiv = document.createElement('div')
          messageDiv.className = 'text-center p-4 text-gray-500'
          messageDiv.innerHTML = `
            <p>Aucun territoire d'outre-mer disponible.</p>
            <p class="text-sm mt-2">Mode: ${this.settings.territoryMode}</p>
            <p class="text-sm">Vérifiez les données ou changez le mode de sélection des territoires.</p>
          `
          domtomMapContainer.appendChild(messageDiv)
        }
      }

    } catch (error) {
      console.error('Error rendering individual territories:', error)
      throw error
    }
  }

  private getTerritoryColor(code: string): string {
    // More subtle, muted color mapping for different territories
    const colors: { [key: string]: string } = {
      'FR-GF': '#86efac', // Guyane - Light green
      'FR-GP': '#fbbf24', // Guadeloupe - Soft orange
      'FR-MQ': '#fca5a5', // Martinique - Light red
      'FR-RE': '#c4b5fd', // Réunion - Light purple
      'FR-YT': '#67e8f9', // Mayotte - Light cyan
      'FR-MF': '#fdba74', // Saint-Martin - Light orange variant
      'FR-PF': '#bef264', // Polynésie française - Light lime
      'FR-NC': '#a5b4fc', // Nouvelle-Calédonie - Light indigo
      'FR-TF': '#5eead4', // Terres australes - Light teal
      'FR-WF': '#f9a8d4', // Wallis-et-Futuna - Light pink
      'FR-PM': '#d8b4fe', // Saint-Pierre-et-Miquelon - Light purple variant
      'metropole': '#93c5fd' // Metropolitan France - Light blue
    }

    return colors[code] || colors['metropole'] || '#cbd5e1'
  }

  /**
   * Calculate appropriate size for each territory map, optionally preserving scale
   * From original FranceCartographer
   */
  private getTerritorySize(territory: any, preserveScale: boolean): { width: number; height: number } {
    if (!preserveScale) {
      // Standard size for all territories (more readable)
      return { width: 200, height: 160 }
    }

    // With scale preservation: size proportional to area
    const franceMetropoleArea = 550000 // Approximate area of metropolitan France in km²
    const territoryArea = territory.area || 1000
    
    // Calculate scale factor based on square root of area
    const scaleFactor = Math.sqrt(territoryArea / franceMetropoleArea)
    
    // Base size for metropolitan France
    const baseWidth = 500
    const baseHeight = 400
    
    // Calculate proportional dimensions with min/max limits
    const proportionalWidth = Math.max(50, Math.min(300, baseWidth * scaleFactor))
    const proportionalHeight = Math.max(40, Math.min(240, baseHeight * scaleFactor))
    
    return { 
      width: Math.round(proportionalWidth), 
      height: Math.round(proportionalHeight) 
    }
  }

  /**
   * Get color for a region
   * From original FranceCartographer
   */
  private getRegionColor(region: string): string {
    const regionColors = {
      'North America': '#f8e8ff',
      'Caribbean': '#e8ffe8', 
      'Pacific Ocean': '#fff8e8',
      'Indian Ocean': '#e8e8ff',
      'Other': '#f0f0f0'
    }
    return regionColors[region as keyof typeof regionColors] || '#f0f0f0'
  }
}