/**
 * Tree-Shakeable Imports Example
 *
 * This example demonstrates how to import only the projections you need,
 * taking advantage of tree-shaking to minimize bundle size.
 *
 * This approach is ideal for production builds where bundle size matters.
 *
 * Build tools like Webpack, Rollup, or Vite will automatically remove
 * unused projections from the final bundle.
 */

// Import only what you need from D3
import { geoConicConformal, geoMercator } from 'd3-geo'
import { geoNaturalEarth1 } from 'd3-geo-projection'

// Import the loader functions
import {
  loadCompositeProjection,
  registerProjection,
} from '../src/standalone-projection-loader.js'

console.log('🌳 Tree-Shakeable Imports Example\n')

// Register ONLY the projections you actually use
// This keeps your bundle size small!
console.log('Registering only needed projections...')

registerProjection('mercator', () => geoMercator())
registerProjection('conicConformal', () => geoConicConformal())
registerProjection('naturalEarth1', () => geoNaturalEarth1())

console.log('✓ Registered 3 projections (minimal bundle size)\n')

// Configuration using only the registered projections
const config = {
  name: 'Europe',
  projections: [
    {
      id: 'mainland',
      bounds: [[-10, 35], [40, 70]],
      projection: {
        type: 'conicConformal',
        center: [15, 52],
        parallels: [40, 60],
        scale: 800,
      },
    },
    {
      id: 'canary',
      bounds: [[-18.5, 27.5], [-13, 29.5]],
      projection: {
        type: 'mercator',
        center: [-15.5, 28.5],
        scale: 5000,
      },
    },
  ],
  layout: {
    width: 800,
    height: 600,
    positions: {
      mainland: { x: 400, y: 300 },
      canary: { x: 150, y: 500 },
    },
  },
}

// Load and use the projection
const projection = loadCompositeProjection(config, {
  width: 800,
  height: 600,
})

console.log('✓ Projection loaded with minimal dependencies!')

// Example: Project some European cities
const cities = [
  { name: 'London', coords: [-0.1, 51.5] },
  { name: 'Paris', coords: [2.3, 48.9] },
  { name: 'Berlin', coords: [13.4, 52.5] },
  { name: 'Las Palmas', coords: [-15.4, 28.1] },
]

console.log('\nProjected coordinates:')
cities.forEach((city) => {
  const projected = projection(city.coords)
  if (projected) {
    console.log(`  ${city.name}: [${projected[0].toFixed(1)}, ${projected[1].toFixed(1)}]`)
  }
})

console.log('\n💡 Bundle Size Benefit:')
console.log('   Instead of importing all 50+ D3 projections (~100KB),')
console.log('   you only bundled 3 projections (~6KB).')
console.log('   That\'s a 94% reduction! 🎉')

/**
 * Pro Tips for Maximum Tree-Shaking:
 *
 * 1. Use named imports, not namespace imports:
 *    ✓ import { geoMercator } from 'd3-geo'
 *    ✗ import * as d3 from 'd3-geo'
 *
 * 2. Register projections at the top level, not inside functions:
 *    ✓ registerProjection('mercator', () => geoMercator())
 *    ✗ function init() { registerProjection(...) }
 *
 * 3. Use a modern bundler with tree-shaking enabled:
 *    - Vite (enabled by default)
 *    - Webpack 5+ (mode: 'production')
 *    - Rollup (enabled by default)
 *
 * 4. Check your bundle analysis:
 *    - Vite: npx vite-bundle-visualizer
 *    - Webpack: webpack-bundle-analyzer
 */
