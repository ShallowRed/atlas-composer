/**
 * The west and east edges, the width and the center of the longitudes of a ring, in [-180, 180]; across the antimeridian,
 * the west edge exceeds the east edge, as geoBounds of d3-geo writes it. geoBounds reads the polygon 15 of Fiji at 50m,
 * whose ring goes from -180 to 180 by an edge of length zero, as spanning the whole globe
 */
export function longitudeExtent(longitudes: number[]): { west: number, east: number, width: number, center: number } {
  const continuous = continuousLongitudes(longitudes)
  const west = Math.min(...continuous)
  const east = Math.max(...continuous)
  return { west: wrapLongitude(west), east: wrapLongitude(east), width: east - west, center: wrapLongitude((west + east) / 2) }
}

/**
 * The longitudes of a ring, with its negative longitudes shifted by 360° when it crosses the antimeridian: it spans more
 * than 180° as given and less once shifted. A ring that spans more than 180° both ways goes round a pole and stays as given
 */
export function continuousLongitudes(longitudes: number[]): number[] {
  const shifted = longitudes.map(longitude => (longitude < 0 ? longitude + 360 : longitude))
  const crosses = Math.max(...longitudes) - Math.min(...longitudes) > 180 && Math.max(...shifted) - Math.min(...shifted) <= 180
  return crosses ? shifted : longitudes
}

function wrapLongitude(longitude: number): number {
  return longitude > 180 ? longitude - 360 : longitude
}

// The difference of two longitudes in [-180, 180]
export function longitudeDifference(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180
}
