// Test to measure actual projected sizes of territories
// to understand how Conic Conformal vs Mercator scales differ

import * as d3 from 'd3-geo'

const territories = {
  'France Métropolitaine': {
    bounds: [[-5, 41], [10, 51]],
    projection: 'conic',
    scale: 2800,
  },
  'La Réunion': {
    bounds: [[55.22, -21.39], [55.84, -20.87]],
    projection: 'mercator',
    scale: 67742,
  },
  'Guadeloupe': {
    bounds: [[-61.81, 15.83], [-61.0, 16.52]],
    projection: 'mercator',
    scale: 51852,
  },
}

console.log('\n🧪 Test des tailles projetées réelles\n')
console.log('='.repeat(70))

for (const [name, config] of Object.entries(territories)) {
  const { bounds, projection: projType, scale } = config
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  const center = [(minLon + maxLon) / 2, (minLat + maxLat) / 2]

  let projection
  if (projType === 'conic') {
    projection = d3.geoConicConformal()
      .center(center)
      .scale(scale)
      .rotate([-3, 0])
      .parallels([45.898889, 47.696014])
      .translate([0, 0])
  }
  else {
    projection = d3.geoMercator()
      .center(center)
      .scale(scale)
      .translate([0, 0])
  }

  // Project the four corners
  const topLeft = projection([minLon, maxLat])
  const topRight = projection([maxLon, maxLat])
  const bottomLeft = projection([minLon, minLat])
  const bottomRight = projection([maxLon, minLat])

  if (!topLeft || !topRight || !bottomLeft || !bottomRight) {
    console.log(`\n${name}: Projection failed`)
    continue
  }

  // Calculate pixel dimensions
  const width = Math.abs(topRight[0] - topLeft[0])
  const height = Math.abs(bottomLeft[1] - topLeft[1])
  const area = width * height

  console.log(`\n${name}:`)
  console.log(`  Projection: ${projType}, Scale: ${scale}`)
  console.log(`  Taille projetée: ${width.toFixed(0)}px × ${height.toFixed(0)}px`)
  console.log(`  Surface projetée: ${area.toFixed(0)} px²`)
  console.log(`  Geographic extent: ${(maxLon - minLon).toFixed(2)}° × ${(maxLat - minLat).toFixed(2)}°`)
}

console.log(`\n${'='.repeat(70)}`)
console.log('\n💡 Si La Réunion apparaît plus grande que prévu:')
console.log('   → Les projections Mercator et Conic ont des échelles différentes')
console.log('   → Il faut appliquer un facteur de correction pour Mercator\n')
