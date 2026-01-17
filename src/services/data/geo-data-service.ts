import type { GeoDataError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { GeoDataConfig, TerritoryConfig } from '@/types'
import * as d3 from 'd3-geo'
import * as topojson from 'topojson-client'
import { Errors } from '@/core/types/errors'
import { err, ok } from '@/core/types/result'
import { logger } from '@/utils/logger'

const debug = logger.data.loader

/**
 * Represents a territory
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
  public readonly config: GeoDataConfig // Service configuration

  constructor(config: GeoDataConfig) {
    this.config = config
  }

  /**
   * Loads and processes geographic data from the configured data source
   * Downloads TopoJSON and metadata, then converts to processable format
   * @returns Result with void on success, or GeoDataError on failure
   */
  async loadData(): Promise<Result<void, GeoDataError>> {
    if (this.isLoaded) {
      return ok(undefined)
    }

    try {
      // Load TopoJSON data containing territories
      const response = await fetch(this.config.dataPath)

      // Check response status before attempting to parse JSON
      if (!response.ok) {
        if (response.status === 404) {
          return err(Errors.geoDataNotFound(this.config.dataPath))
        }
        return err(Errors.geoDataNetworkError(this.config.dataPath, response.status))
      }

      // Verify content type is JSON before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        return err(Errors.geoDataNotFound(this.config.dataPath))
      }

      // Parse JSON only if response was successful
      try {
        this.topologyData = await response.json()
      }
      catch (parseError) {
        debug('TopoJSON parse error: %O', parseError)
        return err(Errors.geoDataInvalidJson(this.config.dataPath, String(parseError)))
      }

      // Load metadata with territory information
      const metaResponse = await fetch(this.config.metadataPath)

      // Check response status before attempting to parse JSON
      if (!metaResponse.ok) {
        if (metaResponse.status === 404) {
          return err(Errors.geoDataNotFound(this.config.metadataPath))
        }
        return err(Errors.geoDataNetworkError(this.config.metadataPath, metaResponse.status))
      }

      // Verify content type is JSON before parsing
      const metaContentType = metaResponse.headers.get('content-type')
      if (!metaContentType || !metaContentType.includes('application/json')) {
        return err(Errors.geoDataNotFound(this.config.metadataPath))
      }

      // Parse JSON only if response was successful
      try {
        this.metadata = await metaResponse.json()
      }
      catch (parseError) {
        debug('Metadata parse error: %O', parseError)
        return err(Errors.geoDataInvalidJson(this.config.metadataPath, String(parseError)))
      }

      // Convert TopoJSON to GeoJSON and process each territory
      const processResult = await this.processTerritoriesData()
      if (!processResult.ok) {
        return processResult
      }

      this.isLoaded = true
      return ok(undefined)
    }
    catch (error) {
      debug('Data loading error: %O', error)
      return err(Errors.geoDataInvalidStructure(this.config.dataPath, String(error)))
    }
  }

  /**
   * Processes geographic data into usable territory objects
   * Supports both GeoJSON (preferred) and TopoJSON (for backward compatibility) formats
   * Calculates geographic properties for each territory
   * @returns Result with void on success, or GeoDataError on failure
   */
  private async processTerritoriesData(): Promise<Result<void, GeoDataError>> {
    let featureCollection: GeoJSON.FeatureCollection

    // Check if data is already GeoJSON FeatureCollection (preferred format)
    if (this.topologyData.type === 'FeatureCollection') {
      featureCollection = this.topologyData as GeoJSON.FeatureCollection
    }
    // Otherwise, convert from TopoJSON (backward compatibility)
    else {
      const objectName = this.config.topologyObjectName
      if (!this.topologyData?.objects?.[objectName]) {
        return err(Errors.geoDataMissingObject(objectName))
      }

      // Convert TopoJSON topology to GeoJSON FeatureCollection
      featureCollection = topojson.feature(
        this.topologyData,
        this.topologyData.objects[objectName],
      ) as any as GeoJSON.FeatureCollection
    }

    // Check if this is a wildcard configuration
    // Wildcard atlases load all territories from the data file without filtering
    const isWildcard = this.config.isWildcard === true

    for (const feature of featureCollection.features) {
      if (!feature.properties)
        continue

      // For wildcard atlases: generate code from id, use name from properties
      // For explicit atlases: use existing code from properties
      // Note: In TopoJSON, id is at feature level, not in properties
      const featureId = feature.id || feature.properties.id
      const territoryCode = isWildcard && !feature.properties.code
        ? `WD-${featureId}`
        : feature.properties.code

      // For wildcard atlases, skip if missing required data
      // For explicit atlases, skip if code is missing (territory not configured)
      if (!isWildcard && !feature.properties.code) {
        continue
      }

      if (isWildcard && (!featureId || !feature.properties.name)) {
        continue
      }

      // Create territory metadata with calculated area
      const territory: Territory = {
        id: String(featureId),
        iso: feature.properties.iso || '', // May be empty for world data
        name: feature.properties.name,
        code: territoryCode,
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

    return ok(undefined)
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
   * Internal helper to ensure data is loaded, throws if loading fails
   * Used by methods that need data loaded but don't want to propagate Result
   */
  private async ensureLoaded(): Promise<void> {
    const result = await this.loadData()
    if (!result.ok) {
      // This should only happen if loadData was never called before
      // or if it failed on the first attempt
      throw new Error(`GeoData load failed: ${result.error.type}`)
    }
  }

  /**
   * Returns the first/primary territory geographic data (for split view)
   * @returns FeatureCollection containing first territory, or null if none
   */
  async getPrimaryTerritoryData(): Promise<GeoJSON.FeatureCollection | null> {
    await this.ensureLoaded()

    const territories = Array.from(this.territoryData.values())
    if (territories.length === 0) {
      return null
    }

    const primary = territories[0]
    return {
      type: 'FeatureCollection',
      features: [primary.feature],
    }
  }

  /**
   * Returns the complete, unmodified territory data for all territories
   * Used for built-in composite projections that handle positioning internally
   * @returns FeatureCollection containing all territory data with original coordinates
   */
  async getCompleteData(): Promise<GeoJSON.FeatureCollection> {
    await this.ensureLoaded()

    const allFeatures: GeoJSON.Feature[] = []

    // Add all territories without any extraction or filtering
    for (const [_, territoryData] of this.territoryData) {
      allFeatures.push(territoryData.feature)
    }

    return {
      type: 'FeatureCollection',
      features: allFeatures,
    }
  }

  /**
   * Returns all territories geographic data as array
   * All territories are treated equally
   * @returns Array of territory objects with geographic and metadata
   */
  async getAllTerritoriesData(): Promise<Array<{ name: string, code: string, data: GeoJSON.FeatureCollection, area: number, region: string }>> {
    await this.ensureLoaded()
    const territoriesData = []

    for (const [code, territoryData] of this.territoryData) {
      // Find territory config to get region
      const territoryConfig = this.config.territories.find((t: TerritoryConfig) => t.code === code)
      territoriesData.push({
        name: territoryData.territory.name,
        code: territoryData.territory.code,
        area: territoryData.territory.area,
        region: territoryConfig?.region || 'Other',
        data: {
          type: 'FeatureCollection' as const,
          features: [territoryData.feature],
        },
      })
    }

    // Sort by region then by area (largest first)
    return territoriesData.sort((a, b) => {
      if (a.region !== b.region) {
        return a.region.localeCompare(b.region)
      }
      return b.area - a.area
    })
  }

  /**
   * Returns raw geographic data with original coordinates for composite projections
   * @param _mode - Display mode determining which territories to include (unused, kept for API compatibility)
   * @param territoryCodes - Array of territory codes to include (undefined = all)
   * @returns Combined territory data with ORIGINAL coordinates (no repositioning)
   */
  async getRawUnifiedData(_mode: string, territoryCodes?: readonly string[]): Promise<GeoJSON.FeatureCollection | null> {
    await this.ensureLoaded()

    // If no filter specified, return all territories
    if (!territoryCodes) {
      return await this.getCompleteData()
    }

    // Filter features by territory codes
    const allFeatures: GeoJSON.Feature[] = []
    for (const code of territoryCodes) {
      const territory = this.territoryData.get(code)
      if (territory) {
        allFeatures.push(territory.feature)
      }
    }
    return { type: 'FeatureCollection', features: allFeatures }
  }

  getTerritoryInfo(): Territory[] {
    const territories = Array.from(this.territoryData.values()).map(data => data.territory)
    return territories.sort((a, b) => b.area - a.area) // Tri par superficie
  }

  async getTerritory(code: string): Promise<TerritoryGeoData | null> {
    await this.ensureLoaded()
    return this.territoryData.get(code) || null
  }

  async getAllTerritories(): Promise<TerritoryGeoData[]> {
    await this.ensureLoaded()
    return Array.from(this.territoryData.values())
  }

  getMetadata() {
    return this.metadata
  }
}
