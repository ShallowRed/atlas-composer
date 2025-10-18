import { computed, ref } from 'vue'
import { getRelevantParameters } from '@/core/projections/parameters'
import { projectionRegistry } from '@/core/projections/registry'
import { useConfigStore } from '@/stores/config'

/**
 * Manages interactive projection panning via mouse drag
 * Supports 2-axis rotation for projections with rotateLongitude parameter
 * Respects rotateLatitudeLocked state for latitude panning control
 */
export function useProjectionPanning(projectionOverride?: string) {
  const configStore = useConfigStore()

  // Pan state
  const isPanning = ref(false)
  const panStartX = ref(0)
  const panStartY = ref(0)
  const panStartRotationLon = ref(0)
  const panStartRotationLat = ref(0)

  /**
   * Check if current projection supports panning (rotateLongitude parameter)
   */
  const supportsPanning = computed(() => {
    const projectionId = projectionOverride ?? configStore.selectedProjection
    if (!projectionId)
      return false

    const projection = projectionRegistry.get(projectionId as string)
    if (!projection)
      return false

    const relevantParams = getRelevantParameters(projection.family)
    return relevantParams.rotateLongitude
  })

  /**
   * Check if current projection supports latitude panning
   * Requires rotateLatitude parameter and rotateLatitudeLocked must be false
   */
  const supportsLatitudePanning = computed(() => {
    const projectionId = projectionOverride ?? configStore.selectedProjection
    if (!projectionId)
      return false

    const projection = projectionRegistry.get(projectionId as string)
    if (!projection)
      return false

    const relevantParams = getRelevantParameters(projection.family)
    return relevantParams.rotateLatitude && !configStore.rotateLatitudeLocked
  })

  /**
   * Get cursor style for panning interaction
   */
  const cursorStyle = computed(() => {
    if (!supportsPanning.value)
      return 'default'
    return isPanning.value ? 'grabbing' : 'grab'
  })

  /**
   * Handle mouse move during panning
   */
  function handleMouseMove(event: MouseEvent) {
    if (!isPanning.value)
      return

    const dx = event.clientX - panStartX.value
    const dy = event.clientY - panStartY.value

    // Convert pixel movement to rotation degrees
    // X-axis: Positive dx means dragging right, map follows right (decrease longitude)
    // Y-axis: Negative dy means dragging up, which should rotate map down (decrease latitude)
    // Scale factor: ~0.5 degrees per pixel for smooth interaction
    const lonDelta = dx * 0.5
    const latDelta = supportsLatitudePanning.value ? -dy * 0.5 : 0

    const newRotationLon = panStartRotationLon.value + lonDelta
    const newRotationLat = panStartRotationLat.value + latDelta

    // Wrap longitude rotation to -180 to 180 range
    let wrappedLon = newRotationLon % 360
    if (wrappedLon > 180)
      wrappedLon -= 360
    if (wrappedLon < -180)
      wrappedLon += 360

    // Clamp latitude rotation to -90 to 90 range (avoid flipping over poles)
    const clampedLat = Math.max(-90, Math.min(90, newRotationLat))

    // Update both rotation axes through the config store
    configStore.setCustomRotate(wrappedLon, clampedLat)
  }

  /**
   * Stop panning and remove global event listeners
   */
  function handleMouseUp() {
    isPanning.value = false

    // Remove global listeners
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  /**
   * Handle mouse down event to start panning
   * @returns true if panning started, false otherwise
   */
  function handleMouseDown(event: MouseEvent): boolean {
    if (!supportsPanning.value) {
      return false
    }

    isPanning.value = true
    panStartX.value = event.clientX
    panStartY.value = event.clientY

    // Get current rotation values
    const currentRotationLon = configStore.customRotateLongitude
      ?? configStore.effectiveProjectionParams?.rotate?.[0]
      ?? 0
    const currentRotationLat = configStore.customRotateLatitude
      ?? configStore.effectiveProjectionParams?.rotate?.[1]
      ?? 0

    panStartRotationLon.value = currentRotationLon
    panStartRotationLat.value = currentRotationLat

    // Add global mouse move and mouse up listeners
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    // Prevent text selection during drag
    event.preventDefault()

    return true
  }

  /**
   * Cleanup function to remove event listeners
   */
  function cleanup() {
    if (isPanning.value) {
      handleMouseUp()
    }
  }

  return {
    // State
    isPanning,
    supportsPanning,
    supportsLatitudePanning,
    cursorStyle,

    // Methods
    handleMouseDown,
    cleanup,
  }
}
