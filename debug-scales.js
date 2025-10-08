// Quick diagnostic to check scales for French territories

const territories = [
  { name: 'France Métropolitaine', bounds: [[-5, 41], [10, 51]], projectionType: 'conic-conformal' },
  { name: 'Saint-Martin', bounds: [[-63.15, 18.04], [-63.0, 18.13]], projectionType: 'mercator' },
  { name: 'Guadeloupe', bounds: [[-61.81, 15.83], [-61.0, 16.52]], projectionType: 'mercator' },
  { name: 'Martinique', bounds: [[-61.23, 14.39], [-60.81, 14.88]], projectionType: 'mercator' },
  { name: 'Guyane', bounds: [[-54.6, 2.1], [-51.6, 5.8]], projectionType: 'mercator' },
  { name: 'Saint-Pierre-et-Miquelon', bounds: [[-56.42, 46.75], [-56.13, 47.15]], projectionType: 'mercator' },
  { name: 'Mayotte', bounds: [[44.98, -13.0], [45.3, -12.64]], projectionType: 'mercator' },
  { name: 'La Réunion', bounds: [[55.22, -21.39], [55.84, -20.87]], projectionType: 'mercator' },
  { name: 'TAAF', bounds: [[39.0, -50.0], [77.0, -37.0]], projectionType: 'mercator' },
  { name: 'Nouvelle-Calédonie', bounds: [[163.0, -22.7], [168.0, -19.5]], projectionType: 'mercator' },
  { name: 'Wallis-et-Futuna', bounds: [[-178.2, -14.4], [-176.1, -13.2]], projectionType: 'mercator' },
  { name: 'Polynésie française', bounds: [[-154, -28], [-134, -7]], projectionType: 'mercator' },
  { name: 'Saint-Barthélemy', bounds: [[-62.88, 17.87], [-62.79, 17.97]], projectionType: 'mercator' },
]

const BASE_CONSTANT = 42000

function calculateGeographicExtent(bounds) {
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  const lonSpan = maxLon - minLon
  const latSpan = maxLat - minLat
  return Math.max(lonSpan, latSpan)
}

function calculateProportionalScaleOld(bounds, projectionType) {
  const territoryExtent = calculateGeographicExtent(bounds)

  if (projectionType === 'conic-conformal') {
    return BASE_CONSTANT / territoryExtent
  }
  else {
    // Old: Mercator with 0.25 multiplier
    return (BASE_CONSTANT / territoryExtent) * 0.25
  }
}

function calculateProportionalScaleNew(bounds, projectionType) {
  const territoryExtent = calculateGeographicExtent(bounds)

  if (projectionType === 'conic-conformal') {
    return BASE_CONSTANT / territoryExtent
  }
  else {
    // New: Mercator with 0.1 multiplier (60% reduction from 0.25)
    return (BASE_CONSTANT / territoryExtent) * 0.1
  }
}

console.log('\n=== Territory Scale Comparison ===\n')
console.log('Territory'.padEnd(35), 'Extent'.padEnd(8), 'OLD (0.25)'.padEnd(12), 'NEW (0.1)'.padEnd(12), 'Change')
console.log('='.repeat(95))

territories.forEach((t) => {
  const extent = calculateGeographicExtent(t.bounds).toFixed(2)
  const oldScale = calculateProportionalScaleOld(t.bounds, t.projectionType).toFixed(0)
  const newScale = calculateProportionalScaleNew(t.bounds, t.projectionType).toFixed(0)
  const change = t.projectionType === 'mercator' ? '-60%' : 'same'

  console.log(
    t.name.padEnd(35),
    extent.padEnd(8),
    oldScale.padEnd(12),
    newScale.padEnd(12),
    change,
  )
})

console.log('\n=== Fix Summary ===')
console.log('Changed Mercator multiplier from 0.25 to 0.1 (60% reduction)')
console.log('This makes overseas territories 60% smaller to match mainland France better')
console.log('Mainland France (conic projection) is unchanged')
console.log('\nIf territories are still too large, you can further reduce the multiplier.')
console.log('Suggested range: 0.05 to 0.15 depending on desired visual balance\n')
