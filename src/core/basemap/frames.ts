import type { GeoProjection } from 'd3-geo'

export type Extent = [[number, number], [number, number]]

// A projection and the rectangle of the canvas that it draws, in the order in which the basemap draws them
export interface BasemapFrame {
  code: string
  projection: GeoProjection
  extent: Extent
}

export interface PlaceLabel {
  frame: number
  x: number
  y: number
  name: string
  city: boolean
  rank: number
}

export function inExtent([[x0, y0], [x1, y1]]: Extent, [x, y]: [number, number]): boolean {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1
}

// A frame drawn later covers the labels of the frames under it
export function visibleLabels<L extends { frame: number, x: number, y: number }>(labels: L[], frames: Pick<BasemapFrame, 'extent'>[]): L[] {
  return labels.filter(({ frame, x, y }) => !frames.some(({ extent }, index) => index > frame && inExtent(extent, [x, y])))
}

// The visible labels to draw, cities first by rank: a name whose box, which the drawing gives, overlaps a name kept is left out
export function labelsToDraw(labels: PlaceLabel[], frames: Pick<BasemapFrame, 'extent'>[], boxOf: (label: PlaceLabel) => [number, number, number, number]): PlaceLabel[] {
  const kept: Array<[number, number, number, number]> = []
  return visibleLabels(labels, frames)
    .sort((a, b) => Number(b.city) - Number(a.city) || a.rank - b.rank)
    .filter((label) => {
      const box = boxOf(label)
      if (kept.some(([x0, y0, x1, y1]) => box[0] < x1 && box[2] > x0 && box[1] < y1 && box[3] > y0)) {
        return false
      }
      kept.push(box)
      return true
    })
}
