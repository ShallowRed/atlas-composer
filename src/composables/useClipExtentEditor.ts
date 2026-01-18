import type { TerritoryCode } from '@/types'
import { select } from 'd3'
import { computed, ref } from 'vue'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useProjectionStore } from '@/stores/projection'
import { useViewStore } from '@/stores/view'

export function useClipExtentEditor() {
  const geoDataStore = useGeoDataStore()
  const parameterStore = useParameterStore()
  const projectionStore = useProjectionStore()
  const viewStore = useViewStore()

  const selectedTerritoryCode = ref<string | null>(null)

  const isDraggingCorner = ref(false)
  const dragCornerTerritoryCode = ref<string | null>(null)
  const dragCornerIndex = ref<number | null>(null)
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const dragStartClipExtent = ref<[number, number, number, number]>([0, 0, 0, 0])
  const dragSvgElement = ref<SVGSVGElement | null>(null)

  const GRID_STEP = 5

  const isEditingEnabled = computed(() => {
    return viewStore.viewMode === 'composite-custom'
  })

  function getSVGScale(svg: SVGSVGElement): number {
    const ctm = svg.getScreenCTM()
    if (ctm) {
      return Math.sqrt(ctm.a * ctm.a + ctm.b * ctm.b)
    }
    return 1
  }

  function renderClipExtentHandles(svg: SVGSVGElement) {
    if (!isEditingEnabled.value || !selectedTerritoryCode.value) {
      select(svg).selectAll('.clip-extent-handles').remove()
      return
    }

    const svgSelection = select(svg)

    let handlesGroup = svgSelection.select<SVGGElement>('.clip-extent-handles')
    if (handlesGroup.empty()) {
      handlesGroup = svgSelection.append('g').attr('class', 'clip-extent-handles')
    }

    const selectedTerritory = geoDataStore.allActiveTerritories.find(
      t => t.code === selectedTerritoryCode.value,
    )

    const handleData: Array<{
      territoryCode: string
      cornerIndex: number
      cx: number
      cy: number
    }> = []

    const territoryCode = selectedTerritoryCode.value
    if (territoryCode && selectedTerritory) {
      const params = parameterStore.getEffectiveParameters(territoryCode as TerritoryCode)
      const translateOffset = params.translateOffset || [0, 0]
      const pixelClipExtent = params.pixelClipExtent

      if (pixelClipExtent && pixelClipExtent.length === 4) {
        const [x1, y1, x2, y2] = pixelClipExtent

        const canvasDims = projectionStore.canvasDimensions || { width: 960, height: 500 }
        const centerX = canvasDims.width / 2
        const centerY = canvasDims.height / 2
        const territoryX = centerX + translateOffset[0]
        const territoryY = centerY + translateOffset[1]

        handleData.push(
          { territoryCode, cornerIndex: 0, cx: territoryX + x1, cy: territoryY + y1 }, // top-left
          { territoryCode, cornerIndex: 1, cx: territoryX + x2, cy: territoryY + y1 }, // top-right
          { territoryCode, cornerIndex: 2, cx: territoryX + x2, cy: territoryY + y2 }, // bottom-right
          { territoryCode, cornerIndex: 3, cx: territoryX + x1, cy: territoryY + y2 }, // bottom-left
        )
      }
    }

    const handles = handlesGroup.selectAll('.clip-corner-handle')
      .data(handleData, (d: any) => `${d.territoryCode}-${d.cornerIndex}`)

    handles.exit().remove()
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

    newHandles.merge(handles as any)
      .attr('cx', (d: any) => d.cx)
      .attr('cy', (d: any) => d.cy)
      .attr('data-territory', (d: any) => d.territoryCode)
      .attr('data-corner', (d: any) => d.cornerIndex)
  }

  function startCornerDrag(event: MouseEvent, svg: SVGSVGElement, territoryCode: string, cornerIndex: number) {
    dragSvgElement.value = svg
    isDraggingCorner.value = true
    dragCornerTerritoryCode.value = territoryCode
    dragCornerIndex.value = cornerIndex

    dragStartX.value = event.clientX
    dragStartY.value = event.clientY

    const params = parameterStore.getEffectiveParameters(territoryCode as TerritoryCode)
    const pixelClipExtent = params.pixelClipExtent || [-100, -100, 100, 100]
    dragStartClipExtent.value = [...pixelClipExtent] as [number, number, number, number]

    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

    window.addEventListener('mousemove', handleCornerMouseMove)
    window.addEventListener('mouseup', stopCornerDrag)
  }

  function handleCornerMouseMove(event: MouseEvent) {
    if (!isDraggingCorner.value || !dragCornerTerritoryCode.value || dragCornerIndex.value === null || !dragSvgElement.value) {
      return
    }

    const screenDx = event.clientX - dragStartX.value
    const screenDy = event.clientY - dragStartY.value

    const scale = getSVGScale(dragSvgElement.value)

    const dx = screenDx / scale
    const dy = screenDy / scale

    const [origX1, origY1, origX2, origY2] = dragStartClipExtent.value
    let newX1 = origX1
    let newY1 = origY1
    let newX2 = origX2
    let newY2 = origY2

    const snappedDx = Math.round(dx / GRID_STEP) * GRID_STEP
    const snappedDy = Math.round(dy / GRID_STEP) * GRID_STEP

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

    const newClipExtent: [number, number, number, number] = [
      newX1,
      newY1,
      newX2,
      newY2,
    ]

    parameterStore.setTerritoryParameter(dragCornerTerritoryCode.value as TerritoryCode, 'pixelClipExtent', newClipExtent)
    if (dragSvgElement.value) {
      renderClipExtentHandles(dragSvgElement.value)
    }
  }

  function stopCornerDrag() {
    isDraggingCorner.value = false
    dragCornerTerritoryCode.value = null
    dragCornerIndex.value = null
    dragSvgElement.value = null

    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    window.removeEventListener('mousemove', handleCornerMouseMove)
    window.removeEventListener('mouseup', stopCornerDrag)
  }

  function selectTerritory(territoryCode: string | null) {
    selectedTerritoryCode.value = territoryCode
  }

  function deselectTerritory() {
    selectedTerritoryCode.value = null
  }

  function toggleTerritorySelection(territoryCode: string) {
    if (selectedTerritoryCode.value === territoryCode) {
      deselectTerritory()
    }
    else {
      selectTerritory(territoryCode)
    }
  }

  function cleanup() {
    if (isDraggingCorner.value) {
      stopCornerDrag()
    }
  }

  return {
    isEditingEnabled,
    isDraggingCorner,
    selectedTerritoryCode,

    renderClipExtentHandles,
    selectTerritory,
    deselectTerritory,
    toggleTerritorySelection,
    cleanup,
  }
}
