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
import * as topojson from 'topojson-client'

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
  territories: configName => `${configName}-territories-${NATURAL_EARTH_RESOLUTION}.json`,
  metadata: configName => `${configName}-metadata-${NATURAL_EARTH_RESOLUTION}.json`,
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
 * Extracts sub-territories from a MultiPolygon GeoJSON feature based on bounds matching
 * Used to extract DOM territories from France mainland MultiPolygon
 * NOTE: This works with GeoJSON format (with coordinates), not TopoJSON
 * @param {object} mainlandFeature - GeoJSON feature with MultiPolygon geometry
 * @param {object} config - Territory configuration with extraction rules
 * @returns {object} Object with mainland feature and extracted territory features
 */
function extractEmbeddedTerritories(mainlandFeature, config) {
  if (!mainlandFeature.geometry || mainlandFeature.geometry.type !== 'MultiPolygon') {
    return {
      mainland: mainlandFeature,
      extracted: [],
    }
  }

  const extracted = []
  const mainlandPolygons = []

  // Find territories to extract (those with extractFrom property)
  const extractionRules = Object.entries(config)
    .filter(([_, terr]) => terr.extractFrom && String(terr.extractFrom) === String(mainlandFeature.id || mainlandFeature.properties?.id))
    .map(([id, terr]) => ({ id, ...terr }))

  if (extractionRules.length === 0) {
    return {
      mainland: mainlandFeature,
      extracted: [],
    }
  }

  // Group extracted polygons by territory
  const extractedGroups = new Map()

  // Iterate through each polygon in the MultiPolygon
  for (const polygon of mainlandFeature.geometry.coordinates) {
    const firstRing = polygon[0]
    if (!firstRing || firstRing.length === 0)
      continue

    // Calculate polygon bounds
    const lons = firstRing.map(coord => coord[0])
    const lats = firstRing.map(coord => coord[1])
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    // Try to match against extraction rules
    let matched = false
    const tolerance = 0.1

    for (const rule of extractionRules) {
      if (!rule.bounds)
        continue

      const [[configMinLon, configMinLat], [configMaxLon, configMaxLat]] = rule.bounds

      if (
        minLon >= (configMinLon - tolerance)
        && maxLon <= (configMaxLon + tolerance)
        && minLat >= (configMinLat - tolerance)
        && maxLat <= (configMaxLat + tolerance)
      ) {
        // This polygon belongs to an embedded territory
        // Add to the group for this territory
        if (!extractedGroups.has(rule.id)) {
          extractedGroups.set(rule.id, {
            id: rule.id,
            name: rule.name,
            code: rule.code,
            iso: rule.iso,
            polygons: [],
          })
        }
        extractedGroups.get(rule.id).polygons.push(polygon)
        matched = true
        break
      }
    }

    // If not matched, it's part of mainland
    if (!matched) {
      mainlandPolygons.push(polygon)
    }
  }

  // Convert grouped polygons to features
  for (const group of extractedGroups.values()) {
    extracted.push({
      type: 'Feature',
      id: group.id,
      properties: {
        name: group.name,
        code: group.code,
        iso: group.iso,
        id: group.id,
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: group.polygons,
      },
    })
  }

  return {
    mainland: {
      ...mainlandFeature,
      geometry: {
        ...mainlandFeature.geometry,
        coordinates: mainlandPolygons,
      },
    },
    extracted,
  }
}

/**
 * Duplicates territory features for multiple projections
 * Used to create FR-PF-2 from FR-PF with same geometry but different code
 * NOTE: This works with GeoJSON features
 * @param {Array} features - Array of GeoJSON features
 * @param {object} config - Territory configuration with duplication rules
 * @returns {Array} Array with original and duplicate features
 */
