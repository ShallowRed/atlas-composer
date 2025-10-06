#!/usr/bin/env node

/**
 * Geographic Data Preparation Script
 * Downloads Natural Earth world data and filters specific territories
 * Creates optimized TopoJSON files for cartographic visualization
 *
 * Usage:
 *   node prepare-geodata.js [config-name]
 *   NE_RESOLUTION=10m node prepare-geodata.js france
 *
 * Examples:
 *   node prepare-geodata.js                  # Uses default config (france)
 *   node prepare-geodata.js spain            # Uses spain config
 *   NE_RESOLUTION=10m node prepare-geodata.js france  # High resolution
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Natural Earth data resolution
 * Available options: '110m' (lowest detail), '50m' (medium), '10m' (highest detail)
 * Can be overridden with NE_RESOLUTION environment variable
 */
const NATURAL_EARTH_RESOLUTION = process.env.NE_RESOLUTION || '50m'

/**
 * Data source URL for Natural Earth countries dataset
 */
const DATA_SOURCE = `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-${NATURAL_EARTH_RESOLUTION}.json`

/**
 * Output directory for processed geographic data
 */
const OUTPUT_DIR = path.join(process.cwd(), 'src/public', 'data')

/**
 * Configurations directory
 */
const CONFIGS_DIR = path.join(__dirname, 'configs')

/**
 * Output filenames for each data file
 */
const OUTPUT_FILENAMES = {
  world: `world-countries-${NATURAL_EARTH_RESOLUTION}.json`,
  territories: configName => `${configName}-territories.json`,
  metadata: configName => `${configName}-metadata.json`,
}

/**
 * Console colors for better readability
 */
const COLORS = {
  reset: '\x1B[0m',
  green: '\x1B[32m',
  blue: '\x1B[34m',
  yellow: '\x1B[33m',
  red: '\x1B[31m',
}

// ============================================================================
// CONFIGURATION LOADER
// ============================================================================

/**
 * Load a territory configuration from the configs directory
 * @param {string} configName - Name of the configuration file (without .js extension)
 * @returns {Promise<object>} The configuration object
 */
async function loadConfig(configName) {
  try {
    const configPath = path.join(CONFIGS_DIR, `${configName}.js`)
    const configModule = await import(configPath)
    return configModule.default
  }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

/**
 * List all available configurations
 * @returns {Promise<string[]>} Array of available config names
 */
async function listAvailableConfigs() {
  try {
    const files = await fs.readdir(CONFIGS_DIR)
    return files
      .filter(file => file.endsWith('.js') && !file.startsWith('.'))
      .map(file => file.replace('.js', ''))
  }
  catch (error) {
    console.error(`${COLORS.red}Error reading configs directory: ${error.message}${COLORS.reset}`)
    return []
  }
}

// ============================================================================
// DATA PROCESSING FUNCTIONS
// ============================================================================

/**
 * Download data from a URL and save it to a file
 * @param {string} url - The URL to download from
 * @param {string} filename - The filename to save to (in OUTPUT_DIR)
 */
async function downloadData(url, filename) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`)
  }

  const data = await response.json()
  const outputPath = path.join(OUTPUT_DIR, filename)

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  // Write the file
  await fs.writeFile(outputPath, JSON.stringify(data))
  console.log(`${COLORS.green}✓ Saved ${filename}${COLORS.reset}`)
}

/**
 * Filter TopoJSON data to include only specified territories
 * @param {object} worldData - The full world TopoJSON data
 * @param {object} territoriesConfig - Territory ID mapping
 * @returns {object} Filtered TopoJSON containing only specified territories
 */
function filterTerritories(worldData, territoriesConfig) {
  // Territory IDs as strings (world-atlas uses string IDs)
  const territoryIds = Object.keys(territoriesConfig)

  return {
    type: worldData.type,
    transform: worldData.transform,
    objects: {
      countries: {
        type: 'GeometryCollection',
        geometries: worldData.objects.countries.geometries.filter(geometry =>
          territoryIds.includes(String(geometry.id)),
        ),
      },
    },
    arcs: worldData.arcs,
  }
}

/**
 * Create metadata file for the filtered territories
 * @param {object} territoriesConfig - Territory configuration object
 * @returns {object} Metadata object
 */
function createMetadata(territoriesConfig) {
  return {
    name: territoriesConfig.name,
    description: territoriesConfig.description,
    source: 'Natural Earth',
    sourceUrl: DATA_SOURCE,
    resolution: NATURAL_EARTH_RESOLUTION,
    created: new Date().toISOString(),
    territories: territoriesConfig.territories,
    count: Object.keys(territoriesConfig.territories).length,
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Get configuration name from command line (default: france)
    const configName = process.argv[2] || 'france'

    // Load the configuration
    const CONFIG = await loadConfig(configName)

    if (!CONFIG) {
      const availableConfigs = await listAvailableConfigs()
      console.error(`${COLORS.red}Configuration not found: ${configName}${COLORS.reset}`)
      if (availableConfigs.length > 0) {
        console.log(`${COLORS.blue}Available configurations: ${availableConfigs.join(', ')}${COLORS.reset}`)
      }
      else {
        console.log(`${COLORS.yellow} No configurations found in ${CONFIGS_DIR}${COLORS.reset}`)
      }
      process.exit(1)
    }

    console.log(`${COLORS.blue}  Preparing geodata for: ${CONFIG.name}${COLORS.reset}`)
    console.log(`${COLORS.blue}   Description: ${CONFIG.description}${COLORS.reset}`)
    console.log(`${COLORS.blue}   Resolution: ${NATURAL_EARTH_RESOLUTION}${COLORS.reset}`)
    console.log(`${COLORS.blue}   Territories: ${Object.keys(CONFIG.territories).length}${COLORS.reset}\n`)

    // Step 1: Download and save world data
    console.log(`${COLORS.blue} Downloading world data...${COLORS.reset}`)
    const worldFilename = OUTPUT_FILENAMES.world
    await downloadData(DATA_SOURCE, worldFilename)

    // Step 2: Filter and save territory data
    console.log(`${COLORS.blue} Filtering ${CONFIG.name} territories...${COLORS.reset}`)
    const worldData = JSON.parse(
      await fs.readFile(path.join(OUTPUT_DIR, worldFilename), 'utf8'),
    )
    const territoryData = filterTerritories(worldData, CONFIG.territories)

    const territoriesFilename = OUTPUT_FILENAMES.territories(CONFIG.outputName || configName)
    await fs.writeFile(
      path.join(OUTPUT_DIR, territoriesFilename),
      JSON.stringify(territoryData),
    )
    console.log(`${COLORS.green}✓ Saved ${territoriesFilename}${COLORS.reset}`)

    // Step 3: Create and save metadata
    console.log(`${COLORS.blue} Creating metadata...${COLORS.reset}`)
    const metadata = createMetadata(CONFIG)

    const metadataFilename = OUTPUT_FILENAMES.metadata(CONFIG.outputName || configName)
    await fs.writeFile(
      path.join(OUTPUT_DIR, metadataFilename),
      JSON.stringify(metadata, null, 2),
    )
    console.log(`${COLORS.green}✓ Saved ${metadataFilename}${COLORS.reset}`)

    console.log(`\n${COLORS.green} All done!${COLORS.reset}`)
  }
  catch (error) {
    console.error(`${COLORS.red}Error:${COLORS.reset}`, error)
    process.exit(1)
  }
}

main()
