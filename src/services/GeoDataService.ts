import type { GeoDataConfig, TerritoryConfig } from '@/constants/territory-types'

import * as d3 from 'd3-geo'
import * as topojson from 'topojson-client'
import { DEFAULT_GEO_DATA_CONFIG, getTerritoriesForMode, getTerritoryWorldRegion } from '@/constants/france-territories'

/**
 * Represents a territory (mainland or overseas)
 */
export interface Territory {
  id: string // External data source ID
  iso: string // ISO country code
  name: string // Territory display name
  code: string // Territory code (e.g., FR-XX, US-XX)
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
 * Service for loading and processing geographic data
 * Handles TopoJSON data conversion, territory extraction, and composite projections
 */
export class GeoDataService {
  private territoryData: Map<string, TerritoryGeoData> = new Map() // Cached processed territory data
  private metadata: any = null // Data source metadata
  private topologyData: any = null // Raw TopoJSON data
  private isLoaded = false // Loading state flag
  private config: GeoDataConfig // Service configuration

  constructor(config: GeoDataConfig = DEFAULT_GEO_DATA_CONFIG) {
    this.config = config
  }

  /**
   * Loads and processes geographic data from the configured data source
   * Downloads TopoJSON and metadata, then converts to processable format
   */
  async loadData(): Promise<void> {
    if (this.isLoaded)
      return

    try {
      // Load TopoJSON data containing territories
      const response = await fetch(this.config.dataPath)
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }
      this.topologyData = await response.json()

      // Load metadata with territory information
      const metaResponse = await fetch(this.config.metadataPath)
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
    const objectName = this.config.topologyObjectName
    if (!this.topologyData?.objects?.[objectName]) {
      throw new Error(`Invalid data structure: missing object "${objectName}"`)
    }

    // Convert TopoJSON topology to GeoJSON FeatureCollection
    const featureCollection = topojson.feature(
      this.topologyData,
      this.topologyData.objects[objectName],
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
   * Returns the mainland territory geographic data
   * Filters to include only the main geographic region
   * @returns FeatureCollection containing mainland territory
   */
  async getMainLandData(): Promise<GeoJSON.FeatureCollection | null> {
    await this.loadData()
    const mainland = this.territoryData.get(this.config.mainlandCode)

    if (!mainland)
      return null

    // Filter to include only main region geometry
    const mainRegionFeature = this.extractMainlandRegion(mainland.feature)

    return {
      type: 'FeatureCollection',
      features: [mainRegionFeature],
    }
  }

  /**
   * Extracts only the main region of the mainland territory
   * Filters polygons based on configured geographic bounds
   * @param feature - Original mainland territory feature
   * @returns Feature containing only main region polygons
   */
  private extractMainlandRegion(feature: GeoJSON.Feature): GeoJSON.Feature {
    if (feature.geometry.type !== 'MultiPolygon') {
      return feature
    }

    const mainRegionPolygons: number[][][][] = []
    const [[configMinLon, configMinLat], [configMaxLon, configMaxLat]] = this.config.mainlandBounds

    // Add tolerance for bounds checking
    const tolerance = 5
    const minLon = configMinLon - tolerance
    const maxLon = configMaxLon + tolerance
    const minLat = configMinLat - tolerance
    const maxLat = configMaxLat + tolerance

    for (const polygon of feature.geometry.coordinates) {
      const firstRing = polygon[0]
      if (!firstRing || firstRing.length === 0)
        continue

      // Analyze coordinates of the first ring to determine region
      const lons = firstRing.map(coord => coord[0]) as number[]
      const lats = firstRing.map(coord => coord[1]) as number[]
      const polyMinLon = Math.min(...lons)
      const polyMaxLon = Math.max(...lons)
      const polyMinLat = Math.min(...lats)
      const polyMaxLat = Math.max(...lats)

      // Keep only polygons within the configured main region bounds
      if (polyMinLon > minLon && polyMaxLon < maxLon && polyMinLat > minLat && polyMaxLat < maxLat) {
        mainRegionPolygons.push(polygon)
      }
    }

    return {
      ...feature,
      geometry: {
        type: 'MultiPolygon',
        coordinates: mainRegionPolygons,
      },
    }
  }

  /**
   * Extracts overseas/remote territories included in mainland geometry
   * Returns them as separate territory objects for individual rendering
   * Uses centralized configuration for bounds and regions
   * @param feature - Mainland feature containing mixed territories
   * @returns Array of overseas territory objects with geographic data
   */
  private extractOverseasFromMainland(feature: GeoJSON.Feature): Array<{ name: string, code: string, data: GeoJSON.FeatureCollection, area: number, region: string }> {
    if (feature.geometry.type !== 'MultiPolygon') {
      return []
    }

    const extractedTerritories: Array<{ name: string, code: string, data: GeoJSON.FeatureCollection, area: number, region: string }> = []
    const addedCodes = new Set<string>() // To avoid duplicates

    for (const polygon of feature.geometry.coordinates) {
      const firstRing = polygon[0]
      if (!firstRing || firstRing?.length === 0)
        continue

      // Analyze coordinates to identify the territory
      const lons = firstRing.map(coord => coord[0]) as number[]
      const lats = firstRing.map(coord => coord[1]) as number[]
      const minLon = Math.min(...lons)
      const maxLon = Math.max(...lons)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)

      // Match against overseas territories from configuration
      // Check if the polygon bounds fall within the configured territory bounds
      let matchedTerritory: TerritoryConfig | null = null

      for (const territory of this.config.overseasTerritories) {
        const [[configMinLon, configMinLat], [configMaxLon, configMaxLat]] = territory.bounds

        // Check if polygon bounds are approximately within the configured bounds
        // Allow small tolerance for floating point comparisons
        const tolerance = 0.1

        if (
          minLon >= (configMinLon - tolerance)
          && maxLon <= (configMaxLon + tolerance)
          && minLat >= (configMinLat - tolerance)
          && maxLat <= (configMaxLat + tolerance)
        ) {
          matchedTerritory = territory
          break
        }
      }

      if (matchedTerritory && !addedCodes.has(matchedTerritory.code)) {
        addedCodes.add(matchedTerritory.code)

        const territoryFeature: GeoJSON.Feature = {
          type: 'Feature',
          properties: {
            name: matchedTerritory.name,
            code: matchedTerritory.code,
          },
          geometry: {
            type: 'MultiPolygon',
            coordinates: [polygon],
          },
        }

        // Calculate area dynamically from geometry
        const calculatedArea = this.calculateArea(territoryFeature)

        extractedTerritories.push({
          name: matchedTerritory.name,
          code: matchedTerritory.code,
          region: getTerritoryWorldRegion(matchedTerritory.code),
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
   * Returns all overseas/remote territories geographic data
   * Combines individually defined territories with those extracted from mainland data
   * @returns Array of overseas territory objects with geographic and metadata
   */
  async getOverseasData(): Promise<Array<{ name: string, code: string, data: GeoJSON.FeatureCollection, area: number, region: string }>> {
    await this.loadData()
    const overseasData = []

    // Create Set to avoid duplicates between individual territories and extracted ones
    const addedTerritories = new Set<string>()

    // Add individual overseas territories (already separated in source data)
    for (const [code, territoryData] of this.territoryData) {
      if (code !== this.config.mainlandCode) {
        addedTerritories.add(code)
        overseasData.push({
          name: territoryData.territory.name,
          code: territoryData.territory.code,
          area: territoryData.territory.area,
          region: getTerritoryWorldRegion(code),
          data: {
            type: 'FeatureCollection' as const,
            features: [territoryData.feature],
          },
        })
      }
    }

    // Extract overseas territories included in the mainland geometry
    // only if they are not already present as individual territories
    const mainland = this.territoryData.get(this.config.mainlandCode)
    if (mainland) {
      const extractedOverseas = this.extractOverseasFromMainland(mainland.feature)
      for (const territory of extractedOverseas) {
        if (!addedTerritories.has(territory.code)) {
          overseasData.push(territory)
        }
      }
    }

    // Sort by region then by area (largest first)
    return overseasData.sort((a, b) => {
      if (a.region !== b.region) {
        return a.region.localeCompare(b.region)
      }
      return b.area - a.area
    })
  }

  /**
   * Returns raw geographic data with original coordinates for composite projections
   * @param mode - Display mode determining which territories to include
   * @returns Combined mainland and overseas data with ORIGINAL coordinates (no repositioning)
   */
  async getRawUnifiedData(mode: string = 'metropole-major'): Promise<GeoJSON.FeatureCollection | null> {
    await this.loadData()

    // Get mainland territory (no repositioning needed)
    const mainland = await this.getMainLandData()
    if (!mainland)
      return null

    const allOverseasData = await this.getOverseasData()

    // Filter overseas territories based on selected mode using centralized configuration
    const allowedCodes = getTerritoriesForMode(mode as any)
    const filteredOverseas = allOverseasData.filter(territory =>
      allowedCodes.includes(territory.code),
    )

    // CREATE UNIFIED DATASET with ORIGINAL coordinates - no repositioning!
    const unifiedFeatures = [...mainland.features]

    // Add overseas territories with their ORIGINAL coordinates
    filteredOverseas.forEach((territory) => {
      // Add original overseas features without any coordinate transformation
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
