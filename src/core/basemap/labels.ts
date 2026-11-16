import type { ProjectionFrame } from '@/core/frames'
import { visibleLabels } from '@/core/frames'

export interface PlaceLabel {
  frame: number
  x: number
  y: number
  name: string
  city: boolean
  rank: number
}

// The visible labels to draw, cities first by rank: a name whose box, which the drawing gives, overlaps a name kept is left out
export function labelsToDraw(labels: PlaceLabel[], frames: Pick<ProjectionFrame, 'extent'>[], boxOf: (label: PlaceLabel) => [number, number, number, number]): PlaceLabel[] {
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
