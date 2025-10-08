/**
 * Natural Earth Data Utilities
 * Handles fetching and caching of Natural Earth world data
 */

import process from 'node:process'
import { logger } from './logger.js'

/**
 * Valid Natural Earth resolutions
 */
export const RESOLUTIONS = {
  HIGH: '10m',
  MEDIUM: '50m',
  LOW: '110m',
}

/**
 * Default resolution
 */
export const DEFAULT_RESOLUTION = RESOLUTIONS.MEDIUM

/**
 * Get Natural Earth data source URL for a given resolution
 *
 * @param {string} resolution - One of: '10m', '50m', '110m'
 * @returns {string} CDN URL
 */
export function getDataSourceUrl(resolution = DEFAULT_RESOLUTION) {
  if (!Object.values(RESOLUTIONS).includes(resolution)) {
    logger.warning(`Invalid resolution '${resolution}', using '${DEFAULT_RESOLUTION}'`)
    resolution = DEFAULT_RESOLUTION
  }

  return `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-${resolution}.json`
}

/**
 * Fetch Natural Earth world data from CDN
 *
 * @param {string} resolution - One of: '10m', '50m', '110m'
 * @returns {Promise<object>} TopoJSON data
 */
export async function fetchWorldData(resolution = DEFAULT_RESOLUTION) {
  const url = getDataSourceUrl(resolution)

  try {
    logger.info(`Fetching Natural Earth data (${resolution})...`)
    logger.dim(`Source: ${url}`)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    logger.success(`Loaded ${Object.keys(data.objects || {}).length} object(s) from Natural Earth`)

    return data
  }
  catch (error) {
    logger.error(`Failed to fetch Natural Earth data: ${error.message}`)
    throw error
  }
}

/**
 * Validate resolution string
 *
 * @param {string} resolution - Resolution to validate
 * @returns {boolean} True if valid
 */
export function isValidResolution(resolution) {
  return Object.values(RESOLUTIONS).includes(resolution)
}

/**
 * Get resolution from environment variable or default
 *
 * @returns {string} Resolution ('10m', '50m', or '110m')
 */
export function getResolutionFromEnv() {
  const envResolution = process.env.NE_RESOLUTION

  if (envResolution && isValidResolution(envResolution)) {
    return envResolution
  }

  if (envResolution) {
    logger.warning(`Invalid NE_RESOLUTION='${envResolution}', using '${DEFAULT_RESOLUTION}'`)
  }

  return DEFAULT_RESOLUTION
}
