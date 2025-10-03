import * as Plot from '@observablehq/plot'
import { GeoProjectionService } from '../services/GeoProjectionService'
import { RealGeoDataService } from '../services/GeoDataService'
import * as d3 from 'd3'

export class FranceCartographer {
  private projectionService: GeoProjectionService
  private geoDataService: RealGeoDataService
  private scalePreservation: boolean = true

  constructor() {
    this.projectionService = new GeoProjectionService()
    this.geoDataService = new RealGeoDataService()
  }

  async init() {
    console.log('Initializing France cartographer...')
    
    try {
      await this.geoDataService.loadData()
      
      this.geoDataService.getTerritoryInfo()
      
      this.setupControls()

      await this.renderMaps()
      
      console.log('France cartographer initialized successfully')
      
    } catch (error) {
      console.error('Cartographer initialization error:', error)
      this.showError(error)
    }
  }

  private showError(error: unknown) {
    const appContainer = document.getElementById('app')
    if (!appContainer) return
    
    const errorDiv = document.createElement('div')
    errorDiv.style.cssText = 'background: #ffe6e6; border: 1px solid #ff6b6b; padding: 20px; margin: 20px; border-radius: 8px; color: #d63031;'
    errorDiv.innerHTML = `
      <h3>Data Loading Error</h3>
      <p>Unable to load geographic data.</p>
      <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
      <p><strong>Solution:</strong> Run the data preparation script: <code>pnpm run prepare-data</code></p>
    `
    appContainer.insertBefore(errorDiv, appContainer.firstChild)
  }

  /**
   * Initialize UI controls and event listeners
   */
  private setupControls() {
    const projectionSelect = document.getElementById('projection-select') as HTMLSelectElement
    const scalePreservationCheck = document.getElementById('scale-preservation') as HTMLInputElement
    const unifiedViewModeSelect = document.getElementById('unified-view-mode') as HTMLSelectElement

    projectionSelect?.addEventListener('change', () => this.renderMaps())
    
    scalePreservationCheck?.addEventListener('change', (event) => {
      this.scalePreservation = (event.target as HTMLInputElement).checked
      this.renderMaps()
    })

    unifiedViewModeSelect?.addEventListener('change', () => {
      const projectionType = projectionSelect?.value || 'albers'
      this.renderUnifiedMap(projectionType)
    })

    // Tab functionality
    this.setupTabs()
  }

  /**
   * Initialize tab navigation functionality
   */
  private setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button')
    const tabPanels = document.querySelectorAll('.tab-panel')
    const compositeOnlyControls = document.querySelectorAll('.composite-only')

    tabButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const target = event.target as HTMLButtonElement
        const tabId = target.dataset.tab

        // Update active button
        tabButtons.forEach(btn => btn.classList.remove('active'))
        target.classList.add('active')

        // Update active panel
        tabPanels.forEach(panel => panel.classList.remove('active'))
        const activePanel = document.getElementById(`${tabId}-view`)
        activePanel?.classList.add('active')

        // Show/hide composite-only controls
        compositeOnlyControls.forEach(control => {
          if (tabId === 'composite') {
            (control as HTMLElement).style.display = 'block'
          } else {
            (control as HTMLElement).style.display = 'none'
          }
        })

