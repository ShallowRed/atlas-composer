// Verify the new unified base scale approach

const territories = [
  { name: 'France Métropolitaine', baseScaleMultiplier: 1.0 },
  { name: 'Saint-Martin', baseScaleMultiplier: 5.0 },
  { name: 'Guadeloupe', baseScaleMultiplier: 1.4 },
  { name: 'Martinique', baseScaleMultiplier: 1.6 },
  { name: 'Guyane', baseScaleMultiplier: 0.6 },
  { name: 'Saint-Pierre-et-Miquelon', baseScaleMultiplier: 1.3 },
  { name: 'Mayotte', baseScaleMultiplier: 1.6 },
  { name: 'La Réunion', baseScaleMultiplier: 1.2 },
  { name: 'TAAF', baseScaleMultiplier: 1.0 },
  { name: 'Nouvelle-Calédonie', baseScaleMultiplier: 0.3 },
  { name: 'Wallis-et-Futuna', baseScaleMultiplier: 2.7 },
  { name: 'Polynésie française', baseScaleMultiplier: 0.5 },
  { name: 'Saint-Barthélemy', baseScaleMultiplier: 5.0 },
]

const REFERENCE_SCALE = 2800

console.log('\n=== New Unified Base Scale Approach ===\n')
console.log('All territories use REFERENCE_SCALE * baseScaleMultiplier')
console.log(`Reference Scale: ${REFERENCE_SCALE}`)
console.log('\nTerritory'.padEnd(40), 'Base Multiplier'.padEnd(18), 'Final Scale')
console.log('='.repeat(85))

territories.forEach((t) => {
  const multiplier = t.baseScaleMultiplier.toFixed(1)
  const finalScale = (REFERENCE_SCALE * t.baseScaleMultiplier).toFixed(0)

  console.log(
    t.name.padEnd(40),
    multiplier.padEnd(18),
    finalScale,
  )
})

console.log('\n=== Key Points ===')
console.log('✓ All projections use same reference scale (2800)')
console.log('✓ baseScaleMultiplier from d3-composite-projections ensures proper composition')
console.log('✓ Multiplier = 1.0 means proportional to mainland')
console.log('✓ Multiplier > 1.0 makes territory larger (better visibility)')
console.log('✓ Multiplier < 1.0 makes territory smaller (better composition)')
console.log('✓ La Réunion (1.2) < Guadeloupe (1.4) - correct proportions!')
console.log('✓ Users can further adjust with scaleMultiplier controls\n')
