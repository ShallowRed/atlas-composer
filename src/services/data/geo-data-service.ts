import type { GeoDataError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { GeoDataConfig } from '@/types'
import * as d3 from 'd3-geo'
import * as topojson from 'topojson-client'
import { err, ok } from '@/core/types/result'
import { logger } from '@/utils/logger'

const debug = logger.data.loader

interface TerritoryRecord {
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
  territory: TerritoryRecord
  feature: GeoJSON.Feature
  bounds: [number, number, number, number]
}

export class GeoDataService {
  private territoryData: Map<string, TerritoryGeoData> = new Map()
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
      const topology = await this.fetchJson(this.config.dataPath)
      if (!topology.ok) {
        return topology
      }
      this.topologyData = topology.value

      const metadata = await this.fetchJson(this.config.metadataPath)
      if (!metadata.ok) {
        return metadata
      }

      const processResult = await this.processTerritoriesData()
      if (!processResult.ok) {
        return processResult
      }

      this.isLoaded = true
      return ok(undefined)
    }
    catch (error) {
      debug('Data processing error: %O', error)
      return err({ code: 'GEODATA_INVALID_STRUCTURE', path: this.config.dataPath })
    }
  }

  private async fetchJson(path: string): Promise<Result<unknown, GeoDataError>> {
    let response: Response
    try {
      response = await fetch(path)
    }
    catch (error) {
      debug('Fetch error for %s: %O', path, error)
      return err({ code: 'GEODATA_UNREACHABLE', path })
    }

    if (!response.ok) {
      return response.status === 404
        ? err({ code: 'GEODATA_NOT_FOUND', path })
        : err({ code: 'GEODATA_NETWORK_ERROR', path, status: response.status })
    }

    // The Vite server answers a missing file of src/public/ with index.html
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return err({ code: 'GEODATA_NOT_FOUND', path })
    }

    try {
      return ok(await response.json())
    }
    catch (error) {
      debug('JSON parse error for %s: %O', path, error)
      return err({ code: 'GEODATA_INVALID_JSON', path })
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
        return err({ code: 'GEODATA_MISSING_OBJECT', objectName })
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

      const territory: TerritoryRecord = {
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

  private ensureLoaded(): void {
    if (!this.isLoaded) {
      throw new Error('GeoDataService read before a successful loadData')
    }
  }

  async getCompleteData(): Promise<GeoJSON.FeatureCollection> {
    this.ensureLoaded()

    const allFeatures: GeoJSON.Feature[] = []

    for (const [_, territoryData] of this.territoryData) {
      allFeatures.push(territoryData.feature)
    }

    return {
      type: 'FeatureCollection',
      features: allFeatures,
    }
  }

  async getRawUnifiedData(_mode: string, territoryCodes?: readonly string[]): Promise<GeoJSON.FeatureCollection | null> {
    this.ensureLoaded()

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

  async getAllTerritories(): Promise<TerritoryGeoData[]> {
    this.ensureLoaded()
    return Array.from(this.territoryData.values())
  }
}
