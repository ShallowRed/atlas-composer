#!/usr/bin/env node

/**
 * Country Polygon Analyzer
 * Analyzes Natural Earth data to help configure territory extraction
 *
 * Usage:
 *   node scripts/dev/analyze-country.js <country-id> [--resolution=10m|50m|110m]
 *
 * Examples:
 *   node scripts/dev/analyze-country.js 250              # France (50m)
 *   node scripts/dev/analyze-country.js 620 --resolution=10m  # Portugal (10m)
 *   node scripts/dev/analyze-country.js 724              # Spain
 *
 * Output:
 *   - Lists all polygons with their bounds and areas
 *   - Identifies likely mainland (largest polygon)
 *   - Groups polygons by geographic proximity
 *   - Suggests configuration structure
 */

import process from 'node:process'
import * as topojson from 'topojson-client'
import { getResolution, parseArgs, showHelp } from '../utils/cli-args.js'
import { logger } from '../utils/logger.js'
import { fetchWorldData } from '../utils/ne-data.js'

/**
 * Calculate the area of a polygon using the Shoelace formula
 * @param {number[][]} ring - Array of [lon, lat] coordinates
 * @returns {number} Area in square degrees (approximate)
 */
function calculatePolygonArea(ring) {
  let area = 0
  const n = ring.length

  for (let i = 0; i < n - 1; i++) {
    area += ring[i][0] * ring[i + 1][1]
    area -= ring[i + 1][0] * ring[i][1]
  }

  return Math.abs(area / 2)
}

/**
 * Calculate the center point (centroid) of a polygon
 * @param {number[][]} ring - Array of [lon, lat] coordinates
 * @returns {[number, number]} [lon, lat] of center
 */
function calculatePolygonCenter(ring) {
  const lons = ring.map(coord => coord[0])
  const lats = ring.map(coord => coord[1])
  return [
    (Math.min(...lons) + Math.max(...lons)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2,
  ]
}

/**
 * Analyze a polygon and return its metadata
 * @param {number[][][]} polygon - MultiPolygon polygon (array of rings)
 * @param {number} index - Polygon index in the MultiPolygon
 * @returns {object} Polygon metadata
 */
function analyzePolygon(polygon, index) {
  const firstRing = polygon[0]
  const lons = firstRing.map(coord => coord[0])
  const lats = firstRing.map(coord => coord[1])

  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)

  const area = calculatePolygonArea(firstRing)
  const center = calculatePolygonCenter(firstRing)

  // Geographic region classification (rough)
  let region = 'Unknown'
  if (minLat > 45)
    region = 'Northern'
  else if (minLat > 30)
    region = 'Mid-latitude'
  else if (minLat > 0)
    region = 'Tropical'
  else if (minLat > -30)
    region = 'Southern Tropical'
  else
    region = 'Southern'

  // Ocean classification (rough)
  if (minLon < -120 || maxLon > 120)
    region += ' Pacific'
  else if (minLon < -30)
    region += ' Atlantic'
  else if (minLon > 30 && minLon < 100)
    region += ' Indian Ocean'

  return {
    index,
    bounds: [[minLon, minLat], [maxLon, maxLat]],
    center,
    area,
    region,
    ringCount: polygon.length,
  }
}

/**
 * Group polygons by geographic proximity
 * @param {object[]} polygons - Array of polygon metadata
 * @param {number} threshold - Distance threshold for grouping (in degrees)
 * @returns {object[]} Array of polygon groups
 */
function groupPolygonsByProximity(polygons, threshold = 5) {
  const groups = []
  const used = new Set()

  for (const polygon of polygons) {
    if (used.has(polygon.index))
      continue

    const group = [polygon]
    used.add(polygon.index)

    // Find nearby polygons
    for (const other of polygons) {
      if (used.has(other.index))
        continue

      const distance = Math.sqrt(
        (polygon.center[0] - other.center[0]) ** 2
        + (polygon.center[1] - other.center[1]) ** 2,
      )

      if (distance < threshold) {
        group.push(other)
        used.add(other.index)
      }
    }

    groups.push(group)
  }

  return groups
}

/**
 * Main analysis function
 */
