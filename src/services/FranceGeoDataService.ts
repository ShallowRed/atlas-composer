export interface Territory {
  name: string
  code: string
  area: number
  data?: any
  repositioned?: any
}

export class FranceGeoDataService {
  private metropoleData: any = null
  private domtomData: Territory[] = []
  private territoryInfo: Territory[] = []

  async loadAllData() {
    console.log('📡 Chargement des données géographiques...')
    
    // Pour l'instant, on utilise des données de démonstration
    // Dans un vrai projet, on chargerait depuis des fichiers TopoJSON/GeoJSON
    await this.loadDemoData()
    
    console.log('✅ Données géographiques chargées')
  }

  private async loadDemoData() {
    // Créer des données de démonstration pour la France métropolitaine
    this.metropoleData = this.createDemoMetropoleData()
    
    // Créer des données de démonstration pour les DOM-TOM
    this.domtomData = this.createDemoDOMTOMData()
    
    // Informations sur les territoires
    this.territoryInfo = [
      { name: 'France métropolitaine', code: 'FR-MET', area: 543965 },
      { name: 'Guadeloupe', code: 'FR-GP', area: 1628 },
      { name: 'Martinique', code: 'FR-MQ', area: 1128 },
      { name: 'Guyane', code: 'FR-GF', area: 83534 },
      { name: 'La Réunion', code: 'FR-RE', area: 2512 },
      { name: 'Mayotte', code: 'FR-YT', area: 374 },
      { name: 'Saint-Pierre-et-Miquelon', code: 'FR-PM', area: 242 },
      { name: 'Wallis-et-Futuna', code: 'FR-WF', area: 142 },
      { name: 'Polynésie française', code: 'FR-PF', area: 4167 },
      { name: 'Nouvelle-Calédonie', code: 'FR-NC', area: 18575 }
    ]
  }

  private createDemoMetropoleData() {
    // Contour approximatif de la France métropolitaine
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { name: 'France métropolitaine' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-4.5, 48.4], // Bretagne
            [8, 48.8],    // Alsace
            [7.5, 43.2],  // Côte d'Azur
            [3, 42.3],    // Pyrénées
            [-1.8, 43.2], // Pays Basque
            [-4.5, 48.4]  // Retour Bretagne
          ]]
        }
      }]
    }
  }

  private createDemoDOMTOMData(): Territory[] {
    return [
      {
        name: 'Guadeloupe',
        code: 'GP',
        area: 1628,
        data: this.createTerritoryGeoJSON('Guadeloupe', [[-61.8, 16.3], [-61.0, 16.3], [-61.0, 15.8], [-61.8, 15.8], [-61.8, 16.3]])
      },
      {
        name: 'Martinique', 
        code: 'MQ',
        area: 1128,
        data: this.createTerritoryGeoJSON('Martinique', [[-61.2, 14.9], [-60.8, 14.9], [-60.8, 14.4], [-61.2, 14.4], [-61.2, 14.9]])
      },
      {
        name: 'Guyane',
        code: 'GF', 
        area: 83534,
        data: this.createTerritoryGeoJSON('Guyane', [[-54.6, 5.7], [-51.6, 5.7], [-51.6, 2.1], [-54.6, 2.1], [-54.6, 5.7]])
      },
      {
        name: 'La Réunion',
        code: 'RE',
        area: 2512,
        data: this.createTerritoryGeoJSON('La Réunion', [[55.2, -20.9], [55.8, -20.9], [55.8, -21.4], [55.2, -21.4], [55.2, -20.9]])
      },
      {
        name: 'Mayotte',
        code: 'YT',
        area: 374,
        data: this.createTerritoryGeoJSON('Mayotte', [[45.0, -12.7], [45.3, -12.7], [45.3, -13.0], [45.0, -13.0], [45.0, -12.7]])
      },
      {
        name: 'Nouvelle-Calédonie',
        code: 'NC',
        area: 18575,
        data: this.createTerritoryGeoJSON('Nouvelle-Calédonie', [[164.0, -19.0], [167.0, -19.0], [167.0, -23.0], [164.0, -23.0], [164.0, -19.0]])
      }
    ]
  }

  private createTerritoryGeoJSON(name: string, coordinates: number[][]) {
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { name },
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates]
        }
      }]
    }
  }

  async getMetropoleData() {
    return this.metropoleData
  }

  async getDOMTOMData(): Promise<Territory[]> {
    return this.domtomData
  }

  async getUnifiedData() {
    // Créer une vue unifiée avec repositionnement des DOM-TOM
    const repositionedDOMTOM = this.domtomData.map((territory, index) => {
      const repositioned = this.repositionTerritory(territory, index)
      return {
        ...territory,
        repositioned
      }
    })

    return {
      metropole: this.metropoleData,
      domtom: repositionedDOMTOM
    }
  }

  private repositionTerritory(territory: Territory, index: number) {
    // Repositionner les DOM-TOM à côté de la métropole
    // Calculer une position à droite ou en bas de la France
    const offsetX = 10 + (index % 3) * 8  // Décalage horizontal
    const offsetY = 45 + Math.floor(index / 3) * 8  // Décalage vertical
    
    if (!territory.data || !territory.data.features) return territory.data

    // Déplacer les coordonnées
    const repositioned = JSON.parse(JSON.stringify(territory.data))
    repositioned.features.forEach((feature: any) => {
      if (feature.geometry && feature.geometry.coordinates) {
        this.transformCoordinates(feature.geometry.coordinates, offsetX, offsetY)
      }
    })

    return repositioned
  }

  private transformCoordinates(coordinates: any, offsetX: number, offsetY: number) {
    if (Array.isArray(coordinates[0])) {
      coordinates.forEach((coord: any) => {
        this.transformCoordinates(coord, offsetX, offsetY)
      })
    } else {
      coordinates[0] += offsetX
      coordinates[1] = offsetY
    }
  }

  getTerritoryInfo(): Territory[] {
    return this.territoryInfo
  }
}