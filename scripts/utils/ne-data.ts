import type { Topology } from 'topojson-specification'
import type { NaturalEarthResolution } from '../../packages/preset-library/src/territories.js'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { logger } from '#scripts/utils/logger'

export type Resolution = NaturalEarthResolution

export const DEFAULT_RESOLUTION: Resolution = '50m'

// Literal calls of require.resolve, which knip reads as uses of world-atlas
const require = createRequire(import.meta.url)
const TOPOLOGY_PATHS: Record<Resolution, string> = {
  '10m': require.resolve('world-atlas/countries-10m.json'),
  '50m': require.resolve('world-atlas/countries-50m.json'),
  '110m': require.resolve('world-atlas/countries-110m.json'),
}

export async function readWorldData(resolution: Resolution = DEFAULT_RESOLUTION): Promise<Topology> {
  const path = TOPOLOGY_PATHS[resolution]
  logger.info(`Reading Natural Earth data (${resolution})...`)
  logger.dim(`Source: ${path}`)
  return JSON.parse(await readFile(path, 'utf8')) as Topology
}

export function isValidResolution(resolution: string): resolution is Resolution {
  return Object.hasOwn(TOPOLOGY_PATHS, resolution)
}
