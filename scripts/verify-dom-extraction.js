#!/usr/bin/env node

/**
 * Diagnostic script to verify extractOverseasFromMainland matching
 * Checks if the 5 DOM embedded in France (250) match our territory bounds
 */

import fs from 'node:fs'
import process from 'node:process'
import topojson from 'topojson-client'

// Load data
const data = JSON.parse(fs.readFileSync('./src/public/data/france-territories-50m.json', 'utf8'))
const feature = topojson.feature(data, data.objects.territories)
const france = feature.features.find(f => f.properties.id === '250')

// Territory bounds from france.data.ts
const territoryBounds = {
  'FR-YT': { name: 'Mayotte', bounds: [[44.98, -13.0], [45.3, -12.64]] },
  'FR-RE': { name: 'La Réunion', bounds: [[55.22, -21.39], [55.84, -20.87]] },
  'FR-MQ': { name: 'Martinique', bounds: [[-61.23, 14.39], [-60.81, 14.88]] },
  'FR-GP': { name: 'Guadeloupe', bounds: [[-61.81, 15.83], [-61.0, 16.52]] },
  'FR-GF': { name: 'Guyane', bounds: [[-54.6, 2.1], [-51.6, 5.8]] },
}

console.log('🔍 Analyzing France (250) MultiPolygon for embedded DOM territories\n')

if (france.geometry.type !== 'MultiPolygon') {
  console.error('❌ France is not a MultiPolygon!')
  process.exit(1)
}

console.log(`Found ${france.geometry.coordinates.length} polygons in France geometry\n`)

const matched = new Set()
const tolerance = 0.1

france.geometry.coordinates.forEach((polygon, i) => {
  const firstRing = polygon[0]
  const lons = firstRing.map(coord => coord[0])
  const lats = firstRing.map(coord => coord[1])
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)

  console.log(`Polygon ${i}:`)
  console.log(`  Bounds: lon[${minLon.toFixed(2)}, ${maxLon.toFixed(2)}] lat[${minLat.toFixed(2)}, ${maxLat.toFixed(2)}]`)

  // Try to match against configured territories
  let matchFound = false
  for (const [code, config] of Object.entries(territoryBounds)) {
    const [[configMinLon, configMinLat], [configMaxLon, configMaxLat]] = config.bounds

    if (
      minLon >= (configMinLon - tolerance)
      && maxLon <= (configMaxLon + tolerance)
      && minLat >= (configMinLat - tolerance)
      && maxLat <= (configMaxLat + tolerance)
    ) {
      console.log(`  ✅ MATCH: ${config.name} (${code})`)
      matched.add(code)
      matchFound = true
      break
    }
  }

  if (!matchFound) {
    // Check if it's mainland France
    if (minLon >= -5 && maxLon <= 10 && minLat >= 41 && maxLat <= 52) {
      console.log('  📍 Mainland France or Corsica')
    }
    else {
      console.log('  ⚠️  No match - unknown polygon')
    }
  }

  console.log()
})

console.log('\n📊 Summary:')
console.log(`Matched territories: ${matched.size}/5`)
console.log('Matched codes:', Array.from(matched).join(', '))

const missing = Object.keys(territoryBounds).filter(code => !matched.has(code))
if (missing.length > 0) {
  console.log('\n❌ Missing matches:', missing.join(', '))
  console.log('\n💡 Check if bounds in france.data.ts need adjustment')
  process.exit(1)
}
else {
  console.log('\n✅ All 5 DOM territories successfully matched!')
  console.log('✅ extractOverseasFromMainland() should work correctly')
}
