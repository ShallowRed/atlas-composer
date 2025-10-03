import * as topojson from 'topojson-client'

export interface RealTerritory {
  id: string
  iso: string
  name: string
  code: string
  area: number
  geometry?: any
  bounds?: [number, number, number, number] // [minX, minY, maxX, maxY]
  center?: [number, number] // [longitude, latitude]
}

export interface TerritoryGeoData {
  territory: RealTerritory
  feature: GeoJSON.Feature
  bounds: [number, number, number, number]
}

export class RealGeoDataService {
  private territoryData: Map<string, TerritoryGeoData> = new Map()
  private metadata: any = null
  private topologyData: any = null
  private isLoaded = false

  async loadData(): Promise<void> {
    if (this.isLoaded) return

    try {
      console.log('🗺️ Chargement des données géographiques Natural Earth...')
      
      // Charger les données TopoJSON
      const response = await fetch('/data/france-territories.json')
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }
      this.topologyData = await response.json()

      // Charger les métadonnées
      const metaResponse = await fetch('/data/metadata.json')
      if (!metaResponse.ok) {
        throw new Error(`Erreur métadonnées: ${metaResponse.status}`)
      }
      this.metadata = await metaResponse.json()

      // Convertir TopoJSON en GeoJSON et traiter chaque territoire
      await this.processTerritoriesData()
      
      this.isLoaded = true
      console.log(`✅ ${this.territoryData.size} territoires chargés`)
      
    } catch (error) {
      console.error('❌ Erreur chargement données:', error)
      throw error
    }
  }

  private async processTerritoriesData(): Promise<void> {
    if (!this.topologyData?.objects?.territories) {
      throw new Error('Structure de données invalide')
    }

    // Convertir TopoJSON en FeatureCollection
    const featureCollection = topojson.feature(
      this.topologyData,
      this.topologyData.objects.territories
    ) as any as GeoJSON.FeatureCollection

    for (const feature of featureCollection.features) {
      if (!feature.properties) continue

      const territory: RealTerritory = {
        id: feature.properties.id,
        iso: feature.properties.iso,
        name: feature.properties.name,
        code: feature.properties.code,
        area: this.getAreaFromMetadata(feature.properties.id)
      }

      // Calculer les limites géographiques
      const bounds = this.calculateBounds(feature)
      const center = this.calculateCenter(bounds)

      const territoryData: TerritoryGeoData = {
        territory: { ...territory, bounds, center },
        feature,
        bounds
      }

      this.territoryData.set(territory.code, territoryData)
    }
  }

  private getAreaFromMetadata(territoryId: string): number {
    const territory = this.metadata?.territories?.find((t: any) => t.id === territoryId)
    return territory?.area || 0
  }

  private calculateBounds(feature: GeoJSON.Feature): [number, number, number, number] {
    // Fonction simplifiée pour calculer les limites
    // Dans un vrai projet, on utiliserait d3-geo ou turf.js
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    const processCoordinates = (coords: any) => {
      if (Array.isArray(coords[0])) {
        coords.forEach(processCoordinates)
      } else {
        const [x, y] = coords
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }

    if (feature.geometry && 'coordinates' in feature.geometry) {
      processCoordinates((feature.geometry as any).coordinates)
    }

    return [minX, minY, maxX, maxY]
  }

  private calculateCenter(bounds: [number, number, number, number]): [number, number] {
    const [minX, minY, maxX, maxY] = bounds
    return [(minX + maxX) / 2, (minY + maxY) / 2]
  }

  // API publique
  async getMetropoleData(): Promise<GeoJSON.FeatureCollection | null> {
    await this.loadData()
    const metropole = this.territoryData.get('FR-MET')
    
    if (!metropole) return null

    // Filtrer uniquement la géométrie de la métropole européenne
    const europeanMetropoleFeature = this.extractEuropeanMetropole(metropole.feature)

    return {
      type: 'FeatureCollection',
      features: [europeanMetropoleFeature]
    }
  }

  /**
   * Extrait uniquement la partie européenne de la France métropolitaine
   * en filtrant les polygones selon leurs coordonnées géographiques
   */
  private extractEuropeanMetropole(feature: GeoJSON.Feature): GeoJSON.Feature {
    if (feature.geometry.type !== 'MultiPolygon') {
      return feature
    }

    const europeanPolygons: number[][][][] = []
    
    for (const polygon of feature.geometry.coordinates) {
      const firstRing = polygon[0]
      if (firstRing.length === 0) continue
      
      // Analyser les coordonnées du premier ring pour déterminer la région
      const lons = firstRing.map(coord => coord[0])
      const lats = firstRing.map(coord => coord[1])
      const minLon = Math.min(...lons)
      const maxLon = Math.max(...lons)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)
      
      // Garder seulement les polygones dans la zone européenne
      // France métropolitaine : longitude -5° à 10°, latitude 40° à 55°
      if (minLon > -10 && maxLon < 15 && minLat > 35 && maxLat < 55) {
        europeanPolygons.push(polygon)
      }
    }

    return {
      ...feature,
      geometry: {
        type: 'MultiPolygon',
        coordinates: europeanPolygons
      }
    }
  }

  /**
   * Extrait les DOM-TOM inclus dans la géométrie "France métropolitaine"
   * et les retourne comme territoires séparés
   */
  private extractDOMTOMFromMetropole(feature: GeoJSON.Feature): Array<{ name: string; code: string; data: GeoJSON.FeatureCollection; area: number; region: string }> {
    if (feature.geometry.type !== 'MultiPolygon') {
      return []
    }

    const extractedTerritories: Array<{ name: string; code: string; data: GeoJSON.FeatureCollection; area: number; region: string }> = []
    const addedCodes = new Set<string>() // Pour éviter les doublons
    
    for (const polygon of feature.geometry.coordinates) {
      const firstRing = polygon[0]
      if (firstRing.length === 0) continue
      
      // Analyser les coordonnées pour identifier le territoire
      const lons = firstRing.map(coord => coord[0])
      const lats = firstRing.map(coord => coord[1])
      const minLon = Math.min(...lons)
      const maxLon = Math.max(...lons)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)
      
      let territoryInfo: { name: string; code: string; region: string; area: number } | null = null
      
      // Identifier le territoire selon ses coordonnées avec des critères plus précis
      if (minLon > 45.0 && maxLon < 45.3 && minLat > -13.0 && maxLat < -12.6) {
        territoryInfo = { name: 'Mayotte', code: 'FR-YT', region: 'Océan Indien', area: 374 }
      } else if (minLon > 55.2 && maxLon < 55.9 && minLat > -21.4 && maxLat < -20.8) {
        territoryInfo = { name: 'La Réunion', code: 'FR-RE', region: 'Océan Indien', area: 2512 }
      } else if (minLon > -61.9 && maxLon < -61.0 && minLat > 15.8 && maxLat < 16.6) {
        // Guadeloupe archipel - identifier par position plus précise
        territoryInfo = { name: 'Guadeloupe', code: 'FR-GP', region: 'Antilles', area: 1628 }
      } else if (minLon > -61.3 && maxLon < -60.8 && minLat > 14.4 && maxLat < 14.9) {
        territoryInfo = { name: 'Martinique', code: 'FR-MQ', region: 'Antilles', area: 1128 }
      } else if (minLon > -54.7 && maxLon < -51.6 && minLat > 2.1 && maxLat < 5.8) {
        territoryInfo = { name: 'Guyane française', code: 'FR-GF', region: 'Amérique du Sud', area: 83534 }
      }
      
      if (territoryInfo && !addedCodes.has(territoryInfo.code)) {
        addedCodes.add(territoryInfo.code)
        
        const territoryFeature: GeoJSON.Feature = {
          type: 'Feature',
          properties: {
            name: territoryInfo.name,
            code: territoryInfo.code
          },
          geometry: {
            type: 'MultiPolygon',
            coordinates: [polygon]
          }
        }
        
        extractedTerritories.push({
          name: territoryInfo.name,
          code: territoryInfo.code,
          region: territoryInfo.region,
          area: territoryInfo.area,
          data: {
            type: 'FeatureCollection',
            features: [territoryFeature]
          }
        })
      }
    }

    return extractedTerritories
  }



  async getDOMTOMData(): Promise<Array<{ name: string; code: string; data: GeoJSON.FeatureCollection; area: number; region: string }>> {
    await this.loadData()
    const domtomData = []

    // Créer un Set pour éviter les doublons entre territoires individuels et extraits
    const addedTerritories = new Set<string>()

    // Ajouter les DOM-TOM individuels (territoires déjà séparés dans Natural Earth)
    for (const [code, territoryData] of this.territoryData) {
      if (code !== 'FR-MET') {
        addedTerritories.add(code)
        domtomData.push({
          name: territoryData.territory.name,
          code: territoryData.territory.code,
          area: territoryData.territory.area,
          region: this.getTerritoryRegion(code),
          data: {
            type: 'FeatureCollection' as const,
            features: [territoryData.feature]
          }
        })
      }
    }

    // Extraire les DOM-TOM inclus dans la géométrie "France métropolitaine"
    // seulement s'ils ne sont pas déjà présents comme territoires individuels
    const metropole = this.territoryData.get('FR-MET')
    if (metropole) {
      const extractedDOMTOM = this.extractDOMTOMFromMetropole(metropole.feature)
      for (const territory of extractedDOMTOM) {
        if (!addedTerritories.has(territory.code)) {
          domtomData.push(territory)
        }
      }
    }

    // Trier par région puis par superficie
    return domtomData.sort((a, b) => {
      if (a.region !== b.region) {
        return a.region.localeCompare(b.region)
      }
      return b.area - a.area
    })
  }





  private getTerritoryRegion(code: string): string {
    // Régions basées sur les territoires réels de Natural Earth
    const regions = {
      'FR-PM': 'Amérique du Nord',
      'FR-MF': 'Antilles',        // Saint-Martin
      'FR-PF': 'Océan Pacifique', // Polynésie française
      'FR-NC': 'Océan Pacifique', // Nouvelle-Calédonie
      'FR-WF': 'Océan Pacifique', // Wallis-et-Futuna
      'FR-TF': 'Océan Indien'     // Terres australes françaises
    }
    return regions[code as keyof typeof regions] || 'Autre'
  }

  async getUnifiedData(): Promise<{ metropole: GeoJSON.FeatureCollection; domtom: any[] } | null> {
    await this.loadData()
    
    const metropole = await this.getMetropoleData()
    if (!metropole) return null

    const domtomData = await this.getDOMTOMData()
    
    // Pour la vue unifiée, on repositionne les DOM-TOM
    const repositionedDOMTOM = domtomData.map((territory, index) => ({
      ...territory,
      repositioned: this.repositionTerritory(territory.data, index)
    }))

    return {
      metropole,
      domtom: repositionedDOMTOM
    }
  }

  private repositionTerritory(territoryData: GeoJSON.FeatureCollection, index: number): GeoJSON.FeatureCollection {
    // Positions prédéfinies autour de la France métropolitaine pour une vue d'ensemble
    const positions = [
      { lon: 12, lat: 50 },  // Nord-Est
      { lon: 12, lat: 42 },  // Sud-Est  
      { lon: -8, lat: 50 },  // Nord-Ouest
      { lon: -8, lat: 42 },  // Sud-Ouest
      { lon: 2, lat: 55 },   // Nord
      { lon: 2, lat: 37 },   // Sud
      { lon: 18, lat: 46 },  // Est
      { lon: -14, lat: 46 }, // Ouest
      { lon: 8, lat: 54 },   // Nord-Est-2
      { lon: 8, lat: 38 },   // Sud-Est-2
      { lon: -4, lat: 54 },  // Nord-Ouest-2
      { lon: -4, lat: 38 }   // Sud-Ouest-2
    ]
    
    const targetPosition = positions[index % positions.length]
    
    // Calculer le décalage nécessaire en utilisant le centre approximatif de la France (2°E, 46°N)
    const offsetLon = targetPosition.lon - 2  // Décalage par rapport au centre de la France
    const offsetLat = targetPosition.lat - 46

    const repositioned = JSON.parse(JSON.stringify(territoryData))
    
    repositioned.features.forEach((feature: GeoJSON.Feature) => {
      if (feature.geometry) {
        this.transformGeometry(feature.geometry, offsetLon, offsetLat)
      }
    })

    return repositioned
  }

  private transformGeometry(geometry: GeoJSON.Geometry, offsetLon: number, offsetLat: number): void {
    const transformCoords = (coords: any): any => {
      if (Array.isArray(coords[0])) {
        return coords.map(transformCoords)
      } else {
        return [coords[0] + offsetLon, coords[1] + offsetLat]
      }
    }

    if ('coordinates' in geometry) {
      geometry.coordinates = transformCoords(geometry.coordinates)
    }
  }

  getTerritoryInfo(): RealTerritory[] {
    const territories = Array.from(this.territoryData.values()).map(data => data.territory)
    return territories.sort((a, b) => b.area - a.area) // Tri par superficie
  }

  async getTerritory(code: string): Promise<TerritoryGeoData | null> {
    await this.loadData()
    return this.territoryData.get(code) || null
  }

  async getAllTerritories(): Promise<TerritoryGeoData[]> {
    await this.loadData()
    return Array.from(this.territoryData.values())
  }

  getMetadata() {
    return this.metadata
  }
}