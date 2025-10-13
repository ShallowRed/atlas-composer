import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useTerritoryCursor } from '../useTerritoryCursor'

// Helper to test composable within Vue component context
function withSetup<T>(composable: () => T): T {
  let result: T
  const component = defineComponent({
    setup() {
      result = composable()
      return () => h('div')
    },
  })
  mount(component)
  return result!
}

describe('useTerritoryCursor', () => {
  it('should initialize with default values', () => {
    const result = withSetup(() => {
      const svgElement = ref<SVGSVGElement>()
      const onOffsetChange = vi.fn()
      const getTerritoryCode = vi.fn()
      const isDraggingEnabled = vi.fn(() => true)

      return useTerritoryCursor({
        svgElement,
        onOffsetChange,
        getTerritoryCode,
        isDraggingEnabled,
      })
    })

    expect(result.isDragging.value).toBe(false)
    expect(result.draggedTerritory.value).toBeNull()
    expect(result.currentHoveredTerritory.value).toBeNull()
  })

  it('should provide attach and detach listener functions', () => {
    const result = withSetup(() => {
      const svgElement = ref<SVGSVGElement>()
      const onOffsetChange = vi.fn()
      const getTerritoryCode = vi.fn()
      const isDraggingEnabled = vi.fn(() => true)

      return useTerritoryCursor({
        svgElement,
        onOffsetChange,
        getTerritoryCode,
        isDraggingEnabled,
      })
    })

    expect(typeof result.attachListeners).toBe('function')
    expect(typeof result.detachListeners).toBe('function')
  })

  it('should respect isDraggingEnabled flag', () => {
    const result = withSetup(() => {
      const svgElement = ref<SVGSVGElement>()
      const onOffsetChange = vi.fn()
      const getTerritoryCode = vi.fn(() => 'GF')
      const isDraggingEnabled = vi.fn(() => false)

      return useTerritoryCursor({
        svgElement,
        onOffsetChange,
        getTerritoryCode,
        isDraggingEnabled,
      })
    })

    // Even if territory code is available, dragging should not start if disabled
    expect(result.isDragging.value).toBe(false)
  })

  it('should respect isTerritoryDraggable check when provided', () => {
    const result = withSetup(() => {
      const svgElement = ref<SVGSVGElement>()
      const onOffsetChange = vi.fn()
      const getTerritoryCode = vi.fn(() => 'FR-metro')
      const isDraggingEnabled = vi.fn(() => true)
      const isTerritoryDraggable = vi.fn(() => false) // Mainland should not be draggable

      return useTerritoryCursor({
        svgElement,
        onOffsetChange,
        getTerritoryCode,
        isDraggingEnabled,
        isTerritoryDraggable,
      })
    })

    // Mainland should not be draggable
    expect(result.isDragging.value).toBe(false)
  })
})
