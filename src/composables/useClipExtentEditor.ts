import type { Ref } from 'vue'
import type { AxisControl } from '@/core/parameters'
import type { FrameExtent, HandleIndex } from '@/core/positioning'
import type { TerritoryCode } from '@/types'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectionConfig } from '@/composables/useProjectionConfig'
import { useSelectedTerritory } from '@/composables/useSelectedTerritory'
import { formatValue } from '@/core/parameters'
import { cornerHitSize, edgesBeyond, frameFromRect, frameHandles, resizeFrame, visiblePart } from '@/core/positioning'
import { SelectionOverlayService } from '@/services/rendering/selection-overlay-service'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'

interface ClipExtentEditorOptions {
  // The container of the map keeps the pointer while the render replaces the svg
  container: Ref<HTMLElement | undefined>
  // Size of the canvas that the composite is built on
  size: Ref<{ width: number, height: number }>
  // Position written while the territory moves, in place of the size of its frame
  moveLabel: Ref<string | null>
}

// Grabbing zones in pixels of the screen, larger for a finger
const MOUSE_HIT_SIZE = 14
const FINGER_HIT_SIZE = 32

export function useClipExtentEditor({ container, size, moveLabel }: ClipExtentEditorOptions) {
  const geoDataStore = useGeoDataStore()
  const parameterStore = useParameterStore()
  const viewStore = useViewStore()
  const { selectedTerritory } = useSelectedTerritory()
  const { getTerritoryFamily } = useProjectionConfig()
  const { locale } = useI18n()

  const isDraggingCorner = ref(false)

  const isEditingEnabled = computed(() => viewStore.viewMode === 'composite-custom')

  let drag: { code: TerritoryCode, handle: HandleIndex, pointerId: number, startX: number, startY: number, unit: number, start: FrameExtent, controls: AxisControl[] } | null = null

  function frameOf(code: string) {
    return SelectionOverlayService.frameOf(geoDataStore.cartographer?.customComposite, code)
  }

  // The frame of a territory whose family declares it, as the panel shows its fields
  function frameControlsOf(code: TerritoryCode) {
    return parameterStore.getAxisControls(getTerritoryFamily(code), 'pixelClipExtent')
  }

  function renderSelection(svg: SVGSVGElement) {
    const code = selectedTerritory.value?.code as TerritoryCode | undefined
    const controls = isEditingEnabled.value && code ? frameControlsOf(code) : undefined
    const rect = controls && code ? frameOf(code)?.rect : null
    const visible = rect && visiblePart(rect, size.value)
    if (!code || !controls || !rect || !visible) {
      SelectionOverlayService.clearSelection(svg)
      return
    }

    const unit = SelectionOverlayService.canvasUnitOf(svg)
    const hitSize = (window.matchMedia?.('(pointer: coarse)').matches ? FINGER_HIT_SIZE : MOUSE_HIT_SIZE) * unit
    const beyond = edgesBeyond(rect, size.value)
    const { format } = controls[0]!
    const label = moveLabel.value
      ?? `${formatValue(rect.right - rect.left, format, locale.value)} × ${formatValue(rect.bottom - rect.top, format, locale.value)}`

    SelectionOverlayService.drawSelection(svg, {
      visible,
      beyond,
      handles: frameHandles(visible, beyond, hitSize),
      cornerHitSize: cornerHitSize(visible, hitSize) / unit,
      sideHitSize: hitSize / unit,
      label,
      canvas: size.value,
      unit,
      onHandlePointerDown: (event, handle) => startCornerDrag(event, svg, code, controls, handle),
    })
  }

  // A territory without its own frame starts from the rectangle that the map shows
  function startFrameOf(code: TerritoryCode): FrameExtent | null {
    const parameters = parameterStore.getEffectiveParameters(code)
    if (parameters.pixelClipExtent) {
      return parameters.pixelClipExtent
    }
    const frame = frameOf(code)
    return frame && frameFromRect(frame.rect, frame.point)
  }

  function startCornerDrag(event: PointerEvent, svg: SVGSVGElement, code: TerritoryCode, controls: AxisControl[], handle: HandleIndex) {
    const start = startFrameOf(code)
    if (!start || event.button !== 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    container.value?.setPointerCapture(event.pointerId)
    drag = { code, handle, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, unit: SelectionOverlayService.canvasUnitOf(svg), start, controls }
    isDraggingCorner.value = true
    window.addEventListener('pointermove', handleCornerMove)
    window.addEventListener('pointerup', stopCornerDrag)
    window.addEventListener('pointercancel', stopCornerDrag)
  }

  function handleCornerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) {
      return
    }
    // A handle applies the move to the real edge, even when the edge lies beyond the canvas
    const dx = Math.round((event.clientX - drag.startX) * drag.unit)
    const dy = Math.round((event.clientY - drag.startY) * drag.unit)
    parameterStore.setTerritoryParameter(drag.code, 'pixelClipExtent', resizeFrame(drag.start, drag.handle, dx, dy, drag.controls, event.altKey))
  }

  function stopCornerDrag(event?: PointerEvent) {
    if (event && drag && event.pointerId !== drag.pointerId) {
      return
    }
    if (drag && container.value?.hasPointerCapture(drag.pointerId)) {
      container.value.releasePointerCapture(drag.pointerId)
    }
    drag = null
    isDraggingCorner.value = false
    window.removeEventListener('pointermove', handleCornerMove)
    window.removeEventListener('pointerup', stopCornerDrag)
    window.removeEventListener('pointercancel', stopCornerDrag)
  }

  function cleanup() {
    stopCornerDrag()
  }

  return {
    isDraggingCorner,
    renderSelection,
    cleanup,
  }
}
