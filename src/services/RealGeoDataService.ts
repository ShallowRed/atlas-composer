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
      
      let territoryInfo: { name: string; code: string; region: string } | null = null
      
      // Identifier le territoire selon ses coordonnées
      if (minLon > 40 && maxLon < 50 && minLat > -15 && maxLat < -10) {
        territoryInfo = { name: 'Mayotte', code: 'FR-YT', region: 'Océan Indien' }
      } else if (minLon > 50 && maxLon < 60 && minLat > -25 && maxLat < -15) {
        territoryInfo = { name: 'La Réunion', code: 'FR-RE', region: 'Océan Indien' }
      } else if (minLon > -65 && maxLon < -55 && minLat > 14 && maxLat < 18) {
        territoryInfo = { name: 'Guadeloupe', code: 'FR-GP', region: 'Antilles' }
      } else if (minLon > -63 && maxLon < -60 && minLat > 14 && maxLat < 17) {
        territoryInfo = { name: 'Martinique', code: 'FR-MQ', region: 'Antilles' }
      } else if (minLon > -58 && maxLon < -48 && minLat > 0 && maxLat < 8) {
        territoryInfo = { name: 'Guyane française', code: 'FR-GF', region: 'Amérique du Sud' }
      }
      
      if (territoryInfo) {
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
          area: this.estimatePolygonArea(polygon),
          data: {
            type: 'FeatureCollection',
            features: [territoryFeature]
          }
        })
      }
    }

    return extractedTerritories
  }

  /**
   * Estime la superficie d'un polygone (approximation basique)
   */
  private estimatePolygonArea(_polygon: number[][][]): number {
    // Approximation très basique pour l'affichage
    // Dans un vrai projet, utiliser une bibliothèque de géométrie comme turf.js
    return 1000 // Valeur par défaut
  }

  async getDOMTOMData(): Promise<Array<{ name: string; code: string; data: GeoJSON.FeatureCollection; area: number; region: string }>> {
    await this.loadData()
    const domtomData = []

    // Ajouter les DOM-TOM individuels
    for (const [code, territoryData] of this.territoryData) {
      if (code !== 'FR-MET') {
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
    const metropole = this.territoryData.get('FR-MET')
    if (metropole) {
      const extractedDOMTOM = this.extractDOMTOMFromMetropole(metropole.feature)
      domtomData.push(...extractedDOMTOM)
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
    // Repositionnement simplifié - dans un vrai projet on utiliserait des projections
    const offsetLon = 15 + (index % 3) * 10  // Décalage à droite de la France
    const offsetLat = 50 - Math.floor(index / 3) * 8  // Empilement vertical

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
        return [coords[0] + offsetLon, offsetLat]
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