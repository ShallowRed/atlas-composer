import type { Ref } from 'vue'
import type { AxisControl } from '@/core/parameters'
import type { CompositionFrames } from '@/services/rendering/selection-overlay-service'
import type { TerritoryCode } from '@/types'
import { select } from 'd3'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectionConfig } from '@/composables/useProjectionConfig'
import { useSelectedTerritory } from '@/composables/useSelectedTerritory'
import { formatValue, parameterRegistry } from '@/core/parameters'
import { moveOffset, rectFromCorners } from '@/core/positioning'
import { SelectionOverlayService } from '@/services/rendering/selection-overlay-service'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'

interface TerritoryCursorOptions {
  // The container of the map keeps the pointer while the render replaces the svg
  container: Ref<HTMLElement | undefined>
}

export function useTerritoryCursor({ container }: TerritoryCursorOptions) {
  const parameterStore = useParameterStore()
  const geoDataStore = useGeoDataStore()
  const viewStore = useViewStore()
  const { selectedTerritory } = useSelectedTerritory()
  const { getTerritoryFamily } = useProjectionConfig()
  const { locale } = useI18n()

  const isDragging = ref(false)
  const hoveredTerritoryCode = ref<string | null>(null)
  // Position written under the selected frame while the territory moves
  const moveLabel = ref<string | null>(null)

  const isDragEnabled = computed(() => viewStore.viewMode === 'composite-custom')

  let drag: { code: TerritoryCode, pointerId: number, startX: number, startY: number, unit: number, startOffset: [number, number], controls: AxisControl[] } | null = null

  function showHover(svg: SVGSVGElement) {
    const code = hoveredTerritoryCode.value
    const frame = code && code !== selectedTerritory.value?.code && !isDragging.value
      ? SelectionOverlayService.frameOf(geoDataStore.cartographer?.customComposite, code)
      : null
    SelectionOverlayService.drawHover(svg, frame?.rect ?? null, SelectionOverlayService.canvasUnitOf(svg))
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
    hoveredTerritoryCode.value = null
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

    const borders = customComposite.getCompositionBorders()
    const svgSelection = select(svg)
    svgSelection.selectAll('.border-zone-overlays').remove()

    svgSelection.append('g')
      .attr('class', 'border-zone-overlays')
      .selectAll('rect')
      .data(borders)
      .join('rect')
      .attr('class', 'border-zone-overlay')
      .attr('data-territory', d => d.territoryCode)
      .each(function (d) {
        const { left, top, right, bottom } = rectFromCorners(d.bounds)
        select(this).attr('x', left).attr('y', top).attr('width', right - left).attr('height', bottom - top)
      })
      .style('fill', 'transparent')
      .style('cursor', 'grab')
      .on('pointerdown', (event: PointerEvent, d) => startDrag(event, d.territoryCode as TerritoryCode))
      .on('pointerenter', (_event: PointerEvent, d) => {
        hoveredTerritoryCode.value = d.territoryCode
        showHover(svg)
      })
      .on('pointerleave', () => {
        hoveredTerritoryCode.value = null
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
    moveBy,
    cleanup,
  }
}
