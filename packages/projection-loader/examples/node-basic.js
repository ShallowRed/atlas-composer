/**
 * Basic Node.js Example - Standalone Projection Loader
 *
 * This example shows how to use the standalone projection loader in a Node.js
 * environment with CommonJS or ESM.
 *
 * Installation:
 *   npm install standalone-projection-loader d3-geo d3-geo-projection
 *
 * Usage:
 *   node node-basic.js
 */

// ESM imports (use require() for CommonJS)
import * as d3Geo from 'd3-geo'
import * as d3GeoProjection from 'd3-geo-projection'
import {
  getRegisteredProjections,
  loadCompositeProjection,
  registerProjection,
  registerProjections,
} from '../src/standalone-projection-loader.js'

console.log('🗺️  Standalone Projection Loader - Node.js Example\n')

// Step 1: Register the projections you need
console.log('Step 1: Registering projections...')

// Option A: Register individually
registerProjection('mercator', () => d3Geo.geoMercator())
registerProjection('albers', () => d3Geo.geoAlbers())

// Option B: Register in bulk
registerProjections({
  conicConformal: () => d3Geo.geoConicConformal(),
  azimuthalEqualArea: () => d3Geo.geoAzimuthalEqualArea(),
  orthographic: () => d3Geo.geoOrthographic(),
  naturalEarth1: () => d3GeoProjection.geoNaturalEarth1(),
})

console.log(`✓ Registered ${getRegisteredProjections().length} projections\n`)

// Step 2: Define your composite projection configuration
console.log('Step 2: Loading composite projection configuration...')

const usaConfig = {
  name: 'United States',
  projections: [
    {
      id: 'mainland',
      bounds: [[-130, 24], [-65, 50]],
      projection: {
        type: 'albers',
        center: [-96, 37.5],
        parallels: [29.5, 45.5],
        scale: 1000,
      },
    },
    {
      id: 'alaska',
      bounds: [[-180, 51], [-130, 72]],
      projection: {
        type: 'albers',
        center: [-154, 59],
        parallels: [55, 65],
        scale: 600,
      },
    },
    {
      id: 'hawaii',
      bounds: [[-160, 18.5], [-154.5, 22.5]],
      projection: {
        type: 'albers',
        center: [-157, 20.5],
        parallels: [19, 21],
        scale: 2000,
      },
    },
  ],
  layout: {
    width: 960,
    height: 600,
    positions: {
      mainland: { x: 480, y: 300 },
      alaska: { x: 200, y: 500 },
      hawaii: { x: 400, y: 550 },
    },
  },
}

// Step 3: Load the composite projection
try {
  const projection = loadCompositeProjection(usaConfig, {
    width: 960,
    height: 600,
  })

  console.log('✓ Composite projection loaded successfully!\n')

  // Step 4: Use the projection
  console.log('Step 4: Testing projection...')

  // Test projecting some coordinates
  const testPoints = [
    { name: 'New York', coords: [-74.0, 40.7] },
    { name: 'Los Angeles', coords: [-118.2, 34.0] },
    { name: 'Anchorage', coords: [-149.9, 61.2] },
    { name: 'Honolulu', coords: [-157.8, 21.3] },
  ]

  console.log('\nProjected coordinates:')
  testPoints.forEach((point) => {
    const projected = projection(point.coords)
    if (projected) {
      console.log(`  ${point.name}: [${projected[0].toFixed(2)}, ${projected[1].toFixed(2)}]`)
    }
    else {
      console.log(`  ${point.name}: null (outside bounds)`)
    }
  })

  console.log('\n✓ All tests passed!')
  console.log('\n📦 Ready to use in your application!')
}
catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}

// Step 5: Additional utilities demo
console.log('\n--- Additional Utilities ---')
console.log(`Registered projections: ${getRegisteredProjections().join(', ')}`)

// Clean up (optional)
// clearProjections();
// console.log('Cleared all projections');
