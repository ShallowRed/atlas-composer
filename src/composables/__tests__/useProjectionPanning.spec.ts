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
    it('returns supportsPanning true for projections with rotateLongitude', () => {
      const projectionStore = useProjectionStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')

      const { supportsPanning } = withSetup(() => useProjectionPanning())

      expect(supportsPanning.value).toBe(true)
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

    it('returns supportsLatitudePanning true when projection has rotateLatitude and not locked', () => {
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
    it('updates rotation via parameterStore.setGlobalParameter on mousemove', () => {
      const projectionStore = useProjectionStore()
      const parameterStore = useParameterStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      const setGlobalParameterSpy = vi.spyOn(parameterStore, 'setGlobalParameter')

      const { handleMouseDown } = withSetup(() => useProjectionPanning())

      const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(downEvent)

      const moveEvent = new MouseEvent('mousemove', { clientX: 150, clientY: 120 })
      window.dispatchEvent(moveEvent)

      expect(setGlobalParameterSpy).toHaveBeenCalledWith('focusLongitude', expect.any(Number))

      setGlobalParameterSpy.mockRestore()
    })

    it('wraps longitude to -180/180 range', () => {
      const projectionStore = useProjectionStore()
      const parameterStore = useParameterStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      parameterStore.setGlobalParameter('focusLongitude', 170)
      const setGlobalParameterSpy = vi.spyOn(parameterStore, 'setGlobalParameter')

      const { handleMouseDown } = withSetup(() => useProjectionPanning())

      const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(downEvent)

      const moveEvent = new MouseEvent('mousemove', { clientX: 50, clientY: 100 })
      window.dispatchEvent(moveEvent)

      const lonCall = setGlobalParameterSpy.mock.calls.find(call => call[0] === 'focusLongitude')
      expect(lonCall).toBeDefined()
      const longitude = lonCall![1] as number
      expect(longitude).toBeGreaterThanOrEqual(-180)
      expect(longitude).toBeLessThanOrEqual(180)

      setGlobalParameterSpy.mockRestore()
    })

    it('clamps latitude to -90/90 range', () => {
      const projectionStore = useProjectionStore()
      const parameterStore = useParameterStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      projectionStore.rotateLatitudeLocked = false
      parameterStore.setGlobalParameter('focusLatitude', 80)
      const setGlobalParameterSpy = vi.spyOn(parameterStore, 'setGlobalParameter')

      const { handleMouseDown } = withSetup(() => useProjectionPanning())

      const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(downEvent)

      const moveEvent = new MouseEvent('mousemove', { clientX: 100, clientY: 50 })
      window.dispatchEvent(moveEvent)

      const latCall = setGlobalParameterSpy.mock.calls.find(call => call[0] === 'focusLatitude')
      expect(latCall).toBeDefined()
      const latitude = latCall![1] as number
      expect(latitude).toBeGreaterThanOrEqual(-90)
      expect(latitude).toBeLessThanOrEqual(90)

      setGlobalParameterSpy.mockRestore()
    })

    it('does not update latitude when rotateLatitudeLocked is true', () => {
      const projectionStore = useProjectionStore()
      const parameterStore = useParameterStore()
      projectionStore.selectedProjection = createProjectionId('orthographic')
      projectionStore.rotateLatitudeLocked = true
      parameterStore.setGlobalParameter('focusLatitude', 10)
      const setGlobalParameterSpy = vi.spyOn(parameterStore, 'setGlobalParameter')

      const { handleMouseDown } = withSetup(() => useProjectionPanning())

      const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(downEvent)

      const moveEvent = new MouseEvent('mousemove', { clientX: 100, clientY: 150 })
      window.dispatchEvent(moveEvent)

      const latCall = setGlobalParameterSpy.mock.calls.find(call => call[0] === 'focusLatitude')
      expect(latCall).toBeUndefined()

      setGlobalParameterSpy.mockRestore()
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
