import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { createProjectionId } from '@/types/branded'
import { useProjectionPanning } from '../useProjectionPanning'

function withSetup<T>(composable: () => T): T {
  let result: T
  const app = {
    setup() {
      result = composable()
      return () => {}
    },
  }
  app.setup()
  return result!
}

describe('useProjectionPanning', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('panning capability detection', () => {
    it('returns supportsPanning true for a family with panning', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')

      const { supportsPanning } = withSetup(() => useProjectionPanning())

      expect(supportsPanning.value).toBe(true)
    })

    it('returns supportsPanning false for a conic projection', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('conic-conformal')

      const { supportsPanning, supportsLatitudePanning } = withSetup(() => useProjectionPanning())

      expect(supportsPanning.value).toBe(false)
      expect(supportsLatitudePanning.value).toBe(false)
    })

    it('returns supportsPanning false when no projection selected', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('')

      const { supportsPanning } = withSetup(() => useProjectionPanning())

      expect(supportsPanning.value).toBe(false)
    })

    it('returns supportsPanning false for unknown projection', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('unknown-projection')

      const { supportsPanning } = withSetup(() => useProjectionPanning())

      expect(supportsPanning.value).toBe(false)
    })

    it('respects projection override parameter', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('mercator')

      const { supportsPanning } = withSetup(() => useProjectionPanning('orthographic'))

      expect(supportsPanning.value).toBe(true)
    })

    it('returns supportsLatitudePanning true for a family with panning when not locked', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      projectionStore.rotateLatitudeLocked = false

      const { supportsLatitudePanning } = withSetup(() => useProjectionPanning())

      expect(supportsLatitudePanning.value).toBe(true)
    })

    it('returns supportsLatitudePanning false when rotateLatitudeLocked is true', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      projectionStore.rotateLatitudeLocked = true

      const { supportsLatitudePanning } = withSetup(() => useProjectionPanning())

      expect(supportsLatitudePanning.value).toBe(false)
    })
  })

  describe('cursor style', () => {
    it('returns "grab" when panning available and not active', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')

      const { cursorStyle } = withSetup(() => useProjectionPanning())

      expect(cursorStyle.value).toBe('grab')
    })

    it('returns "default" when panning not supported', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('')

      const { cursorStyle } = withSetup(() => useProjectionPanning())

      expect(cursorStyle.value).toBe('default')
    })

    it('returns "grabbing" when panning active', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')

      const { cursorStyle, handleMouseDown } = withSetup(() => useProjectionPanning())

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(event)

      expect(cursorStyle.value).toBe('grabbing')
    })
  })

  describe('mouse event handling', () => {
    it('handleMouseDown starts panning and returns true when supported', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')

      const { handleMouseDown, isPanning } = withSetup(() => useProjectionPanning())

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      const result = handleMouseDown(event)

      expect(result).toBe(true)
      expect(isPanning.value).toBe(true)
    })

    it('handleMouseDown returns false when panning not supported', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('')

      const { handleMouseDown, isPanning } = withSetup(() => useProjectionPanning())

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      const result = handleMouseDown(event)

      expect(result).toBe(false)
      expect(isPanning.value).toBe(false)
    })

    it('adds global event listeners on mousedown', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { handleMouseDown } = withSetup(() => useProjectionPanning())

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(event)

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))

      addEventListenerSpy.mockRestore()
    })

    it('removes global event listeners on mouseup', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { handleMouseDown, isPanning } = withSetup(() => useProjectionPanning())

      const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(downEvent)

      const upEvent = new MouseEvent('mouseup')
      window.dispatchEvent(upEvent)

      expect(isPanning.value).toBe(false)
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('rotation calculations', () => {
    function pan(from: [number, number], to: [number, number]) {
      const parameterStore = useParameterStore()
      const setGlobalParametersSpy = vi.spyOn(parameterStore, 'setGlobalParameters')

      const { handleMouseDown } = withSetup(() => useProjectionPanning())
      handleMouseDown(new MouseEvent('mousedown', { clientX: from[0], clientY: from[1] }))
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: to[0], clientY: to[1] }))
      window.dispatchEvent(new MouseEvent('mouseup'))

      const rotate = setGlobalParametersSpy.mock.calls.at(-1)?.[0].rotate
      setGlobalParametersSpy.mockRestore()
      return rotate
    }

    it('writes the d3 rotation at the global level on mousemove', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      projectionStore.rotateLatitudeLocked = false
      useParameterStore().setGlobalParameters({ rotate: [10, 20, 5] })

      expect(pan([100, 100], [150, 120])).toEqual([35, 10, 5])
    })

    it('starts from the rotation to the center of the global level', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      projectionStore.rotateLatitudeLocked = false
      const parameterStore = useParameterStore()
      parameterStore.setGlobalParameters({ center: [-62.83, 17.9] })

      const rotate = pan([100, 100], [110, 100])!
      expect(rotate[0]).toBeCloseTo(67.83, 9)
      expect(rotate[1]).toBeCloseTo(-17.9, 9)
      expect(rotate[2]).toBeCloseTo(0, 9)
      expect(parameterStore.globalEffectiveParameters.center).toBeUndefined()
    })

    it('wraps longitude to -180/180 range', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      useParameterStore().setGlobalParameters({ rotate: [170, 0, 0] })

      expect(pan([100, 100], [150, 100])![0]).toBe(-165)
    })

    it('clamps latitude to -90/90 range', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      projectionStore.rotateLatitudeLocked = false
      useParameterStore().setGlobalParameters({ rotate: [0, -80, 0] })

      expect(pan([100, 100], [100, 150])![1]).toBe(-90)
    })

    it('keeps the latitude when rotateLatitudeLocked is true', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      projectionStore.rotateLatitudeLocked = true
      useParameterStore().setGlobalParameters({ rotate: [0, -10, 0] })

      expect(pan([100, 100], [100, 150])![1]).toBe(-10)
    })
  })

  describe('cleanup', () => {
    it('removes event listeners on cleanup', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { handleMouseDown, cleanup } = withSetup(() => useProjectionPanning())

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(event)

      cleanup()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))

      removeEventListenerSpy.mockRestore()
    })

    it('resets panning state on cleanup', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')

      const { handleMouseDown, cleanup, isPanning } = withSetup(() => useProjectionPanning())

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(event)
      expect(isPanning.value).toBe(true)

      cleanup()
      expect(isPanning.value).toBe(false)
    })
  })
})
