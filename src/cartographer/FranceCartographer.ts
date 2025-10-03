import * as Plot from '@observablehq/plot'
import { GeoProjectionService } from '../services/GeoProjectionService'
import { FranceGeoDataService } from '../services/FranceGeoDataService'

export class FranceCartographer {
  private projectionService: GeoProjectionService
  private geoDataService: FranceGeoDataService
  private scalePreservation: boolean = true

  constructor() {
    this.projectionService = new GeoProjectionService()
    this.geoDataService = new FranceGeoDataService()
  }

  async init() {
    console.log('🗺️ Initialisation du cartographe France...')
    
    // Charger les données géographiques
    await this.geoDataService.loadAllData()
    
    // Configurer les contrôles
    this.setupControls()
    
    // Créer les cartes initiales
    this.renderMaps()
    
    console.log('✅ Cartographe France initialisé')
  }

  private setupControls() {
    const projectionSelect = document.getElementById('projection-select') as HTMLSelectElement
    const scalePreservationCheck = document.getElementById('scale-preservation') as HTMLInputElement

    projectionSelect?.addEventListener('change', () => {
      this.renderMaps()
    })

    scalePreservationCheck?.addEventListener('change', (event) => {
      this.scalePreservation = (event.target as HTMLInputElement).checked
      this.renderMaps()
    })
  }

  private async renderMaps() {
    const projectionType = (document.getElementById('projection-select') as HTMLSelectElement)?.value || 'albers'
    
    try {
      // Carte de la France métropolitaine
      await this.renderMetropoleFranceMap(projectionType)
      
      // Cartes des DOM-TOM
      await this.renderDOMTOMMap(projectionType)
      
      // Vue unifiée avec repositionnement
      await this.renderUnifiedMap(projectionType)
      
      // Mise à jour des informations
      this.updateTerritoryInfo()
      
    } catch (error) {
      console.error('Erreur lors du rendu des cartes:', error)
    }
  }

  private async renderMetropoleFranceMap(projectionType: string) {
    const container = document.querySelector('#france-metropole .map-plot')
    if (!container) return

    const franceData = await this.geoDataService.getMetropoleData()
    if (!franceData) return

    const projection = this.projectionService.getProjection(projectionType, franceData)
    
    const plot = Plot.plot({
      width: 500,
      height: 400,
      projection,
      marks: [
        Plot.geo(franceData, {
          fill: '#e8f5e8',
          stroke: '#2d5a2d',
          strokeWidth: 0.5
        }),
        Plot.frame({stroke: '#333'})
      ]
    })

    container.innerHTML = ''
    container.appendChild(plot)
  }

  private async renderDOMTOMMap(projectionType: string) {
    const container = document.querySelector('#dom-tom .map-plot')
    if (!container) return

    const domtomData = await this.geoDataService.getDOMTOMData()
    if (!domtomData || domtomData.length === 0) return

    // Créer une grille pour afficher les DOM-TOM
    const gridContainer = document.createElement('div')
    gridContainer.style.display = 'grid'
    gridContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))'
    gridContainer.style.gap = '10px'

    for (const territory of domtomData) {
      const territoryContainer = document.createElement('div')
      territoryContainer.style.textAlign = 'center'
      
      const title = document.createElement('h4')
      title.textContent = territory.name
      title.style.margin = '5px 0'
      
      const mapDiv = document.createElement('div')
      
      const projection = this.projectionService.getProjection(projectionType, territory.data)
      
      const plot = Plot.plot({
        width: 180,
        height: 150,
        projection,
        marks: [
          Plot.geo(territory.data, {
            fill: '#e8f5e8',
            stroke: '#2d5a2d',
            strokeWidth: 0.5
          }),
          Plot.frame({stroke: '#333'})
        ]
      })

      territoryContainer.appendChild(title)
      territoryContainer.appendChild(mapDiv)
      mapDiv.appendChild(plot)
      gridContainer.appendChild(territoryContainer)
    }

    container.innerHTML = ''
    container.appendChild(gridContainer)
  }

  private async renderUnifiedMap(projectionType: string) {
    const container = document.querySelector('#unified-plot')
    if (!container) return

    // Cette méthode créera une vue unifiée avec repositionnement des DOM-TOM
    const unifiedData = await this.geoDataService.getUnifiedData()
    if (!unifiedData) return

    const projection = this.projectionService.getUnifiedProjection(projectionType)
    
    const plot = Plot.plot({
      width: 800,
      height: 600,
      projection,
      marks: [
        Plot.geo(unifiedData.metropole, {
          fill: '#e8f5e8',
          stroke: '#2d5a2d',
          strokeWidth: 0.5
        }),
        ...unifiedData.domtom.map((territory: any) => 
          Plot.geo(territory.repositioned, {
            fill: '#ffe8e8',
            stroke: '#5a2d2d',
            strokeWidth: 0.5
          })
        ),
        Plot.frame({stroke: '#333'})
      ]
    })

    container.innerHTML = ''
    container.appendChild(plot)
  }

  private updateTerritoryInfo() {
    const infoContainer = document.getElementById('territory-info')
    if (!infoContainer) return

    const territories = this.geoDataService.getTerritoryInfo()
    
    infoContainer.innerHTML = `
      <div class="territory-stats">
        <h4>Statistiques des territoires</h4>
        <ul>
          ${territories.map((t: any) => `
            <li>
              <strong>${t.name}</strong>: 
              ${t.area} km² 
              ${this.scalePreservation ? '(taille réelle préservée)' : '(taille ajustée)'}
            </li>
          `).join('')}
        </ul>
      </div>
    `
  }
}