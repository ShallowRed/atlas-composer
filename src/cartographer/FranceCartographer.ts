import * as Plot from '@observablehq/plot'
import { GeoProjectionService } from '../services/GeoProjectionService'
import { RealGeoDataService } from '../services/RealGeoDataService'

export class FranceCartographer {
  private projectionService: GeoProjectionService
  private geoDataService: RealGeoDataService
  private scalePreservation: boolean = true

  constructor() {
    this.projectionService = new GeoProjectionService()
    this.geoDataService = new RealGeoDataService()
  }

  async init() {
    console.log('🗺️ Initialisation du cartographe France...')
    
    try {
      // Charger les données géographiques
      await this.geoDataService.loadData()
      
      // Afficher les territoires chargés
      const territories = this.geoDataService.getTerritoryInfo()
      console.log(`📊 ${territories.length} territoires chargés:`)
      territories.forEach(t => {
        console.log(`  • ${t.name} (${t.code}): ${t.area.toLocaleString()} km²`)
      })
      
      // Configurer les contrôles
      this.setupControls()
      
      // Créer les cartes initiales
      await this.renderMaps()
      
      console.log('✅ Cartographe France initialisé avec succès')
      
    } catch (error) {
      console.error('❌ Erreur initialisation cartographe:', error)
      
      // Afficher un message d'erreur à l'utilisateur
      const appContainer = document.getElementById('app')
      if (appContainer) {
        const errorDiv = document.createElement('div')
        errorDiv.style.cssText = 'background: #ffe6e6; border: 1px solid #ff6b6b; padding: 20px; margin: 20px; border-radius: 8px; color: #d63031;'
        errorDiv.innerHTML = `
          <h3>⚠️ Erreur de chargement des données</h3>
          <p>Impossible de charger les données géographiques.</p>
          <p><strong>Erreur:</strong> ${error instanceof Error ? error.message : String(error)}</p>
          <p><strong>Solution:</strong> Vérifiez que le script de préparation a été exécuté: <code>pnpm run prepare-data</code></p>
        `
        appContainer.insertBefore(errorDiv, appContainer.firstChild)
      }
    }
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

    // Pour la France métropolitaine, utiliser une projection spécialisée
    const projection = projectionType === 'albers' ? 
      {
        type: 'conic-conformal' as const,
        parallels: [45.898889, 47.696014], // Parallèles standards pour la France
        rotate: [-3, 0], // Centré sur la France
        domain: franceData
      } : 
      this.projectionService.getProjection(projectionType, franceData)
    
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
    
    console.log('🇫🇷 France métropolitaine rendue avec projection:', projection.type || projectionType)
  }

  private async renderDOMTOMMap(projectionType: string) {
    const container = document.querySelector('#dom-tom .map-plot')
    if (!container) return

    const domtomData = await this.geoDataService.getDOMTOMData()
    if (!domtomData || domtomData.length === 0) return

    // Créer une grille pour afficher les DOM-TOM par région
    const gridContainer = document.createElement('div')
    gridContainer.style.display = 'grid'
    gridContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))'
    gridContainer.style.gap = '15px'

    // Grouper par région
    const territoryGroups = new Map<string, any[]>()
    for (const territory of domtomData) {
      const region = territory.region || 'Autre'
      if (!territoryGroups.has(region)) {
        territoryGroups.set(region, [])
      }
      territoryGroups.get(region)!.push(territory)
    }

    for (const [region, territories] of territoryGroups) {
      const regionContainer = document.createElement('div')
      regionContainer.style.border = '1px solid #ddd'
      regionContainer.style.borderRadius = '8px'
      regionContainer.style.padding = '10px'
      regionContainer.style.backgroundColor = '#fafafa'
      
      const regionTitle = document.createElement('h3')
      regionTitle.textContent = region
      regionTitle.style.margin = '0 0 10px 0'
      regionTitle.style.fontSize = '1rem'
      regionTitle.style.color = '#555'
      regionTitle.style.borderBottom = '1px solid #ddd'
      regionTitle.style.paddingBottom = '5px'
      regionContainer.appendChild(regionTitle)
      
      for (const territory of territories) {
        const territoryContainer = document.createElement('div')
        territoryContainer.style.marginBottom = '10px'
        
        const title = document.createElement('h4')
        title.textContent = `${territory.name} (${territory.area.toLocaleString()} km²)`
        title.style.margin = '5px 0'
        title.style.fontSize = '0.85rem'
        
        const mapDiv = document.createElement('div')
        
        // Utiliser la projection sélectionnée par l'utilisateur
        const projection = this.projectionService.getProjection(projectionType, territory.data)
        
        // Adapter la taille selon la préservation d'échelle
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
   * Calcule la taille d'affichage d'un territoire selon la préservation d'échelle
   */
  private getTerritorySize(territory: any, preserveScale: boolean): { width: number; height: number } {
    if (!preserveScale) {
      // Taille standard pour tous les territoires (plus lisible)
      return { width: 200, height: 160 }
    }

    // Avec préservation d'échelle : taille proportionnelle à la superficie
    const franceMetropoleArea = 543965 // km² (superficie de référence)
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

  private getRegionColor(region: string): string {
    const colors = {
      'Antilles': '#e8f5e8',
      'Amérique du Sud': '#ffe8e8', 
      'Océan Indien': '#e8e8ff',
      'Océan Pacifique': '#fff8e8',
      'Amérique du Nord': '#f8e8ff'
    }
    return colors[region as keyof typeof colors] || '#f0f0f0'
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