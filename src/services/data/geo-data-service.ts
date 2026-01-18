import type { GeoDataError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { GeoDataConfig, TerritoryConfig } from '@/types'
import * as d3 from 'd3-geo'
import * as topojson from 'topojson-client'
import { Errors } from '@/core/types/errors'
import { err, ok } from '@/core/types/result'
import { logger } from '@/utils/logger'

const debug = logger.data.loader

export interface Territory {
  id: string
  iso: string
  name: string
  code: string
  area: number
  geometry?: any
  bounds?: [number, number, number, number]
  center?: [number, number]
}

export interface TerritoryGeoData {
  territory: Territory
  feature: GeoJSON.Feature
  bounds: [number, number, number, number]
}

export class GeoDataService {
  private territoryData: Map<string, TerritoryGeoData> = new Map()
  private metadata: any = null
  private topologyData: any = null
  private isLoaded = false
  public readonly config: GeoDataConfig

  constructor(config: GeoDataConfig) {
    this.config = config
  }

  async loadData(): Promise<Result<void, GeoDataError>> {
    if (this.isLoaded) {
      return ok(undefined)
    }

    try {
      const response = await fetch(this.config.dataPath)

      if (!response.ok) {
        if (response.status === 404) {
          return err(Errors.geoDataNotFound(this.config.dataPath))
        }
        return err(Errors.geoDataNetworkError(this.config.dataPath, response.status))
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        return err(Errors.geoDataNotFound(this.config.dataPath))
      }

      try {
        this.topologyData = await response.json()
      }
      catch (parseError) {
        debug('TopoJSON parse error: %O', parseError)
        return err(Errors.geoDataInvalidJson(this.config.dataPath, String(parseError)))
      }

      const metaResponse = await fetch(this.config.metadataPath)

      if (!metaResponse.ok) {
        if (metaResponse.status === 404) {
          return err(Errors.geoDataNotFound(this.config.metadataPath))
        }
        return err(Errors.geoDataNetworkError(this.config.metadataPath, metaResponse.status))
      }

      const metaContentType = metaResponse.headers.get('content-type')
      if (!metaContentType || !metaContentType.includes('application/json')) {
        return err(Errors.geoDataNotFound(this.config.metadataPath))
      }

      try {
        this.metadata = await metaResponse.json()
      }
      catch (parseError) {
        debug('Metadata parse error: %O', parseError)
        return err(Errors.geoDataInvalidJson(this.config.metadataPath, String(parseError)))
      }

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

  private async processTerritoriesData(): Promise<Result<void, GeoDataError>> {
    let featureCollection: GeoJSON.FeatureCollection

    if (this.topologyData.type === 'FeatureCollection') {
      featureCollection = this.topologyData as GeoJSON.FeatureCollection
    }
    else {
      const objectName = this.config.topologyObjectName
      if (!this.topologyData?.objects?.[objectName]) {
        return err(Errors.geoDataMissingObject(objectName))
      }

      featureCollection = topojson.feature(
        this.topologyData,
        this.topologyData.objects[objectName],
      ) as any as GeoJSON.FeatureCollection
    }

    const isWildcard = this.config.isWildcard === true

    for (const feature of featureCollection.features) {
      if (!feature.properties)
        continue

      const featureId = feature.id || feature.properties.id
      const territoryCode = isWildcard && !feature.properties.code
        ? `WD-${featureId}`
        : feature.properties.code

      if (!isWildcard && !feature.properties.code) {
        continue
      }

      if (isWildcard && (!featureId || !feature.properties.name)) {
        continue
      }

      const territory: Territory = {
        id: String(featureId),
        iso: feature.properties.iso || '', // May be empty for world data
        name: feature.properties.name,
        code: territoryCode,
        area: this.calculateArea(feature),
      }

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

  private calculateArea(feature: GeoJSON.Feature): number {
    const areaInSteradians = d3.geoArea(feature)
    const earthRadiusKm = 6371 // Earth's radius in kilometers
    const areaInKm2 = areaInSteradians * earthRadiusKm * earthRadiusKm
    return Math.round(areaInKm2)
  }

  private calculateBounds(feature: GeoJSON.Feature): [number, number, number, number] {
    const bounds = d3.geoBounds(feature)
    return [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]]
  }

  private calculateCenter(bounds: [number, number, number, number]): [number, number] {
    const [minX, minY, maxX, maxY] = bounds
    return [(minX + maxX) / 2, (minY + maxY) / 2]
  }

  private async ensureLoaded(): Promise<void> {
    const result = await this.loadData()
    if (!result.ok) {
      throw new Error(`GeoData load failed: ${result.error.type}`)
    }
  }

  async getCompleteData(): Promise<GeoJSON.FeatureCollection> {
    await this.ensureLoaded()

    const allFeatures: GeoJSON.Feature[] = []

    for (const [_, territoryData] of this.territoryData) {
      allFeatures.push(territoryData.feature)
    }

    return {
      type: 'FeatureCollection',
      features: allFeatures,
    }
  }

  async getAllTerritoriesData(): Promise<Array<{ name: string, code: string, data: GeoJSON.FeatureCollection, area: number, region: string }>> {
    await this.ensureLoaded()
    const territoriesData = []

    for (const [code, territoryData] of this.territoryData) {
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

    return territoriesData.sort((a, b) => {
      if (a.region !== b.region) {
        return a.region.localeCompare(b.region)
      }
      return b.area - a.area
    })
  }

  async getRawUnifiedData(_mode: string, territoryCodes?: readonly string[]): Promise<GeoJSON.FeatureCollection | null> {
    await this.ensureLoaded()

    if (!territoryCodes) {
      return await this.getCompleteData()
    }

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
