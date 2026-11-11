import type { Topology } from 'topojson-specification'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { logger } from '#scripts/utils/logger'

const RESOLUTIONS = {
  HIGH: '10m',
  MEDIUM: '50m',
  LOW: '110m',
} as const

export type Resolution = typeof RESOLUTIONS[keyof typeof RESOLUTIONS]

export const DEFAULT_RESOLUTION: Resolution = RESOLUTIONS.MEDIUM

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
  return Object.values(RESOLUTIONS).includes(resolution as Resolution)
}
