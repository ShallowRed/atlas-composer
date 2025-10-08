#!/usr/bin/env node

/**
 * Geographic Data Preparation Script
 * Downloads Natural Earth world data and filters specific territories
 * Creates optimized TopoJSON files for cartographic visualization
 *
 * Usage:
 *   npm run geodata:prepare <region> [--resolution=10m|50m|110m]
 *
 * Examples:
 *   npm run geodata:prepare portugal
 *   npm run geodata:prepare france --resolution=10m
 *   npm run geodata:prepare eu
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import * as topojson from 'topojson-client'
import { getResolution, parseArgs, showHelp, validateRequired } from './utils/cli-args.js'
import { loadConfig } from './utils/config-loader.js'
import { logger } from './utils/logger.js'
import { fetchWorldData } from './utils/ne-data.js'

// ============================================================================
// CONFIGURATION
// ============================================================================

const OUTPUT_DIR = path.join(process.cwd(), 'src/public', 'data')

/**
 * Output filenames for each data file
 */
const OUTPUT_FILENAMES = {
  world: resolution => `world-countries-${resolution}.json`,
  territories: (configName, resolution) => `${configName}-territories-${resolution}.json`,
  metadata: (configName, resolution) => `${configName}-metadata-${resolution}.json`,
}

// ============================================================================
// DATA PROCESSING FUNCTIONS
// ============================================================================

/**
 * Save data to a file in the output directory
 */
async function saveData(filename, data) {
  const outputPath = path.join(OUTPUT_DIR, filename)
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(data))
  logger.success(`Saved ${filename}`)
}

/**
 * Extracts sub-territories from a MultiPolygon GeoJSON feature based on bounds matching
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
      logger.info(`  Duplicated ${rule.duplicateFrom} → ${rule.code}`)
    }
    else {
      logger.warning(`  Could not find source for duplicate ${rule.code}`)
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
        logger.info(`  Extracted from ${territory.code}: ${codes}`)
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

  logger.success(`  Total territories: ${finalFeatures.length}`)

  // STEP 4: Return as GeoJSON FeatureCollection
  // We use GeoJSON format directly since we've already extracted and processed features
  return {
    type: 'FeatureCollection',
    features: finalFeatures,
  }
}

/**
 * Create metadata file for the filtered territories
 */
function createMetadata(config, resolution, dataSourceUrl) {
  return {
    name: config.name,
    description: config.description,
    source: 'Natural Earth',
    sourceUrl: dataSourceUrl,
    resolution,
    created: new Date().toISOString(),
    territories: config.territories,
    count: Object.keys(config.territories).length,
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Parse arguments
    const args = parseArgs()

    // Show help if requested
    if (args.help) {
      showHelp(
        'prepare-geodata',
        'Downloads Natural Earth world data and filters specific territories',
        'npm run geodata:prepare <region> [--resolution=10m|50m|110m]',
        {
          '<region>': 'Region name (portugal, france, eu)',
          '--resolution=<val>': 'Natural Earth resolution (10m, 50m, 110m) [default: 50m]',
          '--help': 'Show this help message',
        },
      )
      return
    }

    // Validate required arguments
    if (!validateRequired(args, ['region'])) {
      logger.error('Usage: npm run geodata:prepare <region> [--resolution=10m|50m|110m]')
      process.exit(1)
    }

    const regionName = args.region
    const resolution = getResolution(args)

    // Load configuration
    logger.section(`Preparing geodata: ${regionName}`)
    const { backend: CONFIG } = await loadConfig(regionName)

    logger.data('Description', CONFIG.description)
    logger.data('Resolution', resolution)
    logger.data('Territories', Object.keys(CONFIG.territories).length)
    logger.newline()

    // Step 1: Download and save world data
    logger.subsection('Step 1: Download world data')
    const worldData = await fetchWorldData(resolution)
    const worldFilename = OUTPUT_FILENAMES.world(resolution)
    await saveData(worldFilename, worldData)

    // Step 2: Filter and save territory data
    logger.subsection('Step 2: Filter territories')
    const territoryData = filterTerritories(worldData, CONFIG.territories)
    const territoriesFilename = OUTPUT_FILENAMES.territories(CONFIG.outputName || regionName, resolution)
    await saveData(territoriesFilename, territoryData)

    // Step 3: Create and save metadata
    logger.subsection('Step 3: Create metadata')
    const dataSourceUrl = `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-${resolution}.json`
    const metadata = createMetadata(CONFIG, resolution, dataSourceUrl)
    const metadataFilename = OUTPUT_FILENAMES.metadata(CONFIG.outputName || regionName, resolution)
    await saveData(metadataFilename, metadata)

    logger.newline()
    logger.success('All done!')
  }
  catch (error) {
    logger.error(`${error.message}`)
    if (process.env.DEBUG) {
      console.error(error)
    }
    process.exit(1)
  }
}

main()
