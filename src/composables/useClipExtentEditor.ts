import type { TerritoryCode } from '@/types'
import { select } from 'd3'
import { computed, ref } from 'vue'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

/**
 * Manages interactive editing of pixelClipExtent via corner dragging
 * Renders visual handles at clip extent corners in composite-custom mode
 */
export function useClipExtentEditor() {
  const geoDataStore = useGeoDataStore()
  const parameterStore = useParameterStore()
  const projectionStore = useProjectionStore()
  const viewStore = useViewStore()

  // Selection state - which territory is currently selected for editing
  const selectedTerritoryCode = ref<string | null>(null)

  // Drag state for clip extent corners
  const isDraggingCorner = ref(false)
  const dragCornerTerritoryCode = ref<string | null>(null)
  const dragCornerIndex = ref<number | null>(null) // 0=topLeft, 1=topRight, 2=bottomRight, 3=bottomLeft
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const dragStartClipExtent = ref<[number, number, number, number]>([0, 0, 0, 0])
  const dragSvgElement = ref<SVGSVGElement | null>(null)

  // Grid step size for snapping (in pixels)
  const GRID_STEP = 5

  /**
   * Check if clip extent editing is enabled
   * Only enabled in composite-custom mode
   */
  const isEditingEnabled = computed(() => {
    return viewStore.viewMode === 'composite-custom'
  })

  /**
   * Get the scale factor between screen pixels and SVG canvas pixels
   */
  function getSVGScale(svg: SVGSVGElement): number {
    const ctm = svg.getScreenCTM()
    if (ctm) {
      return Math.sqrt(ctm.a * ctm.a + ctm.b * ctm.b)
    }
    return 1
  }

  /**
   * Render clip extent corner handles for the selected territory only
   * Creates draggable corner handles overlaid on the map
   */
  function renderClipExtentHandles(svg: SVGSVGElement) {
    if (!isEditingEnabled.value || !selectedTerritoryCode.value) {
      // Remove any existing handles if editing is disabled or no territory selected
      select(svg).selectAll('.clip-extent-handles').remove()
      return
    }

    const svgSelection = select(svg)

    // Get or create a group for all clip extent handles
    let handlesGroup = svgSelection.select<SVGGElement>('.clip-extent-handles')
    if (handlesGroup.empty()) {
      handlesGroup = svgSelection.append('g').attr('class', 'clip-extent-handles')
    }

    // Get the selected territory from all active territories (includes mainland and overseas)
    const selectedTerritory = geoDataStore.allActiveTerritories.find(
      t => t.code === selectedTerritoryCode.value,
    )

    // Create handle data for each territory
    const handleData: Array<{
      territoryCode: string
      cornerIndex: number
      cx: number
      cy: number
    }> = []

    // Process the selected territory if found
    const territoryCode = selectedTerritoryCode.value
    if (territoryCode && selectedTerritory) {
      // Convert: selectedTerritoryCode might be string from various sources
      const params = parameterStore.getEffectiveParameters(territoryCode as TerritoryCode)
      const translateOffset = params.translateOffset || [0, 0]
      const pixelClipExtent = params.pixelClipExtent

      if (pixelClipExtent && pixelClipExtent.length === 4) {
        const [x1, y1, x2, y2] = pixelClipExtent

        // Calculate center position of territory
        const canvasDims = projectionStore.canvasDimensions || { width: 960, height: 500 }
        const centerX = canvasDims.width / 2
        const centerY = canvasDims.height / 2
        const territoryX = centerX + translateOffset[0]
        const territoryY = centerY + translateOffset[1]

        // Four corners: topLeft, topRight, bottomRight, bottomLeft
        handleData.push(
          { territoryCode, cornerIndex: 0, cx: territoryX + x1, cy: territoryY + y1 }, // top-left
          { territoryCode, cornerIndex: 1, cx: territoryX + x2, cy: territoryY + y1 }, // top-right
          { territoryCode, cornerIndex: 2, cx: territoryX + x2, cy: territoryY + y2 }, // bottom-right
          { territoryCode, cornerIndex: 3, cx: territoryX + x1, cy: territoryY + y2 }, // bottom-left
        )
      }
    }

    // Bind data to corner handles
    const handles = handlesGroup.selectAll('.clip-corner-handle')
      .data(handleData, (d: any) => `${d.territoryCode}-${d.cornerIndex}`)

    // Remove old handles
    handles.exit().remove()

    // Add new handles
    const newHandles = handles.enter()
      .append('circle')
      .attr('class', 'clip-corner-handle')
      .attr('r', 6)
      .style('fill', '#3b82f6')
      .style('stroke', '#1e40af')
      .style('stroke-width', '2')
      .style('cursor', 'pointer')
      .style('opacity', '0.7')
      .on('mouseenter', function () {
        select(this).style('opacity', '1').attr('r', 8)
      })
      .on('mouseleave', function () {
        select(this).style('opacity', '0.7').attr('r', 6)
      })
      .on('mousedown', (event: MouseEvent, d: any) => {
        event.preventDefault()
        event.stopPropagation()
        startCornerDrag(event, svg, d.territoryCode, d.cornerIndex)
      })

    // Update all handles (new + existing)
    newHandles.merge(handles as any)
      .attr('cx', (d: any) => d.cx)
      .attr('cy', (d: any) => d.cy)
      .attr('data-territory', (d: any) => d.territoryCode)
      .attr('data-corner', (d: any) => d.cornerIndex)
  }

  /**
   * Start dragging a clip extent corner
   */
  function startCornerDrag(event: MouseEvent, svg: SVGSVGElement, territoryCode: string, cornerIndex: number) {
    dragSvgElement.value = svg
    isDraggingCorner.value = true
    dragCornerTerritoryCode.value = territoryCode
    dragCornerIndex.value = cornerIndex

    // Store screen coordinates
    dragStartX.value = event.clientX
    dragStartY.value = event.clientY

    // Get current clip extent
    // Convert: territoryCode from parameter is string
    const params = parameterStore.getEffectiveParameters(territoryCode as TerritoryCode)
    const pixelClipExtent = params.pixelClipExtent || [-100, -100, 100, 100]
    dragStartClipExtent.value = [...pixelClipExtent] as [number, number, number, number]

    // Set cursor and prevent selection
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

    // Add global listeners
    window.addEventListener('mousemove', handleCornerMouseMove)
    window.addEventListener('mouseup', stopCornerDrag)
  }

  /**
   * Handle mouse move during corner drag
   */
  function handleCornerMouseMove(event: MouseEvent) {
    if (!isDraggingCorner.value || !dragCornerTerritoryCode.value || dragCornerIndex.value === null || !dragSvgElement.value) {
      return
    }

    // Calculate screen pixel delta
    const screenDx = event.clientX - dragStartX.value
    const screenDy = event.clientY - dragStartY.value

    // Get the scale factor
    const scale = getSVGScale(dragSvgElement.value)

    // Convert to canvas pixels
    const dx = screenDx / scale
    const dy = screenDy / scale

    // Get original clip extent values
    const [origX1, origY1, origX2, origY2] = dragStartClipExtent.value
    let newX1 = origX1
    let newY1 = origY1
    let newX2 = origX2
    let newY2 = origY2

    // Snap to grid step
    const snappedDx = Math.round(dx / GRID_STEP) * GRID_STEP
    const snappedDy = Math.round(dy / GRID_STEP) * GRID_STEP

    // Update the appropriate corner
    // Corner indices: 0=topLeft, 1=topRight, 2=bottomRight, 3=bottomLeft
    switch (dragCornerIndex.value) {
      case 0: // top-left: adjust x1, y1
        newX1 = origX1 + snappedDx
        newY1 = origY1 + snappedDy
        break
      case 1: // top-right: adjust x2, y1
        newX2 = origX2 + snappedDx
        newY1 = origY1 + snappedDy
        break
      case 2: // bottom-right: adjust x2, y2
        newX2 = origX2 + snappedDx
        newY2 = origY2 + snappedDy
        break
      case 3: // bottom-left: adjust x1, y2
        newX1 = origX1 + snappedDx
        newY2 = origY2 + snappedDy
        break
    }

    // Update parameter store
    const newClipExtent: [number, number, number, number] = [
      newX1,
      newY1,
      newX2,
      newY2,
    ]

    // Convert: dragCornerTerritoryCode is string ref
    parameterStore.setTerritoryParameter(dragCornerTerritoryCode.value as TerritoryCode, 'pixelClipExtent', newClipExtent)

    // Update visual handles
    if (dragSvgElement.value) {
      renderClipExtentHandles(dragSvgElement.value)
    }
  }

  /**
   * Stop corner drag
   */
  function stopCornerDrag() {
    isDraggingCorner.value = false
    dragCornerTerritoryCode.value = null
    dragCornerIndex.value = null
    dragSvgElement.value = null

    // Restore cursor and selection
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    // Remove global listeners
    window.removeEventListener('mousemove', handleCornerMouseMove)
    window.removeEventListener('mouseup', stopCornerDrag)
  }

  /**
   * Select a territory for clip extent editing
   * This will show the corner handles for the selected territory
   */
  function selectTerritory(territoryCode: string | null) {
    selectedTerritoryCode.value = territoryCode
  }

  /**
   * Deselect the current territory
   */
  function deselectTerritory() {
    selectedTerritoryCode.value = null
  }

  /**
   * Toggle territory selection
   */
  function toggleTerritorySelection(territoryCode: string) {
    if (selectedTerritoryCode.value === territoryCode) {
      deselectTerritory()
    }
    else {
      selectTerritory(territoryCode)
    }
  }

  /**
   * Clean up event listeners
   */
  function cleanup() {
    if (isDraggingCorner.value) {
      stopCornerDrag()
    }
  }

  return {
    // State
    isEditingEnabled,
    isDraggingCorner,
    selectedTerritoryCode,

    // Methods
    renderClipExtentHandles,
    selectTerritory,
    deselectTerritory,
    toggleTerritorySelection,
    cleanup,
  }
}
