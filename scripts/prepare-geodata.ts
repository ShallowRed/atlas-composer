#!/usr/bin/env node

/**
 * Geographic Data Preparation Script
 * Downloads Natural Earth world data and filters specific territories
 * Creates optimized TopoJSON files for cartographic visualization
 *
 * Usage:
 *   npm run geodata:prepare <atlas> [--resolution=10m|50m|110m]
 *
 * Examples:
 *   npm run geodata:prepare portugal
 *   npm run geodata:prepare france --resolution=10m
 *   npm run geodata:prepare europe
 */

import type { BackendConfig, BackendTerritory } from '#scripts/config/adapter'
import type { Topology } from 'topojson-specification'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { loadConfig } from '#scripts/config/loader'
import { getResolution, parseArgs, showHelp, validateRequired } from '#scripts/utils/cli-args'
import { logger } from '#scripts/utils/logger'
import { fetchWorldData } from '#scripts/utils/ne-data'
import * as topojson from 'topojson-client'

// ============================================================================
// TYPES
// ============================================================================

interface GeoJSONFeature {
  type: 'Feature'
  id?: string | number
  properties?: Record<string, any>
  geometry: any
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

interface ExtractedTerritory {
  id: string
  name: string
  code: string
  iso: string
  polygons: any[]
}

interface ExtractionResult {
  mainland: GeoJSONFeature
  extracted: GeoJSONFeature[]
}

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

// ============================================================================
// CONFIGURATION
// ============================================================================

const OUTPUT_DIR = path.join(process.cwd(), 'src/public', 'data')

/**
 * Output filenames for each data file
 */
const OUTPUT_FILENAMES = {
  world: (resolution: string) => `world-countries-${resolution}.json`,
  territories: (configName: string, resolution: string) => `${configName}-territories-${resolution}.json`,
  metadata: (configName: string, resolution: string) => `${configName}-metadata-${resolution}.json`,
}

// ============================================================================
// DATA PROCESSING FUNCTIONS
// ============================================================================

/**
 * Save data to a file in the output directory
 */
async function saveData(filename: string, data: any): Promise<void> {
  const outputPath = path.join(OUTPUT_DIR, filename)
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(data))
  logger.success(`Saved ${filename}`)
}

/**
 * Extracts sub-territories from a MultiPolygon GeoJSON feature based on bounds matching
 * @param mainlandFeature - GeoJSON feature with MultiPolygon geometry
 * @param config - Territory configuration with extraction rules
 * @returns Object with mainland feature and extracted territory features
 */
function extractEmbeddedTerritories(
  mainlandFeature: GeoJSONFeature,
  config: Record<string, BackendTerritory>,
): ExtractionResult {
  if (!mainlandFeature.geometry || mainlandFeature.geometry.type !== 'MultiPolygon') {
    return {
      mainland: mainlandFeature,
      extracted: [],
    }
  }

  const extracted: GeoJSONFeature[] = []
  const mainlandPolygons: any[] = []

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
  const extractedGroups = new Map<string, ExtractedTerritory>()

  // Separate extraction rules by method
  const indicesBasedRules = extractionRules.filter(rule => rule.polygonIndices && rule.polygonIndices.length > 0)
  const boundsBasedRules = extractionRules.filter(rule => rule.bounds && !rule.polygonIndices)

  // Process polygonIndices-based extraction first (more precise)
  const extractedIndices = new Set<number>()
  for (const rule of indicesBasedRules) {
    if (!rule.polygonIndices)
      continue

    // Initialize group for this territory
    if (!extractedGroups.has(rule.id)) {
      extractedGroups.set(rule.id, {
        id: rule.id,
        name: rule.name,
        code: rule.code,
        iso: rule.iso,
        polygons: [],
      })
    }

    // Extract polygons by index
    for (const index of rule.polygonIndices) {
      if (index >= 0 && index < mainlandFeature.geometry.coordinates.length) {
        extractedGroups.get(rule.id)!.polygons.push(mainlandFeature.geometry.coordinates[index])
        extractedIndices.add(index)
      }
      else {
        logger.warning(`  Polygon index ${index} out of range for ${rule.code} (total: ${mainlandFeature.geometry.coordinates.length})`)
      }
    }
  }

  // Process bounds-based extraction for remaining polygons
  mainlandFeature.geometry.coordinates.forEach((polygon: any, index: number) => {
    // Skip if already extracted by index
    if (extractedIndices.has(index)) {
      return
    }

    const firstRing = polygon[0]
    if (!firstRing || firstRing.length === 0)
      return

    // Calculate polygon bounds
    const lons = firstRing.map((coord: number[]) => coord[0])
    const lats = firstRing.map((coord: number[]) => coord[1])
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    // Try to match against bounds-based extraction rules
    let matched = false
    const tolerance = 0.1

    for (const rule of boundsBasedRules) {
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
        extractedGroups.get(rule.id)!.polygons.push(polygon)
        matched = true
        break
      }
    }

    // If not matched by any extraction rule, it's part of mainland
    if (!matched) {
      mainlandPolygons.push(polygon)
    }
  })

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
 * @param features - Array of GeoJSON features
 * @param config - Territory configuration with duplication rules
 * @returns Array with original and duplicate features
 */