async function analyzeCountry(countryId, resolution) {
  logger.section(`Analyzing Natural Earth Country: ${countryId}`)
  logger.newline()

  // Load world data
  let worldData
  try {
    worldData = await fetchWorldData(resolution)
  }
  // eslint-disable-next-line unused-imports/no-unused-vars
  catch (error) {
    logger.error('Failed to fetch world data')
    logger.info('Make sure you have internet connectivity')
    process.exit(1)
  }

  // Convert TopoJSON to GeoJSON
  const featureCollection = topojson.feature(worldData, worldData.objects.countries)

  // Find the country
  const country = featureCollection.features.find(
    f => String(f.id) === String(countryId),
  )

  if (!country) {
    logger.error(`Country with ID ${countryId} not found`)
    logger.newline()
    logger.warning('Available countries (first 20):')
    featureCollection.features.slice(0, 20).forEach((f) => {
      logger.log(`  ${f.id}: ${f.properties.name}`)
    })
    process.exit(1)
  }

  logger.success(`Found: ${country.properties.name} (ID ${country.id})`)

  if (country.geometry.type !== 'MultiPolygon') {
    logger.warning(`Geometry type: ${country.geometry.type} (not MultiPolygon)`)
    logger.log('This country does not require polygon extraction.')
    logger.newline()
    return
  }

  const polygonCount = country.geometry.coordinates.length
  logger.success(`Geometry: MultiPolygon with ${polygonCount} polygon(s)`)
  logger.newline()

  // Analyze each polygon
  const polygons = country.geometry.coordinates.map((polygon, i) =>
    analyzePolygon(polygon, i),
  )

  // Sort by area (largest first)
  const sortedPolygons = [...polygons].sort((a, b) => b.area - a.area)

  // Identify mainland (largest polygon)
  const mainland = sortedPolygons[0]

  // Print analysis
  logger.section('Polygon Analysis')
  logger.newline()

  sortedPolygons.forEach((polygon) => {
    const isMainland = polygon.index === mainland.index
    const [[minLon, minLat], [maxLon, maxLat]] = polygon.bounds
    const [centerLon, centerLat] = polygon.center

    if (isMainland) {
      logger.highlight(`Polygon ${polygon.index}:`)
    }
    else {
      logger.log(`Polygon ${polygon.index}:`)
    }
    logger.log(`  Bounds: [${minLon.toFixed(2)}, ${minLat.toFixed(2)}] → [${maxLon.toFixed(2)}, ${maxLat.toFixed(2)}]`)
    logger.log(`  Center: [${centerLon.toFixed(2)}, ${centerLat.toFixed(2)}]`)
    logger.log(`  Area: ${polygon.area.toFixed(2)} sq° ${isMainland ? '(LARGEST - MAINLAND)' : ''}`)
    logger.log(`  Rings: ${polygon.ringCount}`)
    logger.log(`  Region: ${polygon.region}`)
    logger.newline()
  })

  // Group by proximity
  const groups = groupPolygonsByProximity(polygons.filter(p => p.index !== mainland.index))

  if (groups.length > 0) {
    logger.section('Suggested Territory Groupings')
    logger.newline()

    groups.forEach((group, _i) => {
      if (group.length === 1) {
        logger.log(`Group ${_i + 1}: Single polygon [${group[0].index}]`)
        logger.log(`  Region: ${group[0].region}`)
      }
      else {
        const indices = group.map(p => p.index).join(', ')
        logger.log(`Group ${_i + 1}: Archipelago [${indices}]`)
        logger.log(`  Region: ${group[0].region}`)
        logger.log(`  Polygons: ${group.length}`)
      }
      logger.newline()
    })
  }

  // Generate suggested configuration
  logger.section('Suggested Configuration (using polygon indices)')
  logger.newline()

  console.log(`{
  '${countryId}': {
    name: '${country.properties.name}',
    code: 'XX-MAIN',  // Choose your code
    iso: '${country.properties.name.substring(0, 3).toUpperCase()}',
    mainlandPolygon: ${mainland.index}
  },`)

  let extractCount = 0
  groups.forEach((group, _i) => {
    if (group.length === 1) {
      const p = group[0]
      logger.log(`  '${countryId}-${extractCount++}': {
    name: 'Territory ${extractCount}',  // Name this territory
    code: 'XX-T${extractCount}',  // Choose your code
    iso: '${country.properties.name.substring(0, 3).toUpperCase()}',
    extractFrom: ${countryId},
    polygonIndices: [${p.index}]
  },`)
    }
    else {
      const indices = group.map(p => p.index).join(', ')
      logger.log(`  '${countryId}-${extractCount++}': {
    name: 'Archipelago ${extractCount}',  // Name this archipelago
    code: 'XX-A${extractCount}',  // Choose your code
    iso: '${country.properties.name.substring(0, 3).toUpperCase()}',
    extractFrom: ${countryId},
    polygonIndices: [${indices}]
  },`)
    }
  })

  logger.log(`}`)
}

// Main
async function main() {
  const args = parseArgs()

  if (args.help) {
    showHelp(
      'analyze-country',
      'Analyzes Natural Earth data to help configure territory extraction',
      'node scripts/dev/analyze-country.js <country-id> [--resolution=10m|50m|110m]',
      {
        '<country-id>': 'Natural Earth country ID (250=France, 620=Portugal, 724=Spain)',
        '--resolution=<val>': 'Natural Earth resolution (10m, 50m, 110m) [default: 50m]',
        '--help': 'Show this help message',
      },
    )
    return
  }

  const countryId = args.country || process.argv[2]

  if (!countryId) {
    logger.error('Missing country ID')
    logger.log('\nUsage: node scripts/dev/analyze-country.js <country-id> [--resolution=10m|50m|110m]')
    logger.log('\nExamples:')
    logger.log('  node scripts/dev/analyze-country.js 250              # France')
    logger.log('  node scripts/dev/analyze-country.js 620 --resolution=10m  # Portugal (10m)')
    logger.log('  node scripts/dev/analyze-country.js 724              # Spain')
    process.exit(1)
  }

  const resolution = getResolution(args)
  await analyzeCountry(countryId, resolution)
}

main().catch((error) => {
  logger.error(`${error.message}`)
  if (process.env.DEBUG) {
    console.error(error)
  }
  process.exit(1)
})
