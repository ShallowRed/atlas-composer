import type { AtlasId, TerritoryCode } from '@/types'
import { createPinia, setActivePinia } from 'pinia'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { loadAtlasFromConfigs, withSetup } from '@/__tests__/test-utils'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'
import { useTerritoryCursor } from '../useTerritoryCursor'

const GUIANA = 'FR-GF' as TerritoryCode
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

  function setup() {
    const container = document.createElement('div')
    container.setPointerCapture = () => {}
    container.hasPointerCapture = () => true
    container.releasePointerCapture = () => {}
    document.body.append(container)
    const cursor = withSetup(() => useTerritoryCursor({ container: ref(container) }))
    const svg = drawnSvg(container)
    cursor.createBorderZoneOverlays(svg, FRAMES)
    return { container, cursor, overlay: svg.querySelector('.border-zone-overlay')! }
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
