// Extract positioning from d3-composite-projections and convert to pixel offsets
// Reference: conicConformalFrance.js translate() method

const REFERENCE_SCALE = 2800 // Our reference scale (k in d3-composite-projections)

// Positioning from d3-composite-projections (normalized coordinates)
// Format: [x_offset, y_offset] relative to center
const positions = {
  // Left side - Caribbean and Atlantic
  'FR-GF': { x: -0.12, y: 0.0575 }, // Guyane
  'FR-MQ': { x: -0.12, y: 0.013 }, // Martinique
  'FR-GP': { x: -0.12, y: -0.014 }, // Guadeloupe
  'FR-BL': { x: -0.12, y: -0.044 }, // Saint-Barthélemy
  'FR-PM': { x: -0.12, y: -0.065 }, // Saint-Pierre-et-Miquelon
  'FR-MF': { x: -0.12, y: -0.044 }, // Saint-Martin (not in d3-cp, using similar to St-Barth)

  // Right side - Indian Ocean and Pacific
  'FR-YT': { x: 0.117, y: -0.064 }, // Mayotte
  'FR-RE': { x: 0.116, y: -0.0355 }, // La Réunion
  'FR-NC': { x: 0.116, y: -0.0048 }, // Nouvelle-Calédonie
  'FR-WF': { x: 0.116, y: 0.022 }, // Wallis-et-Futuna
  'FR-PF': { x: 0.115, y: 0.075 }, // Polynésie française (main)
  'FR-TF': { x: 0.117, y: 0.045 }, // TAAF (not in d3-cp, estimated position)
}

console.log('\n=== d3-composite-projections Positioning ===\n')
console.log('Territory Code'.padEnd(18), 'Normalized X'.padEnd(15), 'Normalized Y'.padEnd(15), 'Pixel Offset X'.padEnd(18), 'Pixel Offset Y')
console.log('='.repeat(95))

Object.entries(positions).forEach(([code, pos]) => {
  const pixelX = Math.round(pos.x * REFERENCE_SCALE)
  const pixelY = Math.round(pos.y * REFERENCE_SCALE)

  console.log(
    code.padEnd(18),
    pos.x.toFixed(4).padEnd(15),
    pos.y.toFixed(4).padEnd(15),
    pixelX.toString().padEnd(18),
    pixelY.toString(),
  )
})

console.log('\n=== Positioning Pattern ===')
console.log('Left column (Caribbean/Atlantic): x ≈ -336 (normalized: -0.12)')
console.log('Right column (Indian/Pacific):     x ≈ +325 (normalized: 0.116)')
console.log('Y positions vary to stack territories vertically')
console.log('\nThese positions ensure territories are arranged in columns')
console.log('similar to d3-composite-projections layout\n')
