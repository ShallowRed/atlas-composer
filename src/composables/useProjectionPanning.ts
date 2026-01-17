import { computed, ref } from 'vue'
import { getRelevantParameters } from '@/core/projections/parameters'
import { projectionRegistry } from '@/core/projections/registry'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'

export function useProjectionPanning(projectionOverride?: string | null) {
  const parameterStore = useParameterStore()
  const projectionStore = useProjectionStore()

  const isPanning = ref(false)
  const panStartX = ref(0)
  const panStartY = ref(0)
  const panStartRotationLon = ref(0)
  const panStartRotationLat = ref(0)

  const supportsPanning = computed(() => {
    const projectionId = projectionOverride ?? projectionStore.selectedProjection
    if (!projectionId)
      return false

    const projection = projectionRegistry.get(projectionId as string)
    if (!projection)
      return false

    const relevantParams = getRelevantParameters(projection.family)
    return relevantParams.rotateLongitude
  })

  const supportsLatitudePanning = computed(() => {
    const projectionId = projectionOverride ?? projectionStore.selectedProjection
    if (!projectionId)
      return false

    const projection = projectionRegistry.get(projectionId as string)
    if (!projection)
      return false

    const relevantParams = getRelevantParameters(projection.family)
    return relevantParams.rotateLatitude && !projectionStore.rotateLatitudeLocked
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

    const lonDelta = -dx * 0.5
    const latDelta = supportsLatitudePanning.value ? dy * 0.5 : 0

    const newRotationLon = panStartRotationLon.value + lonDelta
    const newRotationLat = panStartRotationLat.value + latDelta

    let wrappedLon = newRotationLon % 360
    if (wrappedLon > 180)
      wrappedLon -= 360
    if (wrappedLon < -180)
      wrappedLon += 360

    const clampedLat = Math.max(-90, Math.min(90, newRotationLat))

    parameterStore.setGlobalParameter('focusLongitude', wrappedLon)
    if (supportsLatitudePanning.value) {
      parameterStore.setGlobalParameter('focusLatitude', clampedLat)
    }
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

    const effectiveParams = parameterStore.globalEffectiveParameters
    const currentRotationLon = effectiveParams?.focusLongitude ?? 0
    const currentRotationLat = effectiveParams?.focusLatitude ?? 0

    panStartRotationLon.value = currentRotationLon
    panStartRotationLat.value = currentRotationLat

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
