/**
 * Custom Projection Example
 *
 * This example demonstrates how to register custom projection implementations
 * with the standalone projection loader.
 *
 * You can use:
 * - Custom D3 projections
 * - Proj4 projections
 * - Your own projection algorithms
 * - Third-party projection libraries
 */

import { geoMercator } from 'd3-geo'
import { loadCompositeProjection, registerProjection } from '../src/standalone-projection-loader.js'

console.log('🎨 Custom Projection Example\n')

// Example 1: Simple custom projection
// A naive equirectangular projection (for demonstration)
console.log('Example 1: Simple custom projection')

function createCustomEquirectangular() {
  const projection = (coords) => {
    const [lon, lat] = coords
    // Simple plate carrée: x = λ, y = φ (scaled)
    const x = (lon + 180) * 2 // Scale to 0-720
    const y = (90 - lat) * 2 // Scale to 0-360, inverted
    return [x, y]
  }

  // Optional: Add D3-like configuration methods
  projection.scale = function (s) {
    if (!arguments.length)
      return 100 // getter
    // setter would update internal scale
    return projection
  }

  projection.center = function (c) {
    if (!arguments.length)
      return [0, 0] // getter
    // setter would update internal center
    return projection
  }

  return projection
}

registerProjection('customEquirectangular', createCustomEquirectangular)
console.log('✓ Registered custom equirectangular projection\n')

// Example 2: Enhanced projection with full D3 interface
console.log('Example 2: Enhanced custom projection with D3 interface')

function createEnhancedProjection() {
  let scale = 100
  let center = [0, 0]
  let translate = [0, 0]

  const projection = (coords) => {
    const [lon, lat] = coords

    // Apply center offset
    const offsetLon = lon - center[0]
    const offsetLat = lat - center[1]

    // Simple projection math
    const x = offsetLon * scale / 90 + translate[0]
    const y = -offsetLat * scale / 90 + translate[1] // Invert Y

    return [x, y]
  }

  // D3-compatible getter/setter methods
  projection.scale = function (s) {
    return arguments.length ? (scale = s, projection) : scale
  }

  projection.center = function (c) {
    return arguments.length ? (center = c, projection) : center
  }

  projection.translate = function (t) {
    return arguments.length ? (translate = t, projection) : translate
  }

  // Optional: Add stream method for advanced D3 usage
  projection.stream = function (stream) {
    return stream // Simplified for demo
  }

  return projection
}

registerProjection('enhanced', createEnhancedProjection)
console.log('✓ Registered enhanced custom projection\n')

// Example 3: Wrapping a Proj4 projection
console.log('Example 3: Proj4 wrapper (conceptual)')

// Note: This is a conceptual example. In real usage:
// import proj4 from 'proj4';

function createProj4Wrapper(projString) {
  return () => {
    const projection = (coords) => {
      // In real implementation:
      // return proj4(projString, coords);

      // For demo, just return identity
      console.log(`  Would project ${coords} using: ${projString}`)
      return coords
    }

    projection.center = function (c) {
      return arguments.length ? projection : [0, 0]
    }

    return projection
  }
}

registerProjection(
  'epsg3857',
  createProj4Wrapper('EPSG:3857'), // Web Mercator
)

console.log('✓ Registered Proj4-wrapped projection (EPSG:3857)\n')

// Example 4: Register standard D3 projection with custom defaults
console.log('Example 4: D3 projection with custom defaults')

registerProjection('customMercator', () => {
  const projection = geoMercator()
    .scale(200)
    .center([0, 20]) // Custom default center
    .precision(0.1)

  return projection
})

console.log('✓ Registered D3 Mercator with custom defaults\n')

// Now use these custom projections in a configuration
console.log('--- Testing Custom Projections ---\n')

const config = {
  name: 'Custom Projections Demo',
  projections: [
    {
      id: 'custom1',
      bounds: [[-180, -90], [180, 90]],
      projection: {
        type: 'customEquirectangular',
        scale: 150,
      },
    },
    {
      id: 'custom2',
      bounds: [[-180, -90], [180, 90]],
      projection: {
        type: 'enhanced',
        center: [0, 0],
        scale: 200,
      },
    },
  ],
  layout: {
    width: 800,
    height: 400,
    positions: {
      custom1: { x: 200, y: 200 },
      custom2: { x: 600, y: 200 },
    },
  },
}

try {
  const projection = loadCompositeProjection(config, {
    width: 800,
    height: 400,
  })

  console.log('✓ Loaded composite projection with custom projections!\n')

  // Test projection
  const testCoords = [
    [0, 0], // Equator, Prime Meridian
    [-74, 40.7], // New York
    [2.3, 48.9], // Paris
  ]

  console.log('Testing coordinates:')
  testCoords.forEach((coords) => {
    const result = projection(coords)
    if (result) {
      console.log(`  ${coords} → [${result[0].toFixed(2)}, ${result[1].toFixed(2)}]`)
    }
  })

  console.log('\n✓ Custom projections work perfectly!')
}
catch (error) {
  console.error('❌ Error:', error.message)
}

console.log('\n💡 Key Takeaways:')
console.log('   1. You can register ANY projection function')
console.log('   2. Must return a callable projection: (coords) => [x, y]')
console.log('   3. Optional: Add D3-like methods (scale, center, etc.)')
console.log('   4. Works with D3, Proj4, or custom algorithms')
console.log('   5. Full control over projection behavior')

/**
 * Custom Projection Requirements:
 *
 * Minimum interface (required):
 * - projection(coords: [lon, lat]): [x, y] | null
 *
 * Optional D3-compatible methods:
 * - scale(value?): number | projection
 * - center(coords?): [lon, lat] | projection
 * - rotate(angles?): [λ, φ, γ] | projection
 * - translate(point?): [x, y] | projection
 * - parallels(values?): [φ1, φ2] | projection
 * - stream(stream): transformStream
 *
 * Best practices:
 * - Use getter/setter pattern like D3
 * - Return null for coordinates outside projection bounds
 * - Handle edge cases (poles, antimeridian, etc.)
 * - Document your projection's behavior
 */
