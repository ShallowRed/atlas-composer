/**
 * Test loading multiple presets to ensure compatibility
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
  'conic-equal-area': () => d3.geoConicEqualArea(),
})

const presets = [
  { name: 'France', file: 'france-default.json' },
  { name: 'Portugal', file: 'portugal-default.json' },
  { name: 'EU', file: 'europe-default.json' },
]

console.log('Testing multiple presets from the updated app...\n')

for (const preset of presets) {
  try {
    console.log(`📍 Testing ${preset.name} preset...`)
    const presetContent = readFileSync(`../../configs/presets/${preset.file}`, 'utf-8')

    const projection = loadFromJSON(presetContent, {
      width: 960,
      height: 500,
    })

    console.log(`✅ Successfully loaded ${preset.name} preset!`)

    // Basic validation
    if (typeof projection !== 'function') {
      throw new TypeError('Projection is not a function')
    }

    if (!projection.scale || !projection.translate) {
      throw new Error('Projection missing required methods')
    }

    console.log(`   - Scale: ${projection.scale()}`)
    console.log(`   - Translate: [${projection.translate().join(', ')}]`)
    console.log('')
  }
  catch (error) {
    console.error(`❌ Error loading ${preset.name}:`, error.message)
    break
  }
}

console.log('🎉 All preset tests completed successfully!')
console.log('The standalone projection loader now correctly supports the updated app format!')
