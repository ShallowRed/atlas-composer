#!/usr/bin/env node

/**
 * Country Lookup Script
 * Look up Natural Earth country data by name or ID
 * Provides quick insight into geometry structure for configuration authoring
 */

import process from 'node:process'
import * as topojson from 'topojson-client'
import { getResolution, parseArgs, showHelp } from '../utils/cli-args.js'
import { logger } from '../utils/logger.js'
import { fetchWorldData } from '../utils/ne-data.js'

/**
 * Calculate bounding box for a polygon ring
 * @param {number[][]} ring - Array of [lon, lat] coordinates
 * @returns {{minLon: number, maxLon: number, minLat: number, maxLat: number}} Bounds
 */
function calculateBounds(ring) {
  if (!ring || ring.length === 0) {
    return {
      minLon: 0,
      maxLon: 0,
      minLat: 0,
      maxLat: 0,
    }
  }

  const lons = ring.map(coord => coord[0])
  const lats = ring.map(coord => coord[1])

  return {
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  }
}

/**
 * Format bounds for friendly display
 * @param {{minLon: number, maxLon: number, minLat: number, maxLat: number}} bounds
 * @returns {string} Formatted bounds
 */
function formatBounds(bounds) {
  return `lon [${bounds.minLon.toFixed(2)}, ${bounds.maxLon.toFixed(2)}], lat [${bounds.minLat.toFixed(2)}, ${bounds.maxLat.toFixed(2)}]`
}

/**
 * Calculate polygon statistics used in analysis
 * @param {number[][][]} polygon - MultiPolygon polygon (array of rings)
 * @param {number} index
 * @returns {object} Polygon stats
 */
function getPolygonStats(polygon, index) {
  const firstRing = polygon[0] || []
  const bounds = calculateBounds(firstRing)

  const width = bounds.maxLon - bounds.minLon
  const height = bounds.maxLat - bounds.minLat

  const approxArea = Math.max(width * height, 0)
  const centerLon = (bounds.minLon + bounds.maxLon) / 2
  const centerLat = (bounds.minLat + bounds.maxLat) / 2

  return {
    index,
    bounds,
    approxArea,
    center: { lon: centerLon, lat: centerLat },
    ringCount: polygon.length,
  }
}

/**
 * Distance between two centers in degrees
 * @param {{lon: number, lat: number}} a
 * @param {{lon: number, lat: number}} b
 * @returns {number} Distance in degrees
 */
function distanceBetweenCenters(a, b) {
  return Math.hypot((a.lon ?? 0) - (b.lon ?? 0), (a.lat ?? 0) - (b.lat ?? 0))
}

/**
 * Pretty-print a country feature with geometry insights
 * @param {GeoJSON.Feature} country
 * @param {string} resolution
 * @param {number} index
 * @param {number} total
 */
function describeCountry(country, resolution, index, total) {
  const name = country.properties?.name || 'Unknown'
  const heading = total > 1
    ? `${name} (ID ${country.id}) — match ${index + 1} of ${total}`
    : `${name} (ID ${country.id})`

  logger.section(heading)
  logger.data('Resolution', resolution)
  logger.data('Geometry', country.geometry?.type || 'Unknown')
  logger.newline()

  if (country.properties) {
    logger.subsection('Properties')
    logger.log(JSON.stringify(country.properties, null, 2))
    logger.newline()
  }

  if (!country.geometry) {
    logger.warning('No geometry available in dataset.')
    return
  }

  if (country.geometry.type === 'Polygon') {
    const polygon = country.geometry.coordinates
    const stats = getPolygonStats(polygon, 0)

    logger.subsection('Polygon')
    logger.log(`Bounds: ${formatBounds(stats.bounds)}`)
    logger.log(`Approx area: ${stats.approxArea.toFixed(2)} deg²`)
    logger.log(`Rings: ${stats.ringCount}`)
    logger.newline()
    logger.success('Single polygon detected — no obvious separate territories.')
    return
  }

  if (country.geometry.type !== 'MultiPolygon') {
    logger.warning(`Unsupported geometry type: ${country.geometry.type}`)
    return
  }

  const polygons = country.geometry.coordinates
  if (polygons.length === 0) {
    logger.warning('No polygons to analyze.')
    return
  }

  const polygonStats = polygons.map((polygon, idx) => getPolygonStats(polygon, idx))
  const mainland = polygonStats.reduce((largest, current) =>
    current.approxArea > largest.approxArea ? current : largest, polygonStats[0])

  logger.subsection(`Polygon Breakdown (${polygons.length})`)
  const separateCandidates = []

  for (const stats of polygonStats) {
    const isMainland = stats.index === mainland.index
    const distance = distanceBetweenCenters(stats.center, mainland.center)
    const likelySeparate = !isMainland && (distance > 5 || stats.approxArea < mainland.approxArea * 0.1)

    if (isMainland) {
      logger.highlight(`Polygon ${stats.index}: MAINLAND CANDIDATE`)
    }
    else {
      logger.log(`Polygon ${stats.index}:`)
    }

    logger.log(`  Bounds: ${formatBounds(stats.bounds)}`)
    logger.log(`  Approx area: ${stats.approxArea.toFixed(2)} deg²`)
    logger.log(`  Rings: ${stats.ringCount}`)
    logger.log(`  Distance from mainland: ${distance.toFixed(2)}°`)

    if (likelySeparate) {
      logger.warning('  Likely separate territory / island')
      separateCandidates.push({ stats, distance })
    }

    logger.newline()
  }

  if (separateCandidates.length > 0) {
    logger.subsection('Suggested Configuration Seeds')
    logger.log('Use polygonIndices to extract these territories in your config:')
    separateCandidates.forEach(({ stats }, idx) => {
      logger.log(`  '${country.id}-${idx}': { extractFrom: ${country.id}, polygonIndices: [${stats.index}] },`)
    })
    logger.newline()
  }
  else {
    logger.success('No clear separate territories detected.')
  }
}

