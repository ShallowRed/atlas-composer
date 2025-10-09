/**
 * Natural Earth Data Utilities
 * Handles fetching and caching of Natural Earth world data
 */

import type { Topology } from 'topojson-specification'
import process from 'node:process'
import { logger } from '#scripts/utils/logger'

/**
 * Valid Natural Earth resolutions
 */
export const RESOLUTIONS = {
  HIGH: '10m',
  MEDIUM: '50m',
  LOW: '110m',
} as const

export type Resolution = typeof RESOLUTIONS[keyof typeof RESOLUTIONS]

/**
 * Default resolution
 */
export const DEFAULT_RESOLUTION: Resolution = RESOLUTIONS.MEDIUM

/**
 * Get Natural Earth data source URL for a given resolution
 */
export function getDataSourceUrl(resolution: Resolution = DEFAULT_RESOLUTION): string {
  if (!Object.values(RESOLUTIONS).includes(resolution)) {
    logger.warning(`Invalid resolution '${resolution}', using '${DEFAULT_RESOLUTION}'`)
    resolution = DEFAULT_RESOLUTION
  }

  return `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-${resolution}.json`
}

/**
 * Fetch Natural Earth world data from CDN
 */
export async function fetchWorldData(resolution: Resolution = DEFAULT_RESOLUTION): Promise<Topology> {
  const url = getDataSourceUrl(resolution)

  try {
    logger.info(`Fetching Natural Earth data (${resolution})...`)
    logger.dim(`Source: ${url}`)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json() as Topology
    logger.success(`Loaded ${Object.keys(data.objects || {}).length} object(s) from Natural Earth`)

    return data
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to fetch Natural Earth data: ${message}`)
    throw error
  }
}

/**
 * Validate resolution string
 */
export function isValidResolution(resolution: string): resolution is Resolution {
  return Object.values(RESOLUTIONS).includes(resolution as Resolution)
}

/**
 * Get resolution from environment variable or default
 */
export function getResolutionFromEnv(): Resolution {
  const envResolution = process.env.NE_RESOLUTION

  if (envResolution && isValidResolution(envResolution)) {
    return envResolution
  }

  if (envResolution) {
    logger.warning(`Invalid NE_RESOLUTION='${envResolution}', using '${DEFAULT_RESOLUTION}'`)
  }

  return DEFAULT_RESOLUTION
}
