#!/usr/bin/env node

/**
 * Country Lookup Script
 * Look up country data from Natural Earth by country name or ID
 * Useful for exploring what territories are included in geometries
 *
 * Usage:
 *   node lookup-country.js <country-name-or-id>
 *   NE_RESOLUTION=10m node lookup-country.js portugal
 *
 * Examples:
 *   node lookup-country.js portugal
 *   node lookup-country.js france
 *   node lookup-country.js 620
 *   NE_RESOLUTION=10m node lookup-country.js spain
 */

import process from 'node:process'

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Natural Earth data resolution
 * Can be overridden with NE_RESOLUTION environment variable
 */
const NATURAL_EARTH_RESOLUTION = process.env.NE_RESOLUTION || '50m'

/**
 * Data source URL for Natural Earth countries dataset
 */
const DATA_SOURCE = `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-${NATURAL_EARTH_RESOLUTION}.json`

/**
 * Console colors for better readability
 */
const COLORS = {
  reset: '\x1B[0m',
  green: '\x1B[32m',
  blue: '\x1B[34m',
  yellow: '\x1B[33m',
  red: '\x1B[31m',
  cyan: '\x1B[36m',
  magenta: '\x1B[35m',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate bounding box for a set of coordinates
 * @param {Array} coordinates - Array of [lon, lat] coordinates
 * @returns {object} Bounding box { minLon, maxLon, minLat, maxLat }
 */
function calculateBounds(coordinates) {
  const lons = coordinates.map(c => c[0])
  const lats = coordinates.map(c => c[1])
  return {
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  }
}

/**
 * Analyze a polygon to determine if it's likely mainland or an island/territory
 * @param {Array} polygon - Polygon coordinates
 * @param {object} mainBounds - Main territory bounds for comparison
 * @returns {object} Analysis result
 */
function analyzePolygon(polygon, mainBounds) {
  const ring = polygon[0] // First ring (outer boundary)
  const bounds = calculateBounds(ring)

  // Calculate area approximation (very rough)
  const width = bounds.maxLon - bounds.minLon
  const height = bounds.maxLat - bounds.minLat
  const approxArea = width * height

  // Calculate distance from main bounds center
  const mainCenterLon = (mainBounds.minLon + mainBounds.maxLon) / 2
  const mainCenterLat = (mainBounds.minLat + mainBounds.maxLat) / 2
  const centerLon = (bounds.minLon + bounds.maxLon) / 2
  const centerLat = (bounds.minLat + bounds.maxLat) / 2
  const distance = Math.sqrt(
    (centerLon - mainCenterLon) ** 2 + (centerLat - mainCenterLat) ** 2,
  )

  // Determine if this is likely a separate territory
  const isLikelySeparate = distance > 5 || approxArea < mainBounds.area * 0.1

  return {
    bounds,
    approxArea,
    distance,
    isLikelySeparate,
  }
}

/**
 * Format bounds for display
 * @param {object} bounds - Bounding box
 * @returns {string} Formatted string
 */
function formatBounds(bounds) {
  return `lon [${bounds.minLon.toFixed(2)}, ${bounds.maxLon.toFixed(2)}], lat [${bounds.minLat.toFixed(2)}, ${bounds.maxLat.toFixed(2)}]`
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Look up country information from Natural Earth data
 * @param {string} searchTerm - Country name or ID to search for
 */
async function lookupCountry(searchTerm) {
  try {
    console.log(`${COLORS.blue}Fetching Natural Earth data (${NATURAL_EARTH_RESOLUTION})...${COLORS.reset}`)
    const response = await fetch(DATA_SOURCE)

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`)
    }

    const data = await response.json()
    const countries = data.objects.countries.geometries

    // Search by ID or name (case-insensitive)
    const searchTermLower = searchTerm.toLowerCase()
    const matches = countries.filter((country) => {
      const idMatch = String(country.id) === searchTerm || String(country.id).padStart(3, '0') === searchTerm
      const nameMatch = country.properties?.name?.toLowerCase().includes(searchTermLower)
      return idMatch || nameMatch
    })

    if (matches.length === 0) {
      console.log(`${COLORS.red}No countries found matching: "${searchTerm}"${COLORS.reset}`)
      console.log(`\n${COLORS.yellow}Try searching for:${COLORS.reset}`)
      console.log('  - Country name (e.g., "france", "portugal", "spain")')
      console.log('  - Natural Earth ID (e.g., "250", "620", "724")')
      return
    }

    // Display all matches
    for (const country of matches) {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`${COLORS.green}Country: ${country.properties?.name || 'Unknown'}${COLORS.reset}`)
      console.log(`${COLORS.cyan}ID: ${country.id}${COLORS.reset}`)
      console.log(`${COLORS.cyan}Type: ${country.type}${COLORS.reset}`)
      console.log(`${COLORS.cyan}Properties:${COLORS.reset}`, JSON.stringify(country.properties, null, 2))

      // TopoJSON uses arcs, not coordinates
      if (country.arcs) {
        console.log(`\n${COLORS.blue}Geometry Analysis (TopoJSON):${COLORS.reset}`)
        console.log(`  Type: ${country.type}`)
        console.log(`  Number of polygons/arcs: ${country.arcs.length}`)

        if (country.arcs.length > 1) {
          console.log(`\n${COLORS.yellow}Note: This country has ${country.arcs.length} separate polygons.${COLORS.reset}`)
          console.log(`${COLORS.cyan}This likely includes mainland + separate territories (islands, autonomous regions, etc.)${COLORS.reset}`)
          console.log(`\n${COLORS.green}Configuration Suggestion:${COLORS.reset}`)
          console.log(`  Consider adding mainlandBounds to extract just the mainland.`)
          console.log(`  To see actual coordinates, run: node scripts/prepare-geodata.js <config>`)
          console.log(`  Then inspect the generated JSON file.`)
        }
        else {
          console.log(`  ${COLORS.green}→ Single polygon (no separate territories)${COLORS.reset}`)
        }
      }
      else if (country.geometry) {
        console.log(`\n${COLORS.blue}Geometry Analysis (GeoJSON):${COLORS.reset}`)
        console.log(`  Type: ${country.geometry.type}`)

        if (country.geometry.type === 'MultiPolygon') {
          const polygons = country.geometry.coordinates
          console.log(`  Number of polygons: ${polygons.length}`)

          // Find the largest polygon (likely mainland)
          const polygonSizes = polygons.map((poly) => {
            const ring = poly[0]
            const bounds = calculateBounds(ring)
            const area = (bounds.maxLon - bounds.minLon) * (bounds.maxLat - bounds.minLat)
            return { bounds, area, ring }
          })

          const largestIndex = polygonSizes.reduce((maxIdx, curr, idx, arr) =>
            curr.area > arr[maxIdx].area ? idx : maxIdx, 0)

          const mainPolygon = polygonSizes[largestIndex]

          console.log(`\n${COLORS.magenta}Polygon Analysis:${COLORS.reset}`)
          polygons.forEach((poly, i) => {
            const analysis = analyzePolygon(poly, mainPolygon)
            const isMain = i === largestIndex

            console.log(`\n  ${COLORS.yellow}Polygon ${i}:${COLORS.reset} ${isMain ? '⭐ (LIKELY MAINLAND)' : ''}`)
            console.log(`    Bounds: ${formatBounds(analysis.bounds)}`)
            console.log(`    Approx area: ${analysis.approxArea.toFixed(4)} deg²`)
            console.log(`    Distance from main: ${analysis.distance.toFixed(2)} deg`)

            if (!isMain && analysis.isLikelySeparate) {
              console.log(`    ${COLORS.cyan}→ This appears to be a separate territory/island${COLORS.reset}`)
            }
          })

          // Suggest configuration
          if (polygons.length > 1) {
            console.log(`\n${COLORS.green}Configuration Suggestion:${COLORS.reset}`)
            console.log(`  This country has ${polygons.length} polygons.`)
            console.log(`  You may want to configure mainlandBounds to extract just the mainland:`)
            console.log(`  mainlandBounds: [[${mainPolygon.bounds.minLon.toFixed(1)}, ${mainPolygon.bounds.minLat.toFixed(1)}], [${mainPolygon.bounds.maxLon.toFixed(1)}, ${mainPolygon.bounds.maxLat.toFixed(1)}]]`)

            const separateTerritories = polygonSizes.filter((_, i) => i !== largestIndex)
              .filter((p) => {
                const analysis = analyzePolygon([p.ring], mainPolygon)
                return analysis.isLikelySeparate
              })

            if (separateTerritories.length > 0) {
              console.log(`\n  ${COLORS.cyan}Detected ${separateTerritories.length} likely separate territory/territories${COLORS.reset}`)
              console.log('  Consider adding them to overseasTerritories configuration.')
            }
          }
        }
        else if (country.geometry.type === 'Polygon') {
          const ring = country.geometry.coordinates[0]
          const bounds = calculateBounds(ring)
          console.log(`  Bounds: ${formatBounds(bounds)}`)
          console.log(`  ${COLORS.green}→ Single polygon (no separate territories)${COLORS.reset}`)
        }
      }

      console.log(`${'='.repeat(80)}`)
    }

    // If multiple matches, show count
    if (matches.length > 1) {
      console.log(`\n${COLORS.yellow}Found ${matches.length} matches${COLORS.reset}`)
    }
  }
  catch (error) {
    console.error(`${COLORS.red}Error:${COLORS.reset}`, error)
    process.exit(1)
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const searchTerm = process.argv[2]

  if (!searchTerm) {
    console.log(`${COLORS.yellow}Usage: node lookup-country.js <country-name-or-id>${COLORS.reset}`)
    console.log('\nExamples:')
    console.log('  node lookup-country.js portugal')
    console.log('  node lookup-country.js france')
    console.log('  node lookup-country.js 620')
    console.log('  NE_RESOLUTION=10m node lookup-country.js spain')
    process.exit(1)
  }

  await lookupCountry(searchTerm)
}

main()