/**
 * Look up country information from Natural Earth data
 * @param {string} searchTerm
 * @param {string} resolution
 */
async function lookupCountry(searchTerm, resolution) {
  logger.section(`Looking up "${searchTerm}"`)

  const worldData = await fetchWorldData(resolution)
  const featureCollection = topojson.feature(worldData, worldData.objects.countries)
  const features = featureCollection.features || []

  const normalized = searchTerm.toLowerCase()

  const matches = features.filter((feature) => {
    const idMatch = String(feature.id) === searchTerm || String(feature.id).padStart(3, '0') === searchTerm
    const names = [
      feature.properties?.name,
      feature.properties?.name_long,
      feature.properties?.admin,
      feature.properties?.formal_en,
      feature.properties?.brk_name,
    ]
      .filter(Boolean)
      .map(name => name.toLowerCase())

    const nameMatch = names.some(name => name.includes(normalized))

    return idMatch || nameMatch
  })

  if (matches.length === 0) {
    logger.error(`No countries found matching "${searchTerm}".`)
    logger.newline()
    logger.log('Try:')
    logger.log('  - Country name (e.g., "france", "portugal", "spain")')
    logger.log('  - Natural Earth ID (e.g., "250", "620", "724")')
    logger.log('  - ISO code (partial matches allowed)')
    logger.newline()
    return
  }

  if (matches.length > 1) {
    logger.info(`Found ${matches.length} matches.`)
  }

  matches.forEach((country, index) => {
    describeCountry(country, resolution, index, matches.length)
  })
}

async function main() {
  const args = parseArgs()

  if (args.help) {
    showHelp(
      'lookup-country',
      'Look up Natural Earth country geometry by name or ID.',
      'npm run geodata:lookup <country-name-or-id> [--resolution=10m|50m|110m]',
      {
        '<country-name-or-id>': 'Country name fragment or Natural Earth numeric ID',
        '--resolution=<val>': 'Override NE resolution (default: 50m)',
        '--help': 'Show this help message',
      },
    )
    return
  }

  if (!args.region) {
    logger.error('Missing country name or ID.')
    logger.newline()
    showHelp(
      'lookup-country',
      'Look up Natural Earth country geometry by name or ID.',
      'npm run geodata:lookup <country-name-or-id> [--resolution=10m|50m|110m]',
      {
        '<country-name-or-id>': 'Country name fragment or Natural Earth numeric ID',
        '--resolution=<val>': 'Override NE resolution (default: 50m)',
        '--help': 'Show this help message',
      },
    )
    process.exit(1)
  }

  if (args._unknown.length > 0) {
    logger.warning(`Ignoring unknown flag(s): ${args._unknown.join(', ')}`)
  }

  const resolution = getResolution(args)
  await lookupCountry(args.region, resolution)
}

main().catch((error) => {
  logger.error(error.message)
  if (process.env.DEBUG) {
    console.error(error)
  }
  process.exit(1)
})
