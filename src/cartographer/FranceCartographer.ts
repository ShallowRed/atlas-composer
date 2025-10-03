import * as Plot from '@observablehq/plot'
import { GeoProjectionService, PROJECTION_OPTIONS } from '../services/GeoProjectionService'
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
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement

    // Populate projection options dynamically
    this.populateProjectionOptions(projectionSelect)

    projectionSelect?.addEventListener('change', () => {
      this.renderMaps()
    })
    
    scalePreservationCheck?.addEventListener('change', (event) => {
      this.scalePreservation = (event.target as HTMLInputElement).checked
      this.renderMaps()
    })

    unifiedViewModeSelect?.addEventListener('change', () => {
      const compositeRawTab = document.getElementById('tab-composite-raw') as HTMLInputElement
      const isCompositeRawActive = compositeRawTab?.checked
      
      if (isCompositeRawActive) {
        this.renderCompositeRawMap()
      } else {
        const projectionType = projectionSelect?.value || 'albers'
        this.renderUnifiedMap(projectionType)
      }
    })

    // Theme switching functionality
    themeSelect?.addEventListener('change', (event) => {
      const selectedTheme = (event.target as HTMLSelectElement).value
      this.changeTheme(selectedTheme)
    })

    // Initialize theme from localStorage or default to light
    this.initializeTheme()

    // Tab functionality
    this.setupTabs()
  }

  /**
   * Initialize tab navigation functionality with DaisyUI radio tabs
   */
  private setupTabs() {
    const compositeTab = document.getElementById('tab-composite') as HTMLInputElement
    const compositeRawTab = document.getElementById('tab-composite-raw') as HTMLInputElement
    const separateTab = document.getElementById('tab-separate') as HTMLInputElement
    const compositeOnlyControls = document.querySelectorAll('.composite-only')
    const separateOnlyControls = document.querySelectorAll('.separate-only')

    // Handle tab changes
    const handleTabChange = () => {
      const isCompositeActive = compositeTab?.checked
      const isCompositeRawActive = compositeRawTab?.checked
      const isSeparateActive = separateTab?.checked
      
      // Show/hide composite-only controls (for repositioned composite view)
      compositeOnlyControls.forEach(control => {
        if (isCompositeActive || isCompositeRawActive) {
          (control as HTMLElement).style.display = 'block'
        } else {
          (control as HTMLElement).style.display = 'none'
        }
      })

      // Show/hide separate-only controls
      separateOnlyControls.forEach(control => {
        if (isSeparateActive) {
          (control as HTMLElement).style.display = 'block'
        } else {
          (control as HTMLElement).style.display = 'none'
        }
      })

      // Re-render maps when switching tabs to ensure proper sizing
      setTimeout(() => {
        if (isCompositeRawActive) {
          this.renderCompositeRawMap()
        } else {
          this.renderMaps()
        }
      }, 100) // Small delay to allow DOM updates
    }

    // Add event listeners to radio inputs
    compositeTab?.addEventListener('change', handleTabChange)
    compositeRawTab?.addEventListener('change', handleTabChange)
    separateTab?.addEventListener('change', handleTabChange)

    // Initialize state
    handleTabChange()
  }

  /**
   * Dynamically populate projection options from centralized configuration
   */
  private populateProjectionOptions(selectElement: HTMLSelectElement) {
    if (!selectElement) return

    // Clear existing options
    selectElement.innerHTML = ''

    // Group options by category
    const categories = [...new Set(PROJECTION_OPTIONS.map(option => option.category))]
    
    categories.forEach(category => {
      const optgroup = document.createElement('optgroup')
      optgroup.label = category
      
      const categoryOptions = PROJECTION_OPTIONS.filter(option => option.category === category)
      categoryOptions.forEach(option => {
        const optionElement = document.createElement('option')
        optionElement.value = option.value
        optionElement.textContent = option.label
        
        // Set default selection to 'albers'
        if (option.value === 'albers') {
          optionElement.selected = true
        }
        
        optgroup.appendChild(optionElement)
      })
      
      selectElement.appendChild(optgroup)
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
    if (!container) {
      console.warn('Metropolitan France container not found: #france-metropole .map-plot')
      return
    }

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
    if (!container) {
      console.warn('DOM-TOM container not found: #dom-tom .map-plot')
      return
    }

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
    if (!container) {
      console.warn('Unified plot container not found: #unified-plot')
      return
    }

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

  /**
   * Render a map using the composite geoAlbersFrance projection with original (raw) coordinates
   * This reproduces the "Vue Composite" effect but uses original coordinates + composite projection
   */
  private async renderCompositeRawMap() {
    const container = document.querySelector('#composite-raw-plot')
    if (!container) {
      console.warn('Composite raw plot container not found: #composite-raw-plot')
      return
    }
    
    // Get territory selection mode from the unified view mode selector (reuse the same control)
    const unifiedViewMode = (document.getElementById('unified-view-mode') as HTMLSelectElement)?.value || 'metropole-major'
    
    // Use the new getRawUnifiedData method to get original coordinates
    const rawData = await this.geoDataService.getRawUnifiedData(unifiedViewMode)
    if (!rawData) return

    // ALWAYS use the composite geoAlbersFrance projection (ignores dropdown selection)
    // This projection will internally reposition DOM-TOM territories when given original coordinates
    const projection = this.projectionService.getProjection('albers-france', rawData)
    
    const plot = Plot.plot({
      width: 800,
      height: 600,
      projection: projection,
      marks: [
        Plot.geo(rawData, {
          fill: (d: any) => {
            // Color by territory code if available
            if (d.properties?.code === 'FR-MET') return '#e8f5e8' // Metropolitan France in green
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

  /**
   * Initialize theme from localStorage or set default theme
   */
  private initializeTheme() {
    const savedTheme = localStorage.getItem('daisyui-theme') || 'light'
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement
    const htmlElement = document.documentElement
    
    // Set theme on HTML element
    htmlElement.setAttribute('data-theme', savedTheme)
    
    // Set select value to match current theme
    if (themeSelect) {
      themeSelect.value = savedTheme
    }
  }

  /**
   * Change the DaisyUI theme and save to localStorage
   * @param theme - The theme name to apply
   */
  private changeTheme(theme: string) {
    const htmlElement = document.documentElement
    
    // Apply theme to HTML element
    htmlElement.setAttribute('data-theme', theme)
    
    // Save theme preference to localStorage
    localStorage.setItem('daisyui-theme', theme)
    
    console.log(`Theme changed to: ${theme}`)
  }
}