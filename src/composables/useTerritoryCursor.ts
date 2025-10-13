import type { Ref } from 'vue'
import { onUnmounted, ref } from 'vue'

/**
 * Composable for handling mouse-based territory offset adjustments
 * Provides drag-to-move functionality for territories in composite view
 */
export interface TerritoryCursorConfig {
  /**
   * SVG container element
   */
  svgElement: Ref<SVGSVGElement | undefined>

  /**
   * Callback when territory offset changes
   */
  onOffsetChange: (territoryCode: string, deltaX: number, deltaY: number) => void

  /**
   * Function to get territory code from SVG path element
   */
  getTerritoryCode: (element: SVGElement) => string | null

  /**
   * Check if dragging is enabled (e.g., only in composite-custom mode)
   */
  isDraggingEnabled: () => boolean
}

export function useTerritoryCursor(config: TerritoryCursorConfig) {
  const isDragging = ref(false)
  const draggedTerritory = ref<string | null>(null)
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const currentHoveredTerritory = ref<string | null>(null)

  /**
   * Handle mouse down - start dragging
   */
  function handleMouseDown(event: MouseEvent) {
    if (!config.isDraggingEnabled()) {
      return
    }

    const target = event.target as SVGElement
    const territoryCode = config.getTerritoryCode(target)

    if (territoryCode) {
      isDragging.value = true
      draggedTerritory.value = territoryCode
      dragStartX.value = event.clientX
      dragStartY.value = event.clientY

      // Prevent text selection during drag
      event.preventDefault()

      // Add cursor style to body
      document.body.style.cursor = 'grabbing'
    }
  }

  /**
   * Handle mouse move - update territory position
   */
  function handleMouseMove(event: MouseEvent) {
    if (!config.isDraggingEnabled()) {
      // Update hover state even when not dragging
      const target = event.target as SVGElement
      const territoryCode = config.getTerritoryCode(target)
      currentHoveredTerritory.value = territoryCode
      return
    }

    if (isDragging.value && draggedTerritory.value) {
      const deltaX = event.clientX - dragStartX.value
      const deltaY = event.clientY - dragStartY.value

      // Update the drag start position for next move
      dragStartX.value = event.clientX
      dragStartY.value = event.clientY

      // Call the offset change callback
      config.onOffsetChange(draggedTerritory.value, deltaX, deltaY)
    }
    else {
      // Update hover state
      const target = event.target as SVGElement
      const territoryCode = config.getTerritoryCode(target)
      currentHoveredTerritory.value = territoryCode
    }
  }

  /**
   * Handle mouse up - stop dragging
   */
  function handleMouseUp() {
    if (isDragging.value) {
      isDragging.value = false
      draggedTerritory.value = null

      // Reset cursor
      document.body.style.cursor = ''
    }
  }

  /**
   * Attach event listeners to the SVG element
   */
  function attachListeners() {
    const svg = config.svgElement.value
    if (!svg) {
      return
    }

    svg.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    // Also listen for mouse leave to cancel drag
    svg.addEventListener('mouseleave', () => {
      currentHoveredTerritory.value = null
    })
  }

  /**
   * Detach event listeners
   */
  function detachListeners() {
    const svg = config.svgElement.value
    if (svg) {
      svg.removeEventListener('mousedown', handleMouseDown)
    }
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)

    // Reset cursor
    document.body.style.cursor = ''
  }

  // Cleanup on unmount
  onUnmounted(() => {
    detachListeners()
  })

  return {
    isDragging,
    draggedTerritory,
    currentHoveredTerritory,
    attachListeners,
    detachListeners,
  }
}
