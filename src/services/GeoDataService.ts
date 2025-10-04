import * as d3 from 'd3-geo'
import * as topojson from 'topojson-client'

import { getTerritoriesForMode, getTerritoryName, getTerritoryRegion } from '@/constants/territories'

/**
 * Represents a French territory (metropolitan France or overseas territories)
 */
export interface Territory {
  id: string // Natural Earth ID
  iso: string // ISO country code
  name: string // Territory display name
  code: string // French territory code (FR-XX)
  area: number // Area in square kilometers
  geometry?: any // Raw geometry data
  bounds?: [number, number, number, number] // Geographic bounds [west, south, east, north]
  center?: [number, number] // Geographic center [longitude, latitude]
}

/**
 * Combined territory data including both metadata and geographic features
 */
export interface TerritoryGeoData {
  territory: Territory // Territory metadata
  feature: GeoJSON.Feature // GeoJSON feature for rendering
  bounds: [number, number, number, number] // Cached geographic bounds
}

/**
 * Service for loading and processing French geographic data
 * Handles Natural Earth data conversion, territory extraction, and composite projections
 */
export class RealGeoDataService {
  private territoryData: Map<string, TerritoryGeoData> = new Map() // Cached processed territory data
  private metadata: any = null // Natural Earth metadata
  private topologyData: any = null // Raw TopoJSON data
  private isLoaded = false // Loading state flag