function duplicateTerritories(
  features: GeoJSONFeature[],
  config: Record<string, BackendTerritory>,
): GeoJSONFeature[] {
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
 * @param worldData - The full world TopoJSON data
 * @param territoriesConfig - Territory ID mapping (empty object for wildcard atlases)
 * @returns Filtered GeoJSON FeatureCollection containing only specified territories
 */
function filterTerritories(
  worldData: Topology,
  territoriesConfig: Record<string, BackendTerritory>,
): GeoJSONFeatureCollection {
  // STEP 1: Convert TopoJSON to GeoJSON for easier manipulation
  const countriesObject = worldData.objects.countries
  if (!countriesObject) {
    throw new Error('No countries object found in world data')
  }
  const featureCollection = topojson.feature(worldData, countriesObject) as any as GeoJSONFeatureCollection

  // Handle wildcard atlases (empty territoriesConfig means include all)
  const isWildcardAtlas = Object.keys(territoriesConfig).length === 0

  if (isWildcardAtlas) {
    // For wildcard atlases, keep all territories with their original Natural Earth properties
    const processedFeatures = featureCollection.features.map((feature): GeoJSONFeature => {
      const featureId = String(feature.id).padStart(3, '0')

      return {
        ...feature,
        id: featureId,
        properties: {
          ...feature.properties,
          id: featureId,
          code: feature.properties?.ISO_A3 || featureId,
          iso: feature.properties?.ISO_A3 || '',
          name: feature.properties?.NAME || '',
        },
      }
    })

    // STEP 4: Return as GeoJSON FeatureCollection
    return {
      type: 'FeatureCollection',
      features: processedFeatures,
    }
  }

  // Territory IDs as strings (world-atlas uses string IDs with zero-padding)
  // Normalize config IDs to match world-atlas format (e.g., 40 -> '040', 250 -> '250')
  const territoryIds = Object.keys(territoriesConfig)

  // Create a lookup map with both padded and unpadded versions
  const idLookup = new Map<string, string>()
  for (const id of territoryIds) {
    const paddedId = id.padStart(3, '0')
    idLookup.set(paddedId, id)
    idLookup.set(id, id)
  }

  // Filter features by ID and enrich with metadata
  let processedFeatures = featureCollection.features
    .filter(feature => idLookup.has(String(feature.id)))
    .map((feature): GeoJSONFeature => {
      const featureId = String(feature.id)
      const configId = idLookup.get(featureId)!
      const territory = territoriesConfig[configId]

      if (!territory) {
        throw new Error(`Territory config not found for ID: ${configId}`)
      }

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
  const extractionResults: GeoJSONFeature[] = []
  processedFeatures = processedFeatures.flatMap((feature) => {
    const territoryId = feature.properties!.id
    const territory = territoriesConfig[territoryId]

    if (!territory) {
      throw new Error(`Territory config not found for ID: ${territoryId}`)
    }

    // Check if any territories should be extracted from this one
    const hasExtractions = Object.values(territoriesConfig).some(
      t => String(t.extractFrom) === String(territoryId),
    )

    if (hasExtractions) {
      const { mainland, extracted } = extractEmbeddedTerritories(feature, territoriesConfig)

      // Log extraction
      if (extracted.length > 0) {
        const codes = extracted.map(e => e.properties!.code).join(', ')
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

  // STEP 2.5: Apply mainlandPolygon filter for territories that specify it
  processedFeatures = processedFeatures.map((feature) => {
    const territoryId = feature.properties!.id
    const territory = territoriesConfig[territoryId]

    if (!territory || territory.mainlandPolygon === undefined) {
      return feature
    }

    // If mainlandPolygon is specified, extract only that polygon
    if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
      const mainlandIndex = territory.mainlandPolygon
      if (mainlandIndex >= 0 && mainlandIndex < feature.geometry.coordinates.length) {
        // Convert to Polygon (single polygon)
        return {
          ...feature,
          geometry: {
            type: 'Polygon',
            coordinates: feature.geometry.coordinates[mainlandIndex],
          },
        }
      }
      else {
        logger.warning(`  mainlandPolygon index ${mainlandIndex} out of range for ${territory.code} (total: ${feature.geometry.coordinates.length})`)
      }
    }
    else if (feature.geometry && feature.geometry.type === 'Polygon' && territory.mainlandPolygon === 0) {
      // Already a single polygon, keep as is
      return feature
    }

    return feature
  })

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
function createMetadata(config: BackendConfig, resolution: string, dataSourceUrl: string): Metadata {
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

async function main(): Promise<void> {
  try {
    // Parse arguments
    const args = parseArgs()

    // Show help if requested
    if (args.help) {
      showHelp(
        'prepare-geodata',
        'Downloads Natural Earth world data and filters specific territories',
        'npm run geodata:prepare <atlas> [--resolution=10m|50m|110m]',
        {
          '<atlas>': 'Atlas name (portugal, france, europe)',
          '--resolution=<val>': 'Natural Earth resolution (10m, 50m, 110m) [default: 50m]',
          '--help': 'Show this help message',
        },
      )
      return
    }

    // Validate required arguments
    if (!validateRequired(args, ['atlas'])) {
      logger.error('Usage: npm run geodata:prepare <atlas> [--resolution=10m|50m|110m]')
      process.exit(1)
    }

    const atlasName = args.atlas!
    const resolution = getResolution(args)

    // Load configuration
    logger.section(`Preparing geodata: ${atlasName}`)
    const { backend: CONFIG } = await loadConfig(atlasName)

    const isWildcard = Object.keys(CONFIG.territories).length === 0
    const territoryCount = isWildcard ? 'all (wildcard)' : Object.keys(CONFIG.territories).length

    logger.data('Description', CONFIG.description)
    logger.data('Resolution', resolution)
    logger.data('Territories', territoryCount)
    logger.newline()

    // Step 1: Download and save world data
    logger.subsection('Step 1: Download world data')
    const worldData = await fetchWorldData(resolution as any)
    const worldFilename = OUTPUT_FILENAMES.world(resolution)
    await saveData(worldFilename, worldData)

    // Step 2: Filter and save territory data
    logger.subsection('Step 2: Filter territories')
    const territoryData = filterTerritories(worldData, CONFIG.territories)
    const territoriesFilename = OUTPUT_FILENAMES.territories(CONFIG.outputName || atlasName, resolution)
    await saveData(territoriesFilename, territoryData)

    // Step 3: Create and save metadata
    logger.subsection('Step 3: Create metadata')
    const dataSourceUrl = `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-${resolution}.json`
    const metadata = createMetadata(CONFIG, resolution, dataSourceUrl)
    const metadataFilename = OUTPUT_FILENAMES.metadata(CONFIG.outputName || atlasName, resolution)
    await saveData(metadataFilename, metadata)

    logger.newline()
    logger.success('All done!')
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(message)
    if (process.env.DEBUG) {
      console.error(error)
    }
    process.exit(1)
  }
}

main()
