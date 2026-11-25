import { describe, expect, it } from 'vitest'
import { subProjectionAnchor, subProjectionScale, translateOffsetOf } from '../placement'

const canvas = { width: 960, height: 500 }

describe('placement of a sub-projection', () => {
  it('scales the reference scale by the multiplier of the territory', () => {
    expect(subProjectionScale(2000, 1.5)).toBe(3000)
  })

  it('anchors the territory at the center of the canvas plus its translate offset, and back', () => {
    expect(subProjectionAnchor(canvas, [-30, 40])).toEqual([450, 290])
    expect(translateOffsetOf(canvas, [450, 290])).toEqual([-30, 40])
  })
})