  /**
   * Loads and processes French geographic data from Natural Earth
   * Downloads TopoJSON and metadata, then converts to processable format
   */
  async loadData(): Promise<void> {
    if (this.isLoaded)
      return

    try {
      // Load TopoJSON data containing French territories
      const response = await fetch('/data/france-territories.json')
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }
      this.topologyData = await response.json()

      // Load metadata with territory information
      const metaResponse = await fetch('/data/metadata.json')
      if (!metaResponse.ok) {
        throw new Error(`Metadata Error: ${metaResponse.status}`)
      }
      this.metadata = await metaResponse.json()

      // Convert TopoJSON to GeoJSON and process each territory
      await this.processTerritoriesData()

      this.isLoaded = true
    }
    catch (error) {
      console.error('Data loading error:', error)
      throw error
    }
  }

  /**
   * Processes raw TopoJSON data into usable territory objects
   * Converts topology to features and calculates geographic properties
   */
  private async processTerritoriesData(): Promise<void> {
    if (!this.topologyData?.objects?.territories) {
      throw new Error('Invalid data structure')
    }

    // Convert TopoJSON topology to GeoJSON FeatureCollection
    const featureCollection = topojson.feature(
      this.topologyData,
      this.topologyData.objects.territories,
    ) as any as GeoJSON.FeatureCollection

    for (const feature of featureCollection.features) {
      if (!feature.properties)
        continue

      // Create territory metadata with calculated area
      const territory: Territory = {
        id: feature.properties.id,
        iso: feature.properties.iso,
        name: feature.properties.name,
        code: feature.properties.code,
        area: this.calculateArea(feature),
      }

      // Calculate geographic bounds and center point
      const bounds = this.calculateBounds(feature)
      const center = this.calculateCenter(bounds)

      const territoryData: TerritoryGeoData = {
        territory: { ...territory, bounds, center },
        feature,
        bounds,
      }

      this.territoryData.set(territory.code, territoryData)
    }
  }

  /**
   * Calculates the area of a geographic feature using d3-geo
   * @param feature - GeoJSON feature to calculate area for
   * @returns Area in square kilometers (rounded to nearest integer)
   */
  private calculateArea(feature: GeoJSON.Feature): number {
    // Calculate area in square kilometers using d3.geoArea
    // d3.geoArea returns area in steradians, we convert to km²
    const areaInSteradians = d3.geoArea(feature)
    const earthRadiusKm = 6371 // Earth's radius in kilometers
    const areaInKm2 = areaInSteradians * earthRadiusKm * earthRadiusKm
    return Math.round(areaInKm2)
  }

  /**
   * Calculates the bounding box of a geographic feature using d3-geo
   * @param feature - GeoJSON feature to calculate bounds for
   * @returns Bounds array as [minLon, minLat, maxLon, maxLat]
   */
  private calculateBounds(feature: GeoJSON.Feature): [number, number, number, number] {
    // Use d3-geo's geoBounds for accurate geographic bounds calculation
    const bounds = d3.geoBounds(feature)
    // d3.geoBounds returns [[west, south], [east, north]]
    // We need [minX, minY, maxX, maxY] format
    return [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]]
  }

  /**
   * Calculates the center point from geographic bounds
   * @param bounds - Bounding box as [minLon, minLat, maxLon, maxLat]
   * @returns Center point as [longitude, latitude]
   */
  private calculateCenter(bounds: [number, number, number, number]): [number, number] {
    const [minX, minY, maxX, maxY] = bounds
    return [(minX + maxX) / 2, (minY + maxY) / 2]
  }

  /**
   * Returns the metropolitan France geographic data
   * Filters to include only European mainland territory
   * @returns FeatureCollection containing European metropolitan France
   */
  async getMetropoleData(): Promise<GeoJSON.FeatureCollection | null> {
    await this.loadData()
    const metropole = this.territoryData.get('FR-MET')

    if (!metropole)
      return null

    // Filter to include only European metropolitan geometry
    const europeanMetropoleFeature = this.extractEuropeanMetropole(metropole.feature)

    return {
      type: 'FeatureCollection',
      features: [europeanMetropoleFeature],
    }
  }

  /**
   * Extracts only the European part of metropolitan France
   * Filters polygons based on their geographic coordinates
   * @param feature - Original France metropolitan feature
   * @returns Feature containing only European mainland polygons
   */
  private extractEuropeanMetropole(feature: GeoJSON.Feature): GeoJSON.Feature {
    if (feature.geometry.type !== 'MultiPolygon') {
      return feature
    }

    const europeanPolygons: number[][][][] = []

    for (const polygon of feature.geometry.coordinates) {
      const firstRing = polygon[0]
      if (!firstRing || firstRing.length === 0)
        continue

      // Analyze coordinates of the first ring to determine region
      const lons = firstRing.map(coord => coord[0]) as number[]
      const lats = firstRing.map(coord => coord[1]) as number[]
      const minLon = Math.min(...lons)
      const maxLon = Math.max(...lons)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)

      // Keep only polygons within the European zone
      // Metropolitan France bounds: longitude -5° to 10°, latitude 40° to 55°
      if (minLon > -10 && maxLon < 15 && minLat > 35 && maxLat < 55) {
        europeanPolygons.push(polygon)
      }
    }

    return {
      ...feature,
      geometry: {
        type: 'MultiPolygon',
        coordinates: europeanPolygons,
      },
    }
  }

  /**
   * Extracts DOM-TOM territories included in metropolitan France geometry
   * Returns them as separate territory objects for individual rendering
   * @param feature - Metropolitan France feature containing mixed territories
   * @returns Array of DOM-TOM territory objects with geographic data
   */
  private extractDOMTOMFromMetropole(feature: GeoJSON.Feature): Array<{ name: string, code: string, data: GeoJSON.FeatureCollection, area: number, region: string }> {
    if (feature.geometry.type !== 'MultiPolygon') {
      return []
    }

    const extractedTerritories: Array<{ name: string, code: string, data: GeoJSON.FeatureCollection, area: number, region: string }> = []
    const addedCodes = new Set<string>() // Pour éviter les doublons

    for (const polygon of feature.geometry.coordinates) {
      const firstRing = polygon[0]
      if (!firstRing || firstRing?.length === 0)
        continue

      // Analyser les coordonnées pour identifier le territoire
      const lons = firstRing.map(coord => coord[0]) as number[]
      const lats = firstRing.map(coord => coord[1]) as number[]
      const minLon = Math.min(...lons)
      const maxLon = Math.max(...lons)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)

      let territoryInfo: { name: string, code: string, region: string } | null = null

      // Identify territory based on precise geographic coordinates
      if (minLon > 45.0 && maxLon < 45.3 && minLat > -13.0 && maxLat < -12.6) {
        territoryInfo = { name: getTerritoryName('FR-YT'), code: 'FR-YT', region: 'Indian Ocean' }
      }
      else if (minLon > 55.2 && maxLon < 55.9 && minLat > -21.4 && maxLat < -20.8) {
        territoryInfo = { name: getTerritoryName('FR-RE'), code: 'FR-RE', region: 'Indian Ocean' }
      }
      else if (minLon > -61.9 && maxLon < -61.0 && minLat > 15.8 && maxLat < 16.6) {
        // Guadeloupe archipelago - identified by precise position
        territoryInfo = { name: getTerritoryName('FR-GP'), code: 'FR-GP', region: 'Caribbean' }
      }
      else if (minLon > -61.3 && maxLon < -60.8 && minLat > 14.4 && maxLat < 14.9) {
        territoryInfo = { name: getTerritoryName('FR-MQ'), code: 'FR-MQ', region: 'Caribbean' }
      }
      else if (minLon > -54.7 && maxLon < -51.6 && minLat > 2.1 && maxLat < 5.8) {
        territoryInfo = { name: getTerritoryName('FR-GF'), code: 'FR-GF', region: 'South America' }
      }

      if (territoryInfo && !addedCodes.has(territoryInfo.code)) {
        addedCodes.add(territoryInfo.code)

        const territoryFeature: GeoJSON.Feature = {
          type: 'Feature',
          properties: {
            name: territoryInfo.name,
            code: territoryInfo.code,
          },
          geometry: {
            type: 'MultiPolygon',
            coordinates: [polygon],
          },
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
            features: [territoryFeature],
          },
        })
      }
    }

    return extractedTerritories
  }

  /**
   * Returns all DOM-TOM (Overseas Departments and Territories) geographic data
   * Combines individually defined territories with those extracted from metropolitan data
   * @returns Array of DOM-TOM territory objects with geographic and metadata
   */
  async getDOMTOMData(): Promise<Array<{ name: string, code: string, data: GeoJSON.FeatureCollection, area: number, region: string }>> {
    await this.loadData()
    const domtomData = []

    // Create Set to avoid duplicates between individual territories and extracted ones
    const addedTerritories = new Set<string>()

    // Add individual DOM-TOM territories (already separated in Natural Earth data)
    for (const [code, territoryData] of this.territoryData) {
      if (code !== 'FR-MET') {
        addedTerritories.add(code)
        domtomData.push({
          name: territoryData.territory.name,
          code: territoryData.territory.code,
          area: territoryData.territory.area,
          region: getTerritoryRegion(code),
          data: {
            type: 'FeatureCollection' as const,
            features: [territoryData.feature],
          },
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

    // Sort by region then by area (largest first)
    return domtomData.sort((a, b) => {
      if (a.region !== b.region) {
        return a.region.localeCompare(b.region)
      }
      return b.area - a.area
    })
  }

  /**
   * Returns raw geographic data with original coordinates for composite projections
   * @param mode - Display mode: 'metropole-only', 'metropole-major', or 'all'
   * @returns Combined metropolitan and DOM-TOM data with ORIGINAL coordinates (no repositioning)
   */
  async getRawUnifiedData(mode: string = 'metropole-major'): Promise<GeoJSON.FeatureCollection | null> {
    await this.loadData()

    // Get European metropolitan France (no repositioning needed)
    const metropole = await this.getMetropoleData()
    if (!metropole)
      return null

    const allDomtomData = await this.getDOMTOMData()

    // Filter DOM-TOM territories based on selected mode using centralized configuration
    const allowedCodes = getTerritoriesForMode(mode as any)
    const filteredDomtom = allDomtomData.filter(territory =>
      allowedCodes.includes(territory.code),
    )

    // CREATE UNIFIED DATASET with ORIGINAL coordinates - no repositioning!
    const unifiedFeatures = [...metropole.features]

    // Add DOM-TOM territories with their ORIGINAL coordinates
    filteredDomtom.forEach((territory) => {
      // Add original DOM-TOM features without any coordinate transformation
      unifiedFeatures.push(...territory.data.features)
    })

    return {
      type: 'FeatureCollection',
      features: unifiedFeatures,
    }
  }

  getTerritoryInfo(): Territory[] {
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
