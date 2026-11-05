import { computed, ref } from 'vue'
import { supportsPanning as familySupportsPanning, getDisplayedRotate } from '@/core/positioning'
import { projectionRegistry } from '@/core/projections/registry'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'

export function useProjectionPanning(projectionOverride?: string | null) {
  const parameterStore = useParameterStore()
  const projectionStore = useProjectionStore()

  const isPanning = ref(false)
  const panStartX = ref(0)
  const panStartY = ref(0)
  const panStartRotate = ref<[number, number, number]>([0, 0, 0])

  const supportsPanning = computed(() => {
    const projectionId = projectionOverride ?? projectionStore.selectedProjection
    if (!projectionId)
      return false

    const projection = projectionRegistry.get(projectionId as string)
    if (!projection)
      return false

    return familySupportsPanning(projection.family)
  })

  const supportsLatitudePanning = computed(() => {
    const projectionId = projectionOverride ?? projectionStore.selectedProjection
    if (!projectionId)
      return false

    const projection = projectionRegistry.get(projectionId as string)
    if (!projection)
      return false

    return familySupportsPanning(projection.family) && !projectionStore.rotateLatitudeLocked
  })

  const cursorStyle = computed(() => {
    if (!supportsPanning.value)
      return 'default'
    return isPanning.value ? 'grabbing' : 'grab'
  })

  function handleMouseMove(event: MouseEvent) {
    if (!isPanning.value)
      return

    const dx = event.clientX - panStartX.value
    const dy = event.clientY - panStartY.value

    const [startLambda, startPhi, gamma] = panStartRotate.value
    const lambda = startLambda + dx * 0.5
    const phi = supportsLatitudePanning.value ? startPhi - dy * 0.5 : startPhi

    let wrappedLambda = lambda % 360
    if (wrappedLambda > 180)
      wrappedLambda -= 360
    if (wrappedLambda < -180)
      wrappedLambda += 360

    const clampedPhi = Math.max(-90, Math.min(90, phi))

    parameterStore.setGlobalParameters({ rotate: [wrappedLambda, clampedPhi, gamma] })
  }

  function handleMouseUp() {
    isPanning.value = false

    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  function handleMouseDown(event: MouseEvent): boolean {
    if (!supportsPanning.value) {
      return false
    }

    isPanning.value = true
    panStartX.value = event.clientX
    panStartY.value = event.clientY

    panStartRotate.value = getDisplayedRotate(parameterStore.globalEffectiveParameters, 'global')

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    event.preventDefault()

    return true
  }

  function cleanup() {
    if (isPanning.value) {
      handleMouseUp()
    }
  }

  return {
    isPanning,
    supportsPanning,
    supportsLatitudePanning,
    cursorStyle,

    handleMouseDown,
    cleanup,
  }
}
