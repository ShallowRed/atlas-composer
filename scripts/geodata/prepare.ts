import type { Topology } from 'topojson-specification'
import type { BackendConfig, BackendTerritory } from '#scripts/config/adapter'
import type { TerritoryFeature } from '../../packages/preset-library/src/territories.js'
import * as topojson from 'topojson-client'
import { topology as toTopologyOf } from 'topojson-server'
import { loadConfig } from '#scripts/config/loader'
import { logger } from '#scripts/utils/logger'
import { buildTerritories, createNaturalEarthSource } from '../../packages/preset-library/src/territories.js'

interface Metadata {
  name: string
  description: string
  source: string
  sourceUrl: string
  resolution: string
  created: string
  territories: Record<string, BackendTerritory>
  count: number
}

export interface PreparedAtlasData {
  outputName: string
  territories: { type: 'FeatureCollection', features: TerritoryFeature[] }
  metadata: Metadata
}

function createMetadata(config: BackendConfig, resolution: string, dataSourceUrl: string, created: string): Metadata {
  return {
    name: config.name,
    description: config.description,
    source: 'Natural Earth',
    sourceUrl: dataSourceUrl,
    resolution,
    created,
    territories: config.territories,
    count: Object.keys(config.territories).length,
  }
}

function naturalEarthUrl(resolution: string): string {
  return `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-${resolution}.json`
}

function countriesOf(topology: Topology) {
  const countries = topology.objects.countries
  if (!countries) {
    throw new Error('No countries object found in world data')
  }
  return topojson.feature(topology, countries)
}

/**
 * Builds the territories of an atlas from a Natural Earth topology. At another resolution than 50m, ruleTopology is
 * the 50m topology, whose polygons the extraction rules count.
 */
export async function prepareAtlasData(
  atlasName: string,
  topology: Topology,
  options: { resolution: string, created: string, ruleTopology?: Topology },
): Promise<PreparedAtlasData> {
  const { unified, backend: config } = await loadConfig(atlasName)
  const ruleFeatures = options.ruleTopology && countriesOf(options.ruleTopology)
  const source = createNaturalEarthSource(countriesOf(topology), options.resolution, ruleFeatures)
  const { collection, skippedFeatures, leftOutPolygons } = buildTerritories(unified, source)
  if (skippedFeatures.length > 0) {
    logger.warning(`  Skipped ${skippedFeatures.length} features without id, geometry or name: ${skippedFeatures.join(', ')}`)
  }
  if (leftOutPolygons.length > 0) {
    const polygons = leftOutPolygons.map(({ code, centroid: [longitude, latitude] }) => `${code} (${longitude.toFixed(2)}, ${latitude.toFixed(2)})`)
    logger.warning(`  Left out ${leftOutPolygons.length} polygons that ${options.resolution} draws far from their territory: ${polygons.join(', ')}`)
  }
  logger.success(`  Total territories: ${collection.features.length}`)
  return {
    outputName: config.outputName || atlasName,
    territories: collection,
    metadata: createMetadata(config, options.resolution, naturalEarthUrl(options.resolution), options.created),
  }
}

/** The territories of an atlas as a topology, whose object `territories` holds one geometry per territory */
export function toTopology(territories: PreparedAtlasData['territories']): Topology {
  return toTopologyOf({ territories } as Record<string, GeoJSON.FeatureCollection>, 1e5)
}
