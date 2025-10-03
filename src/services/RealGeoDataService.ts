import * as topojson from 'topojson-client'
import * as d3 from 'd3-geo'
import { GeoProjectionService } from './GeoProjectionService'

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
        area: this.calculateArea(feature)
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

  private calculateArea(feature: GeoJSON.Feature): number {
    // Calculate area in square kilometers using d3.geoArea
    // d3.geoArea returns area in steradians, we convert to km²
    const areaInSteradians = d3.geoArea(feature)
    const earthRadiusKm = 6371 // Earth's radius in kilometers
    const areaInKm2 = areaInSteradians * earthRadiusKm * earthRadiusKm
    return Math.round(areaInKm2)
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
      
      let territoryInfo: { name: string; code: string; region: string } | null = null
      
      // Identifier le territoire selon ses coordonnées avec des critères plus précis
      if (minLon > 45.0 && maxLon < 45.3 && minLat > -13.0 && maxLat < -12.6) {
        territoryInfo = { name: 'Mayotte', code: 'FR-YT', region: 'Océan Indien' }
      } else if (minLon > 55.2 && maxLon < 55.9 && minLat > -21.4 && maxLat < -20.8) {
        territoryInfo = { name: 'La Réunion', code: 'FR-RE', region: 'Océan Indien' }
      } else if (minLon > -61.9 && maxLon < -61.0 && minLat > 15.8 && maxLat < 16.6) {
        // Guadeloupe archipel - identifier par position plus précise
        territoryInfo = { name: 'Guadeloupe', code: 'FR-GP', region: 'Antilles' }
      } else if (minLon > -61.3 && maxLon < -60.8 && minLat > 14.4 && maxLat < 14.9) {
        territoryInfo = { name: 'Martinique', code: 'FR-MQ', region: 'Antilles' }
      } else if (minLon > -54.7 && maxLon < -51.6 && minLat > 2.1 && maxLat < 5.8) {
        territoryInfo = { name: 'Guyane française', code: 'FR-GF', region: 'Amérique du Sud' }
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
        
        // Calculate area dynamically from geometry
        const calculatedArea = this.calculateArea(territoryFeature)
        
        extractedTerritories.push({
          name: territoryInfo.name,
          code: territoryInfo.code,
          region: territoryInfo.region,
          area: calculatedArea,
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

  async getUnifiedData(mode: string = 'metropole-major'): Promise<{ metropole: GeoJSON.FeatureCollection; domtom: any[] } | null> {
    await this.loadData()
    
    // NOUVELLE APPROCHE : créer un dataset unifié avec toutes les géométries repositionnées
    const metropole = await this.getMetropoleData() // Métropole européenne seule
    if (!metropole) return null

    const allDomtomData = await this.getDOMTOMData()
    
    // Filtrer les DOM-TOM selon le mode sélectionné
    let filteredDomtom: any[] = []
    
    switch (mode) {
      case 'metropole-only':
        // Aucun DOM-TOM
        filteredDomtom = []
        break
        
      case 'metropole-major':
        // Principaux DOM-TOM : souvent représentés dans les cartes
        filteredDomtom = allDomtomData.filter(territory => 
          ['FR-GF', 'FR-RE', 'FR-GP', 'FR-MQ', 'FR-YT'].includes(territory.code)
        )
        break
        
      case 'metropole-uncommon':
        // DOM-TOM moins courants
        filteredDomtom = allDomtomData.filter(territory => 
          ['FR-MF', 'FR-PF', 'FR-NC'].includes(territory.code)
        )
        break
        
      case 'all-territories':
      default:
        // Territoires rarement représentés
        filteredDomtom = allDomtomData.filter(territory => 
          ['FR-TF', 'FR-WF', 'FR-PM'].includes(territory.code)
        )
        break
    }
    
    // CRÉER UN DATASET UNIFIÉ avec métropole + DOM-TOM repositionnés
    const unifiedFeatures = [...metropole.features]
    
    filteredDomtom.forEach((territory, index) => {
      const repositioned = this.repositionTerritory(territory.data, index)
      unifiedFeatures.push(...repositioned.features)
    })

    // Retourner comme une seule FeatureCollection pour forcer Observable Plot
    // à calculer les limites uniquement sur les données repositionnées
    return {
      metropole: {
        type: 'FeatureCollection',
        features: unifiedFeatures
      },
      domtom: [] // Vide car tout est dans metropole maintenant
    }
  }

  private repositionTerritory(territoryData: GeoJSON.FeatureCollection, index: number): GeoJSON.FeatureCollection {
    // Obtenir la configuration des insets depuis GeoProjectionService
    const projectionService = new GeoProjectionService()
    const insets = projectionService.getFranceCompositeInsets()
    
    const repositioned = JSON.parse(JSON.stringify(territoryData))
    
    repositioned.features.forEach((feature: GeoJSON.Feature) => {
      if (feature.geometry && feature.properties?.code) {
        const territoryCode = feature.properties.code
        const insetConfig = insets.domtom[territoryCode as keyof typeof insets.domtom]
        
        if (insetConfig) {
          console.log(`🗺️ Repositionnement composite ${territoryCode}:`, insetConfig)
          
          // Calculer les limites originales
          const originalBounds = this.calculateGeometryBounds(feature.geometry)
          console.log(`  📍 Limites originales:`, originalBounds)
          
          // Position cible selon la configuration inset (relative au centre de la France)
          const franceCenterLon = 2
          const franceCenterLat = 46
          const targetLon = franceCenterLon + insetConfig.translate[0]
          const targetLat = franceCenterLat + insetConfig.translate[1]
          
          // Repositionner et redimensionner selon la configuration
          this.repositionGeometryToTarget(feature.geometry, targetLon, targetLat)
          this.scaleGeometry(feature.geometry, insetConfig.scale)
          
          // Vérifier le résultat
          const newBounds = this.calculateGeometryBounds(feature.geometry)
          console.log(`  📍 Nouvelles limites:`, newBounds)
        } else {
          console.log(`⚠️ Pas de configuration inset pour ${territoryCode}, utilisation position par défaut`)
          // Fallback : utiliser l'ancienne méthode de positionnement
          const fallbackPositions = [
            { lon: 5, lat: 47 }, { lon: 5, lat: 45 }, { lon: -1, lat: 47 }, { lon: -1, lat: 45 },
            { lon: 2, lat: 49 }, { lon: 2, lat: 43 }, { lon: 7, lat: 46 }, { lon: -3, lat: 46 }
          ]
          const targetPosition = fallbackPositions[index % fallbackPositions.length]
          this.repositionGeometryToTarget(feature.geometry, targetPosition.lon, targetPosition.lat)
          this.scaleGeometry(feature.geometry, 0.4)
        }
      }
    })

    return repositioned
  }

  /**
   * Repositionne une géométrie directement à des coordonnées cibles
   */
  private repositionGeometryToTarget(geometry: GeoJSON.Geometry, targetLon: number, targetLat: number): void {
    if (!('coordinates' in geometry)) return

    // Calculer le centroïde actuel
    const bounds = this.calculateGeometryBounds(geometry)
    const currentCenterLon = (bounds[0] + bounds[2]) / 2
    const currentCenterLat = (bounds[1] + bounds[3]) / 2
    
    // Calculer le décalage nécessaire
    const offsetLon = targetLon - currentCenterLon
    const offsetLat = targetLat - currentCenterLat
    
    console.log(`    🎯 Décalage: lon${offsetLon.toFixed(1)}, lat${offsetLat.toFixed(1)}`)
    
    // Appliquer le décalage
    this.transformGeometry(geometry, offsetLon, offsetLat)
  }

  /**
   * Redimensionne une géométrie depuis son centroïde
   */
  private scaleGeometry(geometry: GeoJSON.Geometry, scaleFactor: number): void {
    if (!('coordinates' in geometry)) return

    // Calculer le centroïde approximatif
    const bounds = this.calculateGeometryBounds(geometry)
    const centerLon = (bounds[0] + bounds[2]) / 2
    const centerLat = (bounds[1] + bounds[3]) / 2

    const scaleCoords = (coords: any): any => {
      if (Array.isArray(coords[0])) {
        return coords.map(scaleCoords)
      } else {
        // Redimensionner depuis le centre
        const deltaLon = (coords[0] - centerLon) * scaleFactor
        const deltaLat = (coords[1] - centerLat) * scaleFactor
        return [centerLon + deltaLon, centerLat + deltaLat]
      }
    }

    geometry.coordinates = scaleCoords(geometry.coordinates)
  }

  /**
   * Calcule les limites d'une géométrie
   */
  private calculateGeometryBounds(geometry: GeoJSON.Geometry): [number, number, number, number] {
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity

    const processBounds = (coords: any): void => {
      if (Array.isArray(coords[0])) {
        coords.forEach(processBounds)
      } else {
        minLon = Math.min(minLon, coords[0])
        maxLon = Math.max(maxLon, coords[0])
        minLat = Math.min(minLat, coords[1])
        maxLat = Math.max(maxLat, coords[1])
      }
    }

    if ('coordinates' in geometry) {
      processBounds(geometry.coordinates)
    }

    return [minLon, minLat, maxLon, maxLat]
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