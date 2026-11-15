import { describe, expect, it } from 'vitest'
import { BASEMAP_SOURCE_DEFINITIONS } from '@/core/basemap'

describe('basemap sources', () => {
  it.each(Object.entries(BASEMAP_SOURCE_DEFINITIONS))('%s is served over https with its attribution', (_id, source) => {
    const url = source.kind === 'raster' ? source.tiles : source.tileJson
    expect(url.startsWith('https://')).toBe(true)
    if (source.kind === 'raster') {
      expect(url).toContain('{z}')
      expect(url).toContain('{x}')
      expect(url).toContain('{y}')
    }
    expect(source.attribution.length).toBeGreaterThan(0)
  })
})
