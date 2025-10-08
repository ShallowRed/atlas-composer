#!/usr/bin/env node

/**
 * Country Polygon Analyzer
 * Analyzes Natural Earth data to help configure territory extraction
 *
 * Usage:
 *   node analyze-country.js <country-id>
 *   node analyze-country.js 250        # France
 *   node analyze-country.js 620        # Portugal
 *   node analyze-country.js 724        # Spain
 *
 * Output:
 *   - Lists all polygons with their bounds and areas
 *   - Identifies likely mainland (largest polygon)
 *   - Groups polygons by geographic proximity
 *   - Suggests configuration structure
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as topojson from 'topojson-client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const COLORS = {
  reset: '\x1B[0m',
  green: '\x1B[32m',
  blue: '\x1B[34m',
  yellow: '\x1B[33m',
  red: '\x1B[31m',
  cyan: '\x1B[36m',
  bold: '\x1B[1m',
}

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
async function analyzeCountry(countryId) {
  console.log(`${COLORS.blue}${COLORS.bold}Analyzing Natural Earth Country: ${countryId}${COLORS.reset}\n`)

  // Load world data
  const worldDataPath = path.join(process.cwd(), 'src/public/data/world-countries-50m.json')

  let worldData
  try {
    const fileContent = await fs.readFile(worldDataPath, 'utf-8')
    worldData = JSON.parse(fileContent)
  }
  catch (error) {
    console.error(`${COLORS.red}Error: Could not load world data from ${worldDataPath}${COLORS.reset}`)
    console.error(`${COLORS.yellow}Run: node scripts/prepare-geodata.js world${COLORS.reset}`)
    process.exit(1)
  }

  // Convert TopoJSON to GeoJSON
  const featureCollection = topojson.feature(worldData, worldData.objects.countries)

  // Find the country
  const country = featureCollection.features.find(
    f => String(f.id) === String(countryId),
  )

  if (!country) {
    console.error(`${COLORS.red}Error: Country with ID ${countryId} not found${COLORS.reset}`)
    console.log(`\n${COLORS.yellow}Available countries:${COLORS.reset}`)
    featureCollection.features.slice(0, 20).forEach((f) => {
      console.log(`  ${f.id}: ${f.properties.name}`)
    })
    process.exit(1)
  }

  console.log(`${COLORS.green}✓ Found: ${country.properties.name} (ID ${country.id})${COLORS.reset}`)

  if (country.geometry.type !== 'MultiPolygon') {
    console.log(`${COLORS.yellow}⚠ Geometry type: ${country.geometry.type} (not MultiPolygon)${COLORS.reset}`)
    console.log('This country does not require polygon extraction.\n')
    return
  }

  const polygonCount = country.geometry.coordinates.length
  console.log(`${COLORS.green}✓ Geometry: MultiPolygon with ${polygonCount} polygon(s)${COLORS.reset}\n`)

  // Analyze each polygon
  const polygons = country.geometry.coordinates.map((polygon, i) =>
    analyzePolygon(polygon, i),
  )

  // Sort by area (largest first)
  const sortedPolygons = [...polygons].sort((a, b) => b.area - a.area)

  // Identify mainland (largest polygon)
  const mainland = sortedPolygons[0]

  // Print analysis
  console.log(`${COLORS.bold}Polygon Analysis:${COLORS.reset}\n`)

  sortedPolygons.forEach((polygon, rank) => {
    const isMainland = polygon.index === mainland.index
    const [[minLon, minLat], [maxLon, maxLat]] = polygon.bounds
    const [centerLon, centerLat] = polygon.center

    console.log(`${isMainland ? COLORS.green + COLORS.bold : COLORS.cyan}Polygon ${polygon.index}:${COLORS.reset}`)
    console.log(`  Bounds: [${minLon.toFixed(2)}, ${minLat.toFixed(2)}] → [${maxLon.toFixed(2)}, ${maxLat.toFixed(2)}]`)
    console.log(`  Center: [${centerLon.toFixed(2)}, ${centerLat.toFixed(2)}]`)
    console.log(`  Area: ${polygon.area.toFixed(2)} sq° ${isMainland ? '(LARGEST - MAINLAND)' : ''}`)
    console.log(`  Rings: ${polygon.ringCount}`)
    console.log(`  Region: ${polygon.region}`)
    console.log()
  })

  // Group by proximity
  const groups = groupPolygonsByProximity(polygons.filter(p => p.index !== mainland.index))

  if (groups.length > 0) {
    console.log(`${COLORS.bold}Suggested Territory Groupings:${COLORS.reset}\n`)

    groups.forEach((group, i) => {
      if (group.length === 1) {
        console.log(`Group ${i + 1}: Single polygon [${group[0].index}]`)
        console.log(`  Region: ${group[0].region}`)
      }
      else {
        const indices = group.map(p => p.index).join(', ')
        console.log(`Group ${i + 1}: Archipelago [${indices}]`)
        console.log(`  Region: ${group[0].region}`)
        console.log(`  Polygons: ${group.length}`)
      }
      console.log()
    })
  }

  // Generate suggested configuration
  console.log(`${COLORS.bold}Suggested Configuration (using polygon indices):${COLORS.reset}\n`)

  console.log(`{
  '${countryId}': {
    name: '${country.properties.name}',
    code: 'XX-MAIN',  // Choose your code
    iso: '${country.properties.name.substring(0, 3).toUpperCase()}',
    mainlandPolygon: ${mainland.index}
  },`)

  let extractCount = 0
  groups.forEach((group, i) => {
    if (group.length === 1) {
      const p = group[0]
      console.log(`  '${countryId}-${extractCount++}': {
    name: 'Territory ${extractCount}',  // Name this territory
    code: 'XX-T${extractCount}',  // Choose your code
    iso: '${country.properties.name.substring(0, 3).toUpperCase()}',
    extractFrom: ${countryId},
    polygonIndices: [${p.index}]
  },`)
    }
    else {
      const indices = group.map(p => p.index).join(', ')
      console.log(`  '${countryId}-${extractCount++}': {
    name: 'Archipelago ${extractCount}',  // Name this archipelago
    code: 'XX-A${extractCount}',  // Choose your code
    iso: '${country.properties.name.substring(0, 3).toUpperCase()}',
    extractFrom: ${countryId},
    polygonIndices: [${indices}]
  },`)
    }
  })

  console.log(`}`)
}

// Main
const countryId = process.argv[2]

if (!countryId) {
  console.log(`${COLORS.yellow}Usage: node analyze-country.js <country-id>${COLORS.reset}`)
  console.log(`\nExamples:`)
  console.log(`  node analyze-country.js 250  # France`)
  console.log(`  node analyze-country.js 620  # Portugal`)
  console.log(`  node analyze-country.js 724  # Spain`)
  process.exit(1)
}

analyzeCountry(countryId)
