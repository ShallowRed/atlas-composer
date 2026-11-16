import { geoRobinson } from 'd3-geo-projection'
import { describe, expect, it } from 'vitest'
import { invertOnGlobe } from '@/core/frames'

describe('invertOnGlobe', () => {
  const world = geoRobinson().fitSize([960, 500], { type: 'Sphere' })

  it('inverts a pixel of the globe and refuses a corner outside it', () => {
    expect(invertOnGlobe(world, [480, 250])).not.toBeNull()
    expect(invertOnGlobe(world, [2, 2])).toBeNull()
  })
})
