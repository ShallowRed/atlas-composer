import type { Topology } from 'topojson-specification'
import type { JSONAtlasConfig } from '#types'
import type { NaturalEarthResolution } from '../../packages/preset-library/src/territories.js'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { logger } from '#scripts/utils/logger'

export type Resolution = NaturalEarthResolution

// Literal calls of require.resolve, which knip reads as uses of world-atlas
const require = createRequire(import.meta.url)
const TOPOLOGY_PATHS: Record<Resolution, string> = {
  '10m': require.resolve('world-atlas/countries-10m.json'),
  '50m': require.resolve('world-atlas/countries-50m.json'),
  '110m': require.resolve('world-atlas/countries-110m.json'),
}

export async function readWorldData(resolution: Resolution): Promise<Topology> {
  const path = TOPOLOGY_PATHS[resolution]
  logger.info(`Reading Natural Earth data (${resolution})...`)
  logger.dim(`Source: ${path}`)
  return JSON.parse(await readFile(path, 'utf8')) as Topology
}

export function isValidResolution(resolution: string): resolution is Resolution {
  return Object.hasOwn(TOPOLOGY_PATHS, resolution)
}

const DATA_SOURCE_RESOLUTION = /-(\d+m)\.json$/

export function resolutionOfDataSources(dataSources: JSONAtlasConfig['dataSources']): Resolution {
  const resolutions = new Set([dataSources.territories, dataSources.metadata].map(file => DATA_SOURCE_RESOLUTION.exec(file)?.[1]))
  const [resolution] = resolutions
  if (resolutions.size !== 1 || !resolution || !isValidResolution(resolution))
    throw new Error(`The dataSources ${dataSources.territories} and ${dataSources.metadata} end with no common Natural Earth resolution (10m, 50m, 110m): pass --resolution`)
  return resolution
}
