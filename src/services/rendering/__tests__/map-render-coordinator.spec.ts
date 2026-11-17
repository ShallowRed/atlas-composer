import { describe, expect, it, vi } from 'vitest'
import { MapRenderCoordinator } from '@/services/rendering/map-render-coordinator'

function view() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 960 500')
  svg.append(document.createElementNS('http://www.w3.org/2000/svg', 'g'))
  return svg
}

const basemap = (svg: SVGSVGElement) => svg.querySelector(':scope > g.basemap')!

describe('basemap of the map', () => {
  it('covers the view with one image, under the other layers, out of the way of the pointer', () => {
    const svg = view()
    MapRenderCoordinator.insertBasemap(svg, 'blob:1')

    expect(svg.firstElementChild).toBe(basemap(svg))
    expect(basemap(svg).getAttribute('pointer-events')).toBe('none')
    const image = basemap(svg).querySelector(':scope > image')!
    expect(['href', 'x', 'y', 'width', 'height', 'preserveAspectRatio'].map(name => image.getAttribute(name))).toEqual(['blob:1', '0', '0', '960', '500', 'none'])
  })

  it('keeps the previous content under a new image until the new image is decoded', async () => {
    const svg = view()
    MapRenderCoordinator.insertBasemap(svg, 'blob:0', { view: [0, 0, 960, 500], placements: [{ code: 'FR', from: [[0, 0], [100, 100]], to: [[0, 0], [100, 100]] }] })
    let decoded = () => {}
    const decode = vi.spyOn(SVGImageElement.prototype, 'decode').mockReturnValue(new Promise((resolve) => {
      decoded = resolve
    }))
    MapRenderCoordinator.insertBasemap(svg, 'blob:1')

    expect([...basemap(svg).children].map(element => element.tagName.toLowerCase())).toEqual(['svg', 'image'])
    decoded()
    await vi.waitFor(() => expect([...basemap(svg).children].map(element => element.getAttribute('href'))).toEqual(['blob:1']))
    decode.mockRestore()
  })

  it('shows each rectangle of a previous image in its rectangle of the view, in the order of the placements', () => {
    const svg = view()
    MapRenderCoordinator.insertBasemap(svg, 'blob:1')
    MapRenderCoordinator.insertBasemap(svg, 'blob:0', {
      view: [0, 0, 800, 400],
      placements: [
        { code: 'FR', from: [[10, 20], [110, 220]], to: [[50, 20], [150, 220]] },
        { code: 'RE', from: [[600, 0], [700, 50]], to: [[600, 0], [800, 100]] },
      ],
    })

    const nested = [...basemap(svg).children]
    expect(nested.map(element => ['viewBox', 'x', 'y', 'width', 'height', 'preserveAspectRatio'].map(name => element.getAttribute(name)))).toEqual([
      ['10 20 100 200', '50', '20', '100', '200', 'none'],
      ['600 0 100 50', '600', '0', '200', '100', 'none'],
    ])
    expect(nested.map(element => element.querySelector('image')!.getAttribute('width'))).toEqual(['800', '800'])
  })

  it('empties the basemap', () => {
    const svg = view()
    MapRenderCoordinator.insertBasemap(svg, 'blob:1')
    MapRenderCoordinator.removeBasemap(svg)

    expect(basemap(svg).children).toHaveLength(0)
  })
})
