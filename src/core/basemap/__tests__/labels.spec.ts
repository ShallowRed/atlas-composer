import type { Extent } from '@/core/frames'
import { describe, expect, it } from 'vitest'
import { labelsToDraw } from '@/core/basemap'

describe('labelsToDraw', () => {
  const label = (frame: number, x: number, y: number, name: string, city = false, rank = 5) => ({ frame, x, y, name, city, rank })
  const frames: Array<{ extent: Extent }> = [{ extent: [[0, 0], [100, 100]] }, { extent: [[0, 0], [40, 40]] }]
  const boxOf = ({ x, y }: { x: number, y: number }): [number, number, number, number] => [x - 2, y - 6, x + 26, y + 6]

  it('drops the labels that a frame drawn later covers', () => {
    expect(labelsToDraw([label(0, 20, 20, 'covered'), label(0, 80, 80, 'free'), label(1, 20, 20, 'inset')], frames, boxOf).map(l => l.name))
      .toEqual(['free', 'inset'])
  })

  it('keeps the city, then the lower rank, of two names that overlap', () => {
    expect(labelsToDraw([label(0, 60, 60, 'town'), label(0, 62, 60, 'city', true)], frames, boxOf).map(l => l.name)).toEqual(['city'])
    expect(labelsToDraw([label(0, 60, 60, 'second', false, 7), label(0, 62, 60, 'first', false, 3)], frames, boxOf).map(l => l.name)).toEqual(['first'])
    expect(labelsToDraw([label(0, 50, 50, 'apart'), label(0, 50, 80, 'below')], frames, boxOf)).toHaveLength(2)
  })
})
