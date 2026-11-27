import type { AtlasId, TerritoryCode } from '@/types'
import { createPinia, setActivePinia } from 'pinia'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { loadAtlasFromConfigs, withSetup } from '@/__tests__/test-utils'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'
import { useTerritoryCursor } from '../useTerritoryCursor'

const GUIANA = 'FR-GF' as TerritoryCode
const SAINT_MARTIN = 'FR-MF' as TerritoryCode
const SAINT_BARTHELEMY = 'FR-BL' as TerritoryCode
const FRAMES = { getCompositionBorders: () => [{ territoryCode: GUIANA, bounds: [[100, 300], [220, 460]] as [[number, number], [number, number]], point: [160, 410] as [number, number] }] }

// An svg drawn at twice its size on the screen: one pixel of the screen is half a unit of the canvas
function drawnSvg(container: HTMLElement): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.getScreenCTM = () => ({ a: 2, b: 0 }) as DOMMatrix
  container.replaceChildren(svg)
  return svg
}

function pointer(type: string, clientX: number, clientY: number, extra: PointerEventInit = {}) {
  return new PointerEvent(type, { bubbles: true, pointerId: 1, button: 0, clientX, clientY, ...extra })
}

describe('useTerritoryCursor', () => {
  beforeAll(async () => {
    await loadAtlasFromConfigs('france' as AtlasId)
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    useViewStore().viewMode = 'composite-custom'
  })

  // loadAtlasFromConfigs reads the configurations through a stubbed fetch
  afterAll(() => {
    vi.unstubAllGlobals()
  })

  function setup(frames = FRAMES) {
    const container = document.createElement('div')
    container.setPointerCapture = () => {}
    container.hasPointerCapture = () => true
    container.releasePointerCapture = () => {}
    document.body.append(container)
    const cursor = withSetup(() => useTerritoryCursor({ container: ref(container) }))
    const svg = drawnSvg(container)
    cursor.createBorderZoneOverlays(svg, frames)
    return { container, cursor, svg, overlay: svg.querySelector('.border-zone-overlay')! }
  }

  it('moves the territory by the gesture over the scale read at its start, though the render replaces the svg', () => {
    const { container, overlay } = setup()
    const parameterStore = useParameterStore()
    parameterStore.setTerritoryParameter(GUIANA, 'translateOffset', [-320, 160])

    overlay.dispatchEvent(pointer('pointerdown', 500, 400))
    // The render that follows each move draws a new svg at another scale
    drawnSvg(container).getScreenCTM = () => ({ a: 1, b: 0 }) as DOMMatrix
    window.dispatchEvent(pointer('pointermove', 560, 370))
    window.dispatchEvent(pointer('pointerup', 560, 370))

    expect(parameterStore.getEffectiveParameters(GUIANA).translateOffset).toEqual([-290, 145])
  })

  it('keeps the move on one axis with Shift', () => {
    const { overlay } = setup()
    const parameterStore = useParameterStore()
    parameterStore.setTerritoryParameter(GUIANA, 'translateOffset', [0, 0])

    overlay.dispatchEvent(pointer('pointerdown', 500, 400))
    window.dispatchEvent(pointer('pointermove', 540, 410, { shiftKey: true }))
    window.dispatchEvent(pointer('pointerup', 540, 410))

    expect(parameterStore.getEffectiveParameters(GUIANA).translateOffset).toEqual([20, 0])
  })

  it('writes the position under the frame during the move only', () => {
    const { cursor, overlay } = setup()
    useParameterStore().setTerritoryParameter(GUIANA, 'translateOffset', [0, 0])

    overlay.dispatchEvent(pointer('pointerdown', 500, 400))
    window.dispatchEvent(pointer('pointermove', 520, 400))
    expect(cursor.moveLabel.value).toBe('X 10  Y 0')
    window.dispatchEvent(pointer('pointerup', 520, 400))
    expect(cursor.moveLabel.value).toBeNull()
  })

  interface Box { x: number, y: number, width: number, height: number }

  // Saint Martin and Saint Barthélemy in one frame, each entry drawing its territory in its group, and the territory of the other
  // entry when drawnByOther gives it; a path holds the points of its box, or those of the box given as its fill
  function sharedFrame(shapes: Record<string, { box: Box, fill?: Box }>, drawnByOther: Record<string, Box> = {}) {
    const bounds: [[number, number], [number, number]] = [[0, 0], [110, 54]]
    const { cursor, svg } = setup({ getCompositionBorders: () => [SAINT_MARTIN, SAINT_BARTHELEMY].map(territoryCode => ({ territoryCode, bounds, point: [54, 21] as [number, number] })) })
    svg.getScreenCTM = () => new DOMMatrix([2, 0, 0, 2, 0, 0])
    const territoriesOf = (entry: string) => {
      const existing = svg.querySelector(`g.entry[data-entry="${entry}"] g.territories`)
      if (existing) {
        return existing
      }
      const group = svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'g'))
      group.setAttribute('class', 'entry')
      group.setAttribute('data-entry', entry)
      const territories = group.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'g'))
      territories.setAttribute('class', 'territories')
      return territories
    }
    const draw = (entry: string, code: string, box: Box, fill = box) => {
      const path = territoriesOf(entry).appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'))
      path.setAttribute('data-entry', entry)
      path.setAttribute('data-territory', code)
      path.setAttribute('d', 'M0,0')
      path.getBBox = () => box as DOMRect
      path.isPointInFill = ({ x = 0, y = 0 }: DOMPointInit = {}) => x >= fill.x && x <= fill.x + fill.width && y >= fill.y && y <= fill.y + fill.height
    }
    for (const [code, { box, fill }] of Object.entries(shapes)) {
      draw(code, code, box, fill)
    }
    for (const [code, box] of Object.entries(drawnByOther)) {
      draw(code === SAINT_MARTIN ? SAINT_BARTHELEMY : SAINT_MARTIN, code, box)
    }
    const overlays = svg.querySelectorAll('.border-zone-overlay')
    function pick(clientX: number, clientY: number) {
      const down = pointer('pointerdown', clientX, clientY)
      overlays[0]!.dispatchEvent(down)
      window.dispatchEvent(pointer('pointerup', clientX, clientY))
      return cursor.territoryUnderPointer(down)
    }
    return { overlays, pick }
  }

  it('picks, in a frame that two territories share, the territory whose shape is nearest to the pointer', () => {
    const { overlays, pick } = sharedFrame({
      [SAINT_MARTIN]: { box: { x: 40, y: 15, width: 10, height: 10 } },
      [SAINT_BARTHELEMY]: { box: { x: 70, y: 30, width: 8, height: 6 } },
    })
    const parameterStore = useParameterStore()
    parameterStore.setTerritoryParameter(SAINT_MARTIN, 'translateOffset', [-324, -119])
    parameterStore.setTerritoryParameter(SAINT_BARTHELEMY, 'translateOffset', [-324, -119])

    expect(overlays).toHaveLength(1)
    // On the screen, the shape of Saint Martin goes from (80, 30) to (100, 50), that of Saint Barthélemy from (140, 60) to (156, 72)
    expect(pick(90, 40)).toBe(SAINT_MARTIN)
    expect(pick(170, 80)).toBe(SAINT_BARTHELEMY)

    overlays[0]!.dispatchEvent(pointer('pointerdown', 150, 66))
    window.dispatchEvent(pointer('pointermove', 150, 86))
    window.dispatchEvent(pointer('pointerup', 150, 86))
    expect(parameterStore.getEffectiveParameters(SAINT_BARTHELEMY).translateOffset).toEqual([-324, -109])
    expect(parameterStore.getEffectiveParameters(SAINT_MARTIN).translateOffset).toEqual([-324, -119])
  })

  it('picks the territory whose shape is under the pointer, though the box of the other territory contains its box', () => {
    const { pick } = sharedFrame({
      // The box of Saint Martin covers the frame, its shape the left of the frame
      [SAINT_MARTIN]: { box: { x: 0, y: 0, width: 110, height: 54 }, fill: { x: 0, y: 0, width: 30, height: 54 } },
      [SAINT_BARTHELEMY]: { box: { x: 70, y: 30, width: 8, height: 6 } },
    })
    expect(pick(150, 66)).toBe(SAINT_BARTHELEMY)
    expect(pick(20, 20)).toBe(SAINT_MARTIN)
  })

  it('takes the shape of an entry from its own group, where the other entry of the frame also draws this territory', () => {
    const { pick } = sharedFrame({
      [SAINT_MARTIN]: { box: { x: 40, y: 15, width: 10, height: 10 } },
      [SAINT_BARTHELEMY]: { box: { x: 70, y: 30, width: 8, height: 6 } },
    }, {
      // Each entry draws the territory of the other at its own scale, over the territory of the entry
      [SAINT_MARTIN]: { x: 60, y: 20, width: 30, height: 30 },
      [SAINT_BARTHELEMY]: { x: 30, y: 5, width: 30, height: 30 },
    })
    expect(pick(90, 40)).toBe(SAINT_MARTIN)
    expect(pick(148, 66)).toBe(SAINT_BARTHELEMY)
  })

  it('moves the territory by the arrows within the domain of the position', () => {
    const { cursor } = setup()
    const parameterStore = useParameterStore()
    parameterStore.setTerritoryParameter(GUIANA, 'translateOffset', [-526.44, 1995])

    for (let press = 0; press < 20; press++) {
      cursor.moveBy(GUIANA, 1, 1)
    }

    expect(parameterStore.getEffectiveParameters(GUIANA).translateOffset).toEqual([-506.44, 2000])
  })
})
