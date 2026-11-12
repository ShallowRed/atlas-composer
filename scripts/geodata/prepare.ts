import type { Topology } from 'topojson-specification'
import type { BackendConfig, BackendTerritory } from '#scripts/config/adapter'
import type { TerritoryFeature } from '../../packages/preset-library/src/territories.js'
import * as topojson from 'topojson-client'
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

export async function prepareAtlasData(
  atlasName: string,
  topology: Topology,
  options: { resolution: string, created: string },
): Promise<PreparedAtlasData> {
  const { unified, backend: config } = await loadConfig(atlasName)
  const countries = topology.objects.countries
  if (!countries) {
    throw new Error('No countries object found in world data')
  }
  const { collection, skippedFeatures } = buildTerritories(unified, createNaturalEarthSource(topojson.feature(topology, countries), options.resolution))
  if (skippedFeatures.length > 0) {
    logger.warning(`  Skipped ${skippedFeatures.length} features without id, geometry or name: ${skippedFeatures.join(', ')}`)
  }
  logger.success(`  Total territories: ${collection.features.length}`)
  return {
    outputName: config.outputName || atlasName,
    territories: collection,
    metadata: createMetadata(config, options.resolution, naturalEarthUrl(options.resolution), options.created),
  }
}
