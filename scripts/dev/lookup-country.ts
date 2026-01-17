#!/usr/bin/env node

/**
 * Country Lookup Script
 * Look up Natural Earth country data by name or ID
 * Provides quick insight into geometry structure for configuration authoring
 */

import process from 'node:process'
import { getResolution, parseArgs, showHelp } from '#scripts/utils/cli-args'
import { logger } from '#scripts/utils/logger'
import { fetchWorldData } from '#scripts/utils/ne-data'
import * as topojson from 'topojson-client'

// ============================================================================
// TYPES
// ============================================================================

interface Bounds {
  minLon: number
  maxLon: number
  minLat: number
  maxLat: number
}

interface Center {
  lon: number
  lat: number
}

interface PolygonStats {
  index: number
  bounds: Bounds
  approxArea: number
  center: Center
  ringCount: number
}

interface SeparateCandidate {
  stats: PolygonStats
  distance: number
}

interface GeoJSONFeature {
  type: 'Feature'
  id?: string | number
  properties?: Record<string, any>
  geometry?: {
    type: string
    coordinates: any
  }
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate bounding box for a polygon ring
 * @param ring - Array of [lon, lat] coordinates
 * @returns Bounds
 */
function calculateBounds(ring: number[][]): Bounds {
  if (!ring || ring.length === 0) {
    return {
      minLon: 0,
      maxLon: 0,
      minLat: 0,
      maxLat: 0,
    }
  }

  const lons = ring.map(coord => coord[0]).filter((n): n is number => n !== undefined)
  const lats = ring.map(coord => coord[1]).filter((n): n is number => n !== undefined)

  return {
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  }
}

/**
 * Format bounds for friendly display
 * @param bounds - Bounds object
 * @returns Formatted bounds
 */
function formatBounds(bounds: Bounds): string {
  return `lon [${bounds.minLon.toFixed(2)}, ${bounds.maxLon.toFixed(2)}], lat [${bounds.minLat.toFixed(2)}, ${bounds.maxLat.toFixed(2)}]`
}

/**
 * Calculate polygon statistics used in analysis
 * @param polygon - MultiPolygon polygon (array of rings)
 * @param index - Polygon index
 * @returns Polygon stats
 */
function getPolygonStats(polygon: any[], index: number): PolygonStats {
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
 * Pretty-print a country feature with geometry insights
 * @param country - GeoJSON feature
 * @param resolution - Resolution string
 * @param index - Match index
 * @param total - Total matches
 */
function describeCountry(country: GeoJSONFeature, resolution: string, index: number, total: number): void {
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

  const polygonStats = polygons.map((polygon: any, idx: number) => getPolygonStats(polygon, idx))

  logger.subsection(`Polygon Breakdown (${polygons.length})`)
  const separateCandidates: SeparateCandidate[] = []

  // Sort by area for analysis
  const sortedStats = [...polygonStats].sort((a, b) => b.approxArea - a.approxArea)

  for (const stats of sortedStats) {
    logger.log(`Polygon ${stats.index}:`)
    logger.log(`  Bounds: ${formatBounds(stats.bounds)}`)
    logger.log(`  Approx area: ${stats.approxArea.toFixed(2)} deg²`)
    logger.log(`  Rings: ${stats.ringCount}`)

    // Flag small distant polygons as potential separate territories
    const isSmall = stats.approxArea < sortedStats[0].approxArea * 0.1
    if (isSmall && polygonStats.length > 1) {
      logger.warning('  Potential separate territory (small polygon)')
      separateCandidates.push({ stats, distance: 0 })
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
 * @param searchTerm - Country name or ID
 * @param resolution - Natural Earth resolution
 */
async function lookupCountry(searchTerm: string, resolution: string): Promise<void> {
  logger.section(`Looking up "${searchTerm}"`)

  const worldData = await fetchWorldData(resolution as any)
  const countriesObject = worldData.objects.countries
  if (!countriesObject) {
    throw new Error('No countries object found in world data')
  }
  const featureCollection = topojson.feature(worldData, countriesObject) as any as GeoJSONFeatureCollection
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

async function main(): Promise<void> {
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

  if (!args.country) {
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
  await lookupCountry(args.country, resolution)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  logger.error(message)
  if (process.env.DEBUG) {
    console.error(error)
  }
  process.exit(1)
})
