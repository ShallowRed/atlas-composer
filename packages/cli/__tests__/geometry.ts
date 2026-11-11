import type { AreaGeometry, Ring } from '@atlas-composer/preset-library'

/** The polygons of a geometry, each as its exterior ring followed by its holes */
export function ringsOf(geometry: AreaGeometry): Ring[][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
}

/** Twice the signed area of a ring in a plane with the y axis up: positive for a counterclockwise ring */
export function signedArea(ring: Ring): number {
  let area = 0
  for (let index = 0; index < ring.length - 1; index++) {
    const [x0, y0] = ring[index]!
    const [x1, y1] = ring[index + 1]!
    area += x0! * y1! - x1! * y0!
  }
  return area
}
