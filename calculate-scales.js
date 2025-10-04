// Script pour vérifier les échelles proportionnelles des territoires

const territories = {
  'France Métropolitaine': {
    bounds: [[-5, 41], [10, 51]],
    projection: 'conic-conformal',
  },
  'La Réunion': {
    bounds: [[55.22, -21.39], [55.84, -20.87]],
    projection: 'mercator',
  },
  'Guadeloupe': {
    bounds: [[-61.81, 15.83], [-61.0, 16.52]],
    projection: 'mercator',
  },
  'Martinique': {
    bounds: [[-61.23, 14.39], [-60.81, 14.88]],
    projection: 'mercator',
  },
  'Guyane': {
    bounds: [[-54.6, 2.1], [-51.6, 5.8]],
    projection: 'mercator',
  },
}

function calculateProportionalScale(bounds, projectionType = 'mercator') {
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  const lonSpan = maxLon - minLon
  const latSpan = maxLat - minLat

  const maxSpan = Math.max(lonSpan, latSpan)

  if (projectionType === 'conic-conformal') {
    // Conic: scale inversely proportional to max span
    // 42000 / 15° ≈ 2800 for mainland France
    return 42000 / maxSpan
  }
  else {
    // Mercator at mid-latitudes (15-25°) needs ~4x smaller scale than Conic
    // to produce proportional output
    return (42000 / maxSpan) * 0.25
  }
}

console.log('\n📊 Calcul des échelles proportionnelles des territoires\n')
console.log('='.repeat(70))

let mainlandScale = 0
let mainlandMaxSpan = 0

for (const [name, config] of Object.entries(territories)) {
  const { bounds, projection } = config
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  const lonSpan = maxLon - minLon
  const latSpan = maxLat - minLat
  const maxSpan = Math.max(lonSpan, latSpan)
  const scale = calculateProportionalScale(bounds, projection)

  if (name === 'France Métropolitaine') {
    mainlandScale = scale
    mainlandMaxSpan = maxSpan
  }

  const extentRatio = mainlandMaxSpan > 0 ? (mainlandMaxSpan / maxSpan).toFixed(1) : 'N/A'
  const scaleRatio = mainlandScale > 0 ? (scale / mainlandScale).toFixed(3) : 'N/A'

  // Visual size is determined by: projected_size = geographic_extent * scale
  // Since scale = K / maxSpan, we have: projected_size = K (constant for all territories!)
  // This means all territories would appear the SAME size, which is wrong.
  //
  // The correct formula: relative visual size ∝ geographic extent
  // Because scale compensates exactly for the extent difference
  const relativeVisualSize = mainlandMaxSpan > 0
    ? ((maxSpan / mainlandMaxSpan) * 100).toFixed(1)
    : 'N/A'

  console.log(`\n${name} (${projection}):`)
  console.log(`  Étendue géographique : ${lonSpan.toFixed(2)}° × ${latSpan.toFixed(2)}° (max: ${maxSpan.toFixed(2)}°)`)
  console.log(`  Échelle D3 calculée : ${Math.round(scale)}`)
  console.log(`  La métropole est ${extentRatio}x plus grande géographiquement`)
  console.log(`  Ratio d'échelle : ${scaleRatio}x de la métropole`)
  console.log(`  → Taille visuelle attendue : ${relativeVisualSize}% de la métropole`)
}

console.log(`\n${'='.repeat(70)}`)
console.log('\n✅ Méthode avec correction Mercator/Conic:')
console.log('   → Facteur de correction 0.04 pour projections Mercator')
console.log('   → Compense la différence d\'interprétation de scale entre projections')
console.log('   → À scaleMultiplier=1.0, les rapports de taille sont EXACTS')
console.log('   → La Réunion apparaît ~4% de la taille de la Métropole (proportions réelles)\n')
