import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConfigStore } from '@/stores/config'
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
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'

      const { supportsPanning } = withSetup(() => useProjectionPanning())

      expect(supportsPanning.value).toBe(true)
    })

    it('returns supportsPanning false when no projection selected', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = ''

      const { supportsPanning } = withSetup(() => useProjectionPanning())

      expect(supportsPanning.value).toBe(false)
    })

    it('returns supportsPanning false for unknown projection', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'unknown-projection'

      const { supportsPanning } = withSetup(() => useProjectionPanning())

      expect(supportsPanning.value).toBe(false)
    })

    it('respects projection override parameter', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'mercator'

      const { supportsPanning } = withSetup(() => useProjectionPanning('orthographic'))

      expect(supportsPanning.value).toBe(true)
    })

    it('returns supportsLatitudePanning true when projection has rotateLatitude and not locked', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'
      configStore.rotateLatitudeLocked = false

      const { supportsLatitudePanning } = withSetup(() => useProjectionPanning())

      expect(supportsLatitudePanning.value).toBe(true)
    })

    it('returns supportsLatitudePanning false when rotateLatitudeLocked is true', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'
      configStore.rotateLatitudeLocked = true

      const { supportsLatitudePanning } = withSetup(() => useProjectionPanning())

      expect(supportsLatitudePanning.value).toBe(false)
    })
  })

  describe('cursor style', () => {
    it('returns "grab" when panning available and not active', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'

      const { cursorStyle } = withSetup(() => useProjectionPanning())

      expect(cursorStyle.value).toBe('grab')
    })

    it('returns "default" when panning not supported', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = ''

      const { cursorStyle } = withSetup(() => useProjectionPanning())

      expect(cursorStyle.value).toBe('default')
    })

    it('returns "grabbing" when panning active', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'

      const { cursorStyle, handleMouseDown } = withSetup(() => useProjectionPanning())

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(event)

      expect(cursorStyle.value).toBe('grabbing')
    })
  })

  describe('mouse event handling', () => {
    it('handleMouseDown starts panning and returns true when supported', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'

      const { handleMouseDown, isPanning } = withSetup(() => useProjectionPanning())

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      const result = handleMouseDown(event)

      expect(result).toBe(true)
      expect(isPanning.value).toBe(true)
    })

    it('handleMouseDown returns false when panning not supported', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = ''

      const { handleMouseDown, isPanning } = withSetup(() => useProjectionPanning())

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      const result = handleMouseDown(event)

      expect(result).toBe(false)
      expect(isPanning.value).toBe(false)
    })

    it('adds global event listeners on mousedown', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { handleMouseDown } = withSetup(() => useProjectionPanning())

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(event)

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))

      addEventListenerSpy.mockRestore()
    })

    it('removes global event listeners on mouseup', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'
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
    it('updates rotation via configStore.setCustomRotate on mousemove', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'
      const setCustomRotateSpy = vi.spyOn(configStore, 'setCustomRotate')

      const { handleMouseDown } = withSetup(() => useProjectionPanning())

      const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(downEvent)

      const moveEvent = new MouseEvent('mousemove', { clientX: 150, clientY: 120 })
      window.dispatchEvent(moveEvent)

      expect(setCustomRotateSpy).toHaveBeenCalled()

      setCustomRotateSpy.mockRestore()
    })

    it('wraps longitude to -180/180 range', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'
      configStore.setCustomRotate(170, 0)
      const setCustomRotateSpy = vi.spyOn(configStore, 'setCustomRotate')

      const { handleMouseDown } = withSetup(() => useProjectionPanning())

      const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(downEvent)

      // Move 50 pixels left (should add 25 degrees: 170 + 25 = 195, wraps to -165)
      const moveEvent = new MouseEvent('mousemove', { clientX: 50, clientY: 100 })
      window.dispatchEvent(moveEvent)

      const [longitude] = setCustomRotateSpy.mock.lastCall!
      expect(longitude).toBeGreaterThanOrEqual(-180)
      expect(longitude).toBeLessThanOrEqual(180)

      setCustomRotateSpy.mockRestore()
    })

    it('clamps latitude to -90/90 range', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'
      configStore.rotateLatitudeLocked = false
      configStore.setCustomRotate(0, 80)
      const setCustomRotateSpy = vi.spyOn(configStore, 'setCustomRotate')

      const { handleMouseDown } = withSetup(() => useProjectionPanning())

      const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(downEvent)

      // Move 50 pixels up (should add 25 degrees: 80 + 25 = 105, clamps to 90)
      const moveEvent = new MouseEvent('mousemove', { clientX: 100, clientY: 50 })
      window.dispatchEvent(moveEvent)

      const [, latitude] = setCustomRotateSpy.mock.lastCall!
      expect(latitude).toBeGreaterThanOrEqual(-90)
      expect(latitude).toBeLessThanOrEqual(90)

      setCustomRotateSpy.mockRestore()
    })

    it('does not update latitude when rotateLatitudeLocked is true', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'
      configStore.rotateLatitudeLocked = true
      configStore.setCustomRotate(0, 10)
      const setCustomRotateSpy = vi.spyOn(configStore, 'setCustomRotate')

      const { handleMouseDown } = withSetup(() => useProjectionPanning())

      const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(downEvent)

      // Move vertically - should not change latitude
      const moveEvent = new MouseEvent('mousemove', { clientX: 100, clientY: 150 })
      window.dispatchEvent(moveEvent)

      const [, latitude] = setCustomRotateSpy.mock.lastCall!
      expect(latitude).toBe(10) // Unchanged

      setCustomRotateSpy.mockRestore()
    })
  })

  describe('cleanup', () => {
    it('removes event listeners on cleanup', () => {
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'
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
      const configStore = useConfigStore()
      configStore.selectedProjection = 'orthographic'

      const { handleMouseDown, cleanup, isPanning } = withSetup(() => useProjectionPanning())

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      handleMouseDown(event)
      expect(isPanning.value).toBe(true)

      cleanup()
      expect(isPanning.value).toBe(false)
    })
  })
})
