/**
 * Test loading a real preset from the app in the new format
 */

import { readFileSync } from 'node:fs'
import * as d3 from 'd3-geo'
import { loadFromJSON, registerProjections } from '../dist/index.js'

// Register D3 projections
registerProjections({
  'mercator': () => d3.geoMercator(),
  'conic-conformal': () => d3.geoConicConformal(),
  'albers': () => d3.geoAlbers(),
  'azimuthal-equal-area': () => d3.geoAzimuthalEqualArea(),
})

// Load and test the France preset
try {
  console.log('Loading France preset...')
  const francePreset = readFileSync('../../configs/presets/france-default.json', 'utf-8')

  const projection = loadFromJSON(francePreset, {
    width: 960,
    height: 500,
    debug: true,
  })

  console.log('✅ Successfully loaded France preset!')
  console.log('Projection details:')
  console.log('- Scale:', projection.scale ? projection.scale() : 'N/A')
  console.log('- Translate:', projection.translate ? projection.translate() : 'N/A')

  // Test projecting some points
  console.log('\nTesting point projection:')

  // Paris (should be in metropolitan France)
  const paris = projection([2.3522, 48.8566])
  console.log('Paris [2.35, 48.86] → ', paris)

  // Guadeloupe capital (should be in overseas territory)
  const basseterre = projection([-61.7311, 16.0119])
  console.log('Basse-Terre [-61.73, 16.01] → ', basseterre)

  console.log('\n✅ All tests completed successfully!')
}
catch (error) {
  console.error('❌ Error:', error.message)
  // eslint-disable-next-line n/no-process-exit
  process.exit(1)
}
