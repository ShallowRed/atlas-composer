import type { Topology } from 'topojson-specification'
import type { GeoDataError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { GeoDataConfig } from '@/types'
import * as d3 from 'd3-geo'
import * as topojson from 'topojson-client'
import { err, ok } from '@/core/types/result'
import { JsonFileLoader } from '@/services/data/json-file-loader'
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

const TERRITORIES_OBJECT = 'territories'

/** The territories of a file of src/public/data/: a topology whose object `territories` holds one geometry per territory, with its code */
export function territoryFeatures(topology: unknown, path: string): Result<GeoJSON.Feature[], GeoDataError> {
  const candidate = topology as Partial<Topology> | null
  if (candidate?.type !== 'Topology' || !Array.isArray(candidate.arcs) || !candidate.objects) {
    return err({ code: 'GEODATA_INVALID_STRUCTURE', path })
  }
  const territories = candidate.objects[TERRITORIES_OBJECT]
  if (territories?.type !== 'GeometryCollection') {
    return err({ code: 'GEODATA_MISSING_OBJECT', objectName: TERRITORIES_OBJECT })
  }
  return ok(topojson.feature(candidate as Topology, territories).features)
}

export interface TerritoryGeoData {
  territory: TerritoryRecord
  feature: GeoJSON.Feature
  bounds: [number, number, number, number]
}

export class GeoDataService {
  private territoryData: Map<string, TerritoryGeoData> = new Map()
  private topologyData: unknown = null
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
      const topology = await JsonFileLoader.loadUrl(this.config.dataPath)
      if (!topology.ok) {
        return topology
      }
      this.topologyData = topology.value

      const metadata = await JsonFileLoader.loadUrl(this.config.metadataPath)
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

  private async processTerritoriesData(): Promise<Result<void, GeoDataError>> {
    const features = territoryFeatures(this.topologyData, this.config.dataPath)
    if (!features.ok) {
      return features
    }

    for (const feature of features.value) {
      const code = feature.properties?.code
      if (!code) {
        continue
      }

      const territory: TerritoryRecord = {
        id: String(feature.id ?? feature.properties?.id),
        iso: feature.properties?.iso || '', // Empty for the world
        name: feature.properties?.name,
        code,
        area: this.calculateArea(feature),
      }

      const bounds = this.calculateBounds(feature)
      const center = this.calculateCenter(bounds)

      this.territoryData.set(code, {
        territory: { ...territory, bounds, center },
        feature,
        bounds,
      })
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
