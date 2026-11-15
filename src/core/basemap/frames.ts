import type { GeoProjection } from 'd3-geo'

export type Extent = [[number, number], [number, number]]

// A projection and the rectangle of the canvas that it draws, in the order in which the basemap draws them
export interface BasemapFrame {
  code: string
  projection: GeoProjection
  extent: Extent
}

// A frame drawn later covers the labels of the frames under it
export function visibleLabels<L extends { frame: number, x: number, y: number }>(labels: L[], frames: Pick<BasemapFrame, 'extent'>[]): L[] {
  return labels.filter(({ frame, x, y }) => !frames.some(({ extent: [[x0, y0], [x1, y1]] }, index) => index > frame && x >= x0 && x <= x1 && y >= y0 && y <= y1))
}