        // Re-render maps when switching tabs to ensure proper sizing
        this.renderMaps()
      })
    })
  }

  /**
   * Render all maps: Métropole, DOM-TOM grid, and unified view
   */
  private async renderMaps() {
    const projectionType = (document.getElementById('projection-select') as HTMLSelectElement)?.value || 'albers'
    
    try {
      await Promise.all([
        this.renderMetropoleFranceMap(projectionType),
        this.renderDOMTOMMap(projectionType),
        this.renderUnifiedMap(projectionType)
      ])
      
    } catch (error) {
      console.error('Map rendering error:', error)
    }
  }

  /**
   * Render the map of Metropolitan France with a specialized projection
   */
  private async renderMetropoleFranceMap(projectionType: string) {
    const container = document.querySelector('#france-metropole .map-plot')
    if (!container) return

    const franceData = await this.geoDataService.getMetropoleData()
    if (!franceData) return

    // Pour la France métropolitaine, utiliser une projection spécialisée
    const projection = projectionType === 'albers' 
      ? {
          type: 'conic-conformal' as const,
          parallels: [45.898889, 47.696014] as [number, number], // Parallèles standards pour la France
          rotate: [-3, 0] as [number, number], // Centré sur la France
          domain: franceData
        }
      : this.projectionService.getProjection(projectionType, franceData)
    
    const plot = Plot.plot({
      width: 500,
      height: 400,
      projection,
      marks: [
        Plot.geo(franceData, {
          fill: '#e8f5e8',
          stroke: '#2d5a2d',
          strokeWidth: 1.2
        }),
        Plot.frame({stroke: '#333', strokeWidth: 1})
      ]
    })

    container.innerHTML = ''
    container.appendChild(plot)
  }

  /**
   * Render the DOM-TOM territories in a grid layout with individual maps
   */
  private async renderDOMTOMMap(projectionType: string) {
    const container = document.querySelector('#dom-tom .map-plot')
    if (!container) return

    const domtomData = await this.geoDataService.getDOMTOMData()
    if (!domtomData || domtomData.length === 0) return

    const gridContainer = document.createElement('div')
    gridContainer.className = 'domtom-grid'

    const territoryGroups = new Map<string, any[]>()
    for (const territory of domtomData) {
      const region = territory.region || 'Other'
      if (!territoryGroups.has(region)) {
        territoryGroups.set(region, [])
      }
      territoryGroups.get(region)!.push(territory)
    }

    for (const [region, territories] of territoryGroups) {
      const regionContainer = document.createElement('div')
      regionContainer.className = 'region-container'
      
      const regionTitle = document.createElement('h3')
      regionTitle.textContent = region
      regionTitle.className = 'region-title'
      regionContainer.appendChild(regionTitle)
      
      for (const territory of territories) {
        const territoryContainer = document.createElement('div')
        territoryContainer.className = 'territory-container'
        
        const title = document.createElement('h4')
        title.textContent = `${territory.name} (${territory.area.toLocaleString()} km²)`
        title.className = 'territory-title'
        
        const mapDiv = document.createElement('div')
        const projection = this.projectionService.getProjection(projectionType, territory.data)
        const { width, height } = this.getTerritorySize(territory, this.scalePreservation)
        
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
            Plot.frame({stroke: '#333'})
          ]
        })

        territoryContainer.appendChild(title)
        territoryContainer.appendChild(mapDiv)
        mapDiv.appendChild(plot)
        regionContainer.appendChild(territoryContainer)
      }
      
      gridContainer.appendChild(regionContainer)
    }

    container.innerHTML = ''
    container.appendChild(gridContainer)
  }

  /**
   * Calculate appropriate size for each territory map, optionally preserving scale
   */
  private getTerritorySize(territory: any, preserveScale: boolean): { width: number; height: number } {
    if (!preserveScale) {
      // Taille standard pour tous les territoires (plus lisible)
      return { width: 200, height: 160 }
    }

    // Avec préservation d'échelle : taille proportionnelle à la superficie
    // Use a reasonable reference area for metropolitan France (will be calculated dynamically)
    const franceMetropoleArea = 550000 // Approximate area of metropolitan France in km²
    const territoryArea = territory.area || 1000
    
    // Calculer un facteur d'échelle basé sur la racine carrée de la superficie
    // (car l'aire est en 2D, nous voulons ajuster les dimensions linéaires)
    const scaleFactor = Math.sqrt(territoryArea / franceMetropoleArea)
    
    // Taille de base pour la France métropolitaine
    const baseWidth = 500
    const baseHeight = 400
    
    // Calculer les dimensions proportionnelles avec des limites min/max
    const proportionalWidth = Math.max(50, Math.min(300, baseWidth * scaleFactor))
    const proportionalHeight = Math.max(40, Math.min(240, baseHeight * scaleFactor))
    
    return { 
      width: Math.round(proportionalWidth), 
      height: Math.round(proportionalHeight) 
    }
  }

  /**
   * Get color for a region
   */
  private getRegionColor(region: string): string {
    const regionColors = {
      'Antilles': '#e8f5e8',
      'Amérique du Sud': '#ffe8e8', 
      'Océan Indien': '#e8e8ff',
      'Océan Pacifique': '#fff8e8',
      'Amérique du Nord': '#f8e8ff'
    }
    return regionColors[region as keyof typeof regionColors] || '#f0f0f0'
  }

  /**
   * Get color for a territory
   */
  private getTerritoryColor(code: string): string {
    const territoryColors = {
      'FR-GF': '#FFE8CC', 'FR-RE': '#E8F4FF', 'FR-GP': '#E8FFE8', 
      'FR-MQ': '#FFE8F4', 'FR-YT': '#F4E8FF', 'FR-MF': '#FFF8E8',
      'FR-PF': '#E8FFFF', 'FR-NC': '#FFFFE8', 'FR-TF': '#F0F0F0',
      'FR-WF': '#F8F8E8', 'FR-PM': '#E8F8F8'
    }
    return territoryColors[code as keyof typeof territoryColors] || '#ffe8e8'
  }

  /**
   * Render a unified map with all territories repositioned
   */
  private async renderUnifiedMap(projectionType: string) {
    const container = document.querySelector('#unified-plot')
    if (!container) return

    // Obtenir le mode de vue d'ensemble sélectionné
    const unifiedViewMode = (document.getElementById('unified-view-mode') as HTMLSelectElement)?.value || 'metropole-major'
    
    // Cette méthode créera une vue unifiée avec repositionnement des DOM-TOM selon le mode
    const unifiedData = await this.geoDataService.getUnifiedData(unifiedViewMode)
    if (!unifiedData) return

    // Projection adaptée au mode de vue sélectionné
    const projection = this.projectionService.getProjection(projectionType, unifiedViewMode)
    
    const plot = Plot.plot({
      width: 800,
      height: 600,
      projection: {
        ...projection,
        domain: d3.geoCircle().center([2, 46]).radius(7)(),
      },
      marks: [
        // Maintenant tout est dans une seule FeatureCollection avec des couleurs par feature
        Plot.geo(unifiedData.metropole, {
          fill: (d: any) => {
            // Couleur selon le code du territoire
            if (d.properties?.code === 'FR-MET') return '#e8f5e8' // Métropole en vert
            return this.getTerritoryColor(d.properties?.code || 'unknown')
          },
          stroke: '#2d4a2d',
          strokeWidth: 0.8
        }),
        Plot.frame({stroke: '#333'})
      ]
    })

    container.innerHTML = ''
    container.appendChild(plot)
  }
}