function duplicateTerritories(features, config) {
  const result = [...features]

  // Find duplication rules (territories with duplicateFrom property)
  const duplicationRules = Object.entries(config)
    .filter(([_, terr]) => terr.duplicateFrom)
    .map(([id, terr]) => ({ id, ...terr }))

  for (const rule of duplicationRules) {
    // Find source feature by ID or code
    const sourceFeature = features.find(f =>
      String(f.id) === String(rule.duplicateFrom)
      || String(f.properties?.id) === String(rule.duplicateFrom)
      || f.properties?.code === rule.duplicateFrom,
    )

    if (sourceFeature) {
      // Create duplicate with new ID and properties
      result.push({
        ...sourceFeature,
        type: 'Feature',
        id: rule.id,
        properties: {
          name: rule.name,
          code: rule.code,
          iso: rule.iso,
          id: rule.id,
        },
      })
      console.log(`${COLORS.blue}  Duplicated ${rule.duplicateFrom} → ${rule.code}${COLORS.reset}`)
    }
    else {
      console.log(`${COLORS.yellow}  Warning: Could not find source for duplicate ${rule.code}${COLORS.reset}`)
    }
  }

  return result
}

/**
 * Filter TopoJSON data to include only specified territories
 * Enriches geometries with territory metadata (name, code, iso)
 * Extracts embedded territories (like DOM from France)
 * Duplicates territories for multiple projections (like FR-PF-2)
 * @param {object} worldData - The full world TopoJSON data
 * @param {object} territoriesConfig - Territory ID mapping
 * @returns {object} Filtered TopoJSON containing only specified territories
 */
function filterTerritories(worldData, territoriesConfig) {
  // Territory IDs as strings (world-atlas uses string IDs with zero-padding)
  // Normalize config IDs to match world-atlas format (e.g., 40 -> '040', 250 -> '250')
  const territoryIds = Object.keys(territoriesConfig)

  // Create a lookup map with both padded and unpadded versions
  const idLookup = new Map()
  for (const id of territoryIds) {
    const paddedId = id.padStart(3, '0')
    idLookup.set(paddedId, id)
    idLookup.set(id, id)
  }

  // STEP 1: Convert TopoJSON to GeoJSON for easier manipulation
  const featureCollection = topojson.feature(worldData, worldData.objects.countries)

  // Filter features by ID and enrich with metadata
  let processedFeatures = featureCollection.features
    .filter(feature => idLookup.has(String(feature.id)))
    .map((feature) => {
      const featureId = String(feature.id)
      const configId = idLookup.get(featureId)
      const territory = territoriesConfig[configId]

      // Enrich feature with territory metadata
      return {
        ...feature,
        id: configId,
        properties: {
          ...feature.properties,
          name: territory.name,
          code: territory.code,
          iso: territory.iso,
          id: configId,
        },
      }
    })

  // STEP 2: Extract embedded territories (like DOM from France mainland)
  const extractionResults = []
  processedFeatures = processedFeatures.flatMap((feature) => {
    const territory = territoriesConfig[feature.properties.id]

    // Check if any territories should be extracted from this one
    const hasExtractions = Object.values(territoriesConfig).some(
      t => String(t.extractFrom) === String(feature.properties.id),
    )

    if (hasExtractions) {
      const { mainland, extracted } = extractEmbeddedTerritories(feature, territoriesConfig)

      // Log extraction
      if (extracted.length > 0) {
        const codes = extracted.map(e => e.properties.code).join(', ')
        console.log(`${COLORS.blue}  Extracted from ${territory.code}: ${codes}${COLORS.reset}`)
        extractionResults.push(...extracted)
      }

      // Return mainland with filtered polygons
      return mainland
    }

    return feature
  })

  // Add extracted territories to processed features
  processedFeatures.push(...extractionResults)

  // STEP 3: Duplicate territories for multiple projections (like FR-PF-2)
  const finalFeatures = duplicateTerritories(processedFeatures, territoriesConfig)

  console.log(`${COLORS.green}  Total territories: ${finalFeatures.length}${COLORS.reset}`)

  // STEP 4: Return as GeoJSON FeatureCollection
  // We use GeoJSON format directly since we've already extracted and processed features
  return {
    type: 'FeatureCollection',
    features: finalFeatures,
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

    console.log(`Preparing geodata for: ${CONFIG.name}${COLORS.reset}`)
    console.log(`${COLORS.blue}  Description: ${CONFIG.description}${COLORS.reset}`)
    console.log(`${COLORS.blue}  Resolution: ${NATURAL_EARTH_RESOLUTION}${COLORS.reset}`)
    console.log(`${COLORS.blue}  Territories: ${Object.keys(CONFIG.territories).length}${COLORS.reset}\n`)

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
