import type { Ref } from 'vue'
import type { AxisControl } from '@/core/parameters'
import type { FrameOfTerritories } from '@/core/positioning'
import type { CompositionFrames } from '@/services/rendering/selection-overlay-service'
import type { TerritoryCode } from '@/types'
import { select } from 'd3'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectionConfig } from '@/composables/useProjectionConfig'
import { useSelectedTerritory } from '@/composables/useSelectedTerritory'
import { formatValue, parameterRegistry } from '@/core/parameters'
import { framesOfTerritories, moveOffset, nearestTerritory } from '@/core/positioning'
import { SelectionOverlayService } from '@/services/rendering/selection-overlay-service'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'

interface TerritoryCursorOptions {
  // The container of the map keeps the pointer while the render replaces the svg
  container: Ref<HTMLElement | undefined>
}

export function useTerritoryCursor({ container }: TerritoryCursorOptions) {
  const parameterStore = useParameterStore()
  const viewStore = useViewStore()
  const { selectedTerritory } = useSelectedTerritory()
  const { getTerritoryFamily } = useProjectionConfig()
  const { locale } = useI18n()

  const isDragging = ref(false)
  const hoveredFrame = ref<FrameOfTerritories | null>(null)
  // Position written under the selected frame while the territory moves
  const moveLabel = ref<string | null>(null)

  const isDragEnabled = computed(() => viewStore.viewMode === 'composite-custom')

  let drag: { code: TerritoryCode, pointerId: number, startX: number, startY: number, unit: number, startOffset: [number, number], controls: AxisControl[] } | null = null

  function showHover(svg: SVGSVGElement) {
    const frame = hoveredFrame.value
    const selectedCode = selectedTerritory.value?.code
    const rect = frame && !isDragging.value && !(selectedCode && frame.territoryCodes.includes(selectedCode)) ? frame.rect : null
    SelectionOverlayService.drawHover(svg, rect, SelectionOverlayService.canvasUnitOf(svg))
  }

  // The territory of the frame under the pointer; a frame that several territories share gives it to the one whose shape is nearest
  function territoryUnderPointer(event: PointerEvent): TerritoryCode | null {
    const overlay = (event.target as Element | null)?.closest?.('.border-zone-overlay')
    const svg = overlay?.closest('svg')
    if (!overlay || !svg) {
      return null
    }
    const { territoryCodes } = select<Element, FrameOfTerritories>(overlay).datum()
    if (territoryCodes.length === 1) {
      return territoryCodes[0] as TerritoryCode
    }
    const point = SelectionOverlayService.canvasPointOf(svg, event.clientX, event.clientY)
    const shapes = territoryCodes.map(code => SelectionOverlayService.shapeOf(svg, code))
    return (nearestTerritory(point, shapes, selectedTerritory.value?.code) ?? territoryCodes[0]) as TerritoryCode
  }

  // The position of a territory whose family declares it, as the panel shows its fields
  function offsetControlsOf(code: TerritoryCode) {
    return parameterStore.getAxisControls(getTerritoryFamily(code), 'translateOffset')
  }

  function offsetOf(code: TerritoryCode): [number, number] {
    return parameterStore.getEffectiveParameters(code).translateOffset ?? parameterRegistry.getDefaultValue('translateOffset')
  }

  // The arrows of the keyboard move the selected territory by whole pixels of the canvas
  function moveBy(code: TerritoryCode, dx: number, dy: number) {
    const controls = offsetControlsOf(code)
    if (controls) {
      parameterStore.setTerritoryParameter(code, 'translateOffset', moveOffset(offsetOf(code), dx, dy, controls))
    }
  }

  function startDrag(event: PointerEvent, code: TerritoryCode) {
    const svg = (event.target as Element).closest('svg')
    const controls = offsetControlsOf(code)
    if (!isDragEnabled.value || !svg || !controls || event.button !== 0) {
      return
    }
    event.preventDefault()
    container.value?.setPointerCapture(event.pointerId)
    drag = {
      code,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      // Read once: the render replaces the svg at each move
      unit: SelectionOverlayService.canvasUnitOf(svg),
      startOffset: offsetOf(code),
      controls,
    }
    isDragging.value = true
    hoveredFrame.value = null
    SelectionOverlayService.drawHover(svg, null, 1)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDrag)
    window.addEventListener('pointercancel', stopDrag)
  }

  function handlePointerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) {
      return
    }
    // The territory moves by whole pixels of the canvas
    const dx = Math.round((event.clientX - drag.startX) * drag.unit)
    const dy = Math.round((event.clientY - drag.startY) * drag.unit)
    const [x, y] = moveOffset(drag.startOffset, dx, dy, drag.controls, event.shiftKey)
    moveLabel.value = `X ${formatValue(x, drag.controls[0]!.format, locale.value)}  Y ${formatValue(y, drag.controls[1]!.format, locale.value)}`
    parameterStore.setTerritoryParameter(drag.code, 'translateOffset', [x, y])
  }

  function stopDrag(event?: PointerEvent) {
    if (event && drag && event.pointerId !== drag.pointerId) {
      return
    }
    if (drag && container.value?.hasPointerCapture(drag.pointerId)) {
      container.value.releasePointerCapture(drag.pointerId)
    }
    drag = null
    isDragging.value = false
    moveLabel.value = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopDrag)
    window.removeEventListener('pointercancel', stopDrag)
  }

  // Transparent rectangles over the frames take the pointer for the territories
  function createBorderZoneOverlays(svg: SVGSVGElement, customComposite: CompositionFrames) {
    if (!isDragEnabled.value) {
      return
    }

    const frames = framesOfTerritories(customComposite.getCompositionBorders())
    const svgSelection = select(svg)
    svgSelection.selectAll('.border-zone-overlays').remove()

    svgSelection.append('g')
      .attr('class', 'border-zone-overlays')
      .selectAll('rect')
      .data(frames)
      .join('rect')
      .attr('class', 'border-zone-overlay')
      .attr('x', ({ rect }) => rect.left)
      .attr('y', ({ rect }) => rect.top)
      .attr('width', ({ rect }) => rect.right - rect.left)
      .attr('height', ({ rect }) => rect.bottom - rect.top)
      .style('fill', 'transparent')
      .style('cursor', 'grab')
      .on('pointerdown', (event: PointerEvent) => {
        const code = territoryUnderPointer(event)
        if (code) {
          startDrag(event, code)
        }
      })
      .on('pointerenter', (_event: PointerEvent, frame) => {
        hoveredFrame.value = frame
        showHover(svg)
      })
      .on('pointerleave', () => {
        hoveredFrame.value = null
        showHover(svg)
      })

    svgSelection.selectAll('path[data-territory]').style('pointer-events', 'none')
  }

  function cleanup() {
    stopDrag()
  }

  return {
    isDragEnabled,
    isDragging,
    moveLabel,
    createBorderZoneOverlays,
    territoryUnderPointer,
    moveBy,
    cleanup,
  }
}
