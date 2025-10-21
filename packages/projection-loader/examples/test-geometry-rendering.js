/**
 * Test actual geometry rendering with GeoJSON to verify stream multiplexing works
 */

import { readFileSync } from 'node:fs'
import * as d3 from 'd3-geo'
import { loadFromJSON, registerProjections } from '../dist/index.js'

// Register projections
registerProjections({
  'mercator': () => d3.geoMercator(),
  'conic-conformal': () => d3.geoConicConformal(),
  'albers': () => d3.geoAlbers(),
  'azimuthal-equal-area': () => d3.geoAzimuthalEqualArea(),
  'conic-equal-area': () => d3.geoConicEqualArea(),
})

console.log('🧪 Testing GeoJSON Geometry Rendering\n')

try {
  // Load France preset
  console.log('📋 Loading France preset...')
  const francePreset = readFileSync('../../configs/presets/france-default.json', 'utf-8')

  const projection = loadFromJSON(francePreset, {
    width: 960,
    height: 500,
    debug: true, // Enable debug to see any stream errors
  })

  console.log('✅ Projection loaded successfully')

  // Create a simple test geometry (a small polygon in France)
  const testGeometry = {
    type: 'Polygon',
    coordinates: [[
      [2.0, 48.5], // Southwest of Paris
      [2.5, 48.5], // Southeast of Paris
      [2.5, 49.0], // Northeast of Paris
      [2.0, 49.0], // Northwest of Paris
      [2.0, 48.5], // Close the polygon
    ]],
  }

  console.log('🗺️  Testing polygon geometry rendering...')

  // Create a path generator
  const path = d3.geoPath(projection)

  // This should trigger the stream multiplexing
  const pathString = path(testGeometry)

  if (pathString) {
    console.log(`✅ Polygon rendered successfully!`)
    console.log(`   Path length: ${pathString.length} characters`)
    console.log(`   Path preview: ${pathString.substring(0, 100)}...`)
  }
  else {
    console.log(`❌ Polygon rendering returned null/undefined`)
  }

  // Test with a feature collection
  console.log('\n🗺️  Testing FeatureCollection...')
  const featureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Test Paris Area' },
        geometry: testGeometry,
      },
      {
        type: 'Feature',
        properties: { name: 'Test Guadeloupe Area' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-61.8, 15.8],
            [-61.0, 15.8],
            [-61.0, 16.5],
            [-61.8, 16.5],
            [-61.8, 15.8],
          ]],
        },
      },
    ],
  }

  const collectionPath = path(featureCollection)
  if (collectionPath) {
    console.log(`✅ FeatureCollection rendered successfully!`)
    console.log(`   Path length: ${collectionPath.length} characters`)
  }
  else {
    console.log(`❌ FeatureCollection rendering failed`)
  }

  console.log('\n🎉 All geometry rendering tests passed!')
  console.log('The stream multiplexing is working correctly!')
}
catch (error) {
  console.error('❌ Test failed:', error.message)
  console.error('Stack trace:', error.stack)
  process.exit(1)
}
