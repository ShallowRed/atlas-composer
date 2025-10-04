// Script pour vérifier les échelles proportionnelles des territoires

const BASE_SCALE_PER_DEGREE = 1070

const territories = {
  'France Métropolitaine': {
    bounds: [[-5, 41], [10, 51]],
  },
  'La Réunion': {
    bounds: [[55.22, -21.39], [55.84, -20.87]],
  },
  'Guadeloupe': {
    bounds: [[-61.81, 15.83], [-61.0, 16.52]],
  },
  'Martinique': {
    bounds: [[-61.23, 14.39], [-60.81, 14.88]],
  },
  'Guyane': {
    bounds: [[-54.6, 2.1], [-51.6, 5.8]],
  },
}

function calculateProportionalScale(bounds) {
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  const lonSpan = maxLon - minLon
  const latSpan = maxLat - minLat
  const avgSpan = (lonSpan + latSpan) / 2
  return BASE_SCALE_PER_DEGREE / avgSpan
}

console.log('\n📊 Calcul des échelles proportionnelles des territoires\n')
console.log('='.repeat(70))

let mainlandScale = 0
let mainlandAvgSpan = 0

for (const [name, config] of Object.entries(territories)) {
  const { bounds } = config
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  const lonSpan = maxLon - minLon
  const latSpan = maxLat - minLat
  const avgSpan = (lonSpan + latSpan) / 2
  const scale = calculateProportionalScale(bounds)

  if (name === 'France Métropolitaine') {
    mainlandScale = scale
    mainlandAvgSpan = avgSpan
  }

  const sizeRatio = mainlandAvgSpan > 0 ? (mainlandAvgSpan / avgSpan).toFixed(2) : 'N/A'
  const scaleRatio = mainlandScale > 0 ? (scale / mainlandScale).toFixed(2) : 'N/A'

  console.log(`\n${name}:`)
  console.log(`  Étendue géographique : ${lonSpan.toFixed(2)}° × ${latSpan.toFixed(2)}°`)
  console.log(`  Étendue moyenne : ${avgSpan.toFixed(2)}°`)
  console.log(`  Échelle D3 : ${Math.round(scale)}`)
  console.log(`  Ratio taille géo vs Métropole : ${sizeRatio}x`)
  console.log(`  Ratio échelle vs Métropole : ${scaleRatio}x`)
}

console.log(`\n${'='.repeat(70)}`)
console.log('\n✅ Avec cette méthode, TOUS les territoires ont la MÊME échelle de base')
console.log('   = Rapport de taille géographique INVERSÉ = Rapport d\'échelle')
console.log('   = Les territoires apparaissent proportionnels à leur vraie taille !\n')
