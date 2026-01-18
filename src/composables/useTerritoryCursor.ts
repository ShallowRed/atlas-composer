import type { TerritoryCode } from '@/types'
import { select } from 'd3'
import { computed, ref } from 'vue'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'
import { useViewStore } from '@/stores/view'

export function useTerritoryCursor() {
  const parameterStore = useParameterStore()
  const geoDataStore = useGeoDataStore()
  const viewStore = useViewStore()

  const isDragging = ref(false)
  const dragTerritoryCode = ref<string | null>(null)
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const dragStartOffsetX = ref(0)
  const dragStartOffsetY = ref(0)
  const dragSvgElement = ref<SVGSVGElement | null>(null)

  const hoveredTerritoryCode = ref<string | null>(null)

  const GRID_STEP = 10

  const isDragEnabled = computed(() => {
    return viewStore.viewMode === 'composite-custom'
  })

  function getSVGScale(svg: SVGSVGElement): number {
    const ctm = svg.getScreenCTM()
    if (ctm) {
      return Math.sqrt(ctm.a * ctm.a + ctm.b * ctm.b)
    }
    return 1
  }

  function updateTerritoryVisualFeedback(svg: SVGSVGElement, territoryCode: string | null, isDragging: boolean = false) {
    const svgSelection = select(svg)

    svgSelection.selectAll('.temporary-composition-border').remove()

    const existingBorders = svgSelection.selectAll('.composition-border')
    const bordersExist = !existingBorders.empty()

    if (bordersExist) {
      existingBorders
        .style('stroke-width', '1.25')

      if (territoryCode) {
        svgSelection.selectAll(`.composition-border[data-territory="${territoryCode}"]`)
          .style('stroke-width', isDragging ? '2.0' : '1.5')
      }
    }
    else if (territoryCode) {
      createTemporaryBorder(svg, territoryCode, isDragging)
    }

    svgSelection.selectAll('.border-zone-overlay')
      .style('fill', 'transparent')

    if (territoryCode) {
      svgSelection.selectAll(`.border-zone-overlay[data-territory="${territoryCode}"]`)
        .style(
          'fill',
          isDragging
            ? 'rgba(59, 130, 246, 0.1)' // Blue tint when dragging
            : 'rgba(59, 130, 246, 0.05)', // Light blue tint on hover
        )
    }
  }

  function createTemporaryBorder(svg: SVGSVGElement, territoryCode: string, isDragging: boolean) {
    select(svg).selectAll('.temporary-composition-border').remove()

    const customComposite = geoDataStore.cartographer?.customComposite
    if (!customComposite)
      return

    const rect = svg.getBoundingClientRect()
    const borders = customComposite.getCompositionBorders(rect.width, rect.height)

    const border = borders.find((b: any) => b.territoryCode === territoryCode)
    if (!border)
      return

    select(svg)
      .append('rect')
      .attr('class', 'temporary-composition-border')
      .attr('data-territory', territoryCode)
      .attr('x', border.bounds[0][0])
      .attr('y', border.bounds[0][1])
      .attr('width', border.bounds[1][0] - border.bounds[0][0])
      .attr('height', border.bounds[1][1] - border.bounds[0][1])
      .attr('fill', 'none')
      .attr('stroke', 'currentColor')
      .attr('stroke-width', isDragging ? '2.0' : '1.5')
      .attr('stroke-dasharray', '8 4')
      .attr('stroke-linejoin', 'round')
      .attr('opacity', isDragging ? '1.0' : '0.8')
      .attr('pointer-events', 'none')
  }

  function isTerritoryDraggable(territoryCode: string): boolean {
    if (!isDragEnabled.value)
      return false

    const activeTerritoryCodes = new Set(geoDataStore.allActiveTerritories.map(t => t.code))
    if (!activeTerritoryCodes.has(territoryCode as TerritoryCode)) {
      return false
    }

    return true
  }

  function getTerritoryCodeFromElement(element: Element): string | null {
    const territoryAttr = element.getAttribute('data-territory')
    if (territoryAttr)
      return territoryAttr

    const boundData = (element as any).__data__
    if (boundData?.properties?.code) {
      return boundData.properties.code
    }

    return null
  }

  function getCursorStyle(territoryCode: string | null): string {
    if (!territoryCode || !isDragEnabled.value)
      return 'default'

    if (!isTerritoryDraggable(territoryCode))
      return 'default'

    if (isDragging.value && dragTerritoryCode.value === territoryCode) {
      return 'grabbing'
    }

    return 'grab'
  }

  function startDrag(event: MouseEvent, territoryCode: string) {
    if (!isTerritoryDraggable(territoryCode)) {
      return
    }

    const target = event.target as Element
    const svg = target.closest('svg') as SVGSVGElement
    if (!svg) {
      return
    }

    dragSvgElement.value = svg
    isDragging.value = true
    dragTerritoryCode.value = territoryCode

    dragStartX.value = event.clientX
    dragStartY.value = event.clientY

    const params = parameterStore.getEffectiveParameters(territoryCode as TerritoryCode)
    const currentTranslateOffset = params.translateOffset || [0, 0]
    dragStartOffsetX.value = currentTranslateOffset[0]
    dragStartOffsetY.value = currentTranslateOffset[1]

    if (target && target.hasAttribute && target.hasAttribute('title')) {
      target.setAttribute('data-original-title', target.getAttribute('title') || '')
      target.removeAttribute('title')
    }

    updateTerritoryVisualFeedback(svg, territoryCode, true)

    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopDrag)
    event.preventDefault()
    event.stopPropagation()
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isDragging.value || !dragTerritoryCode.value || !dragSvgElement.value)
      return

    const screenDx = event.clientX - dragStartX.value
    const screenDy = event.clientY - dragStartY.value

    const scale = getSVGScale(dragSvgElement.value)

    const dx = screenDx / scale
    const dy = screenDy / scale

    const snappedDx = Math.round(dx / GRID_STEP) * GRID_STEP
    const snappedDy = Math.round(dy / GRID_STEP) * GRID_STEP

    const newOffsetX = dragStartOffsetX.value + snappedDx
    const newOffsetY = dragStartOffsetY.value + snappedDy

    parameterStore.setTerritoryParameter(dragTerritoryCode.value as TerritoryCode, 'translateOffset', [newOffsetX, newOffsetY])
  }

  function stopDrag() {
    const draggedTerritory = dragTerritoryCode.value

    if (draggedTerritory) {
      select(document).selectAll(`[data-territory="${draggedTerritory}"]`).each(function () {
        const element = select(this)
        const originalTitle = element.attr('data-original-title')
        if (originalTitle) {
          element.attr('title', originalTitle)
          element.attr('data-original-title', null)
        }
      })
    }

    const svgNode = select('svg').node() as SVGSVGElement
    if (svgNode) {
      updateTerritoryVisualFeedback(svgNode, null, false)
    }

    isDragging.value = false
    dragTerritoryCode.value = null
    dragSvgElement.value = null

    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', stopDrag)
  }

  function handleTerritoryMouseDown(event: MouseEvent) {
    const target = event.target as Element
    const territoryCode = getTerritoryCodeFromElement(target)

    if (territoryCode && isTerritoryDraggable(territoryCode)) {
      startDrag(event, territoryCode)
    }
  }

  function handleTerritoryMouseEnter(event: MouseEvent) {
    const target = event.target as Element
    const territoryCode = getTerritoryCodeFromElement(target)

    if (territoryCode && isTerritoryDraggable(territoryCode)) {
      hoveredTerritoryCode.value = territoryCode

      const svg = target.closest('svg') as SVGSVGElement
      if (svg) {
        updateTerritoryVisualFeedback(svg, territoryCode, false)
      }
    }
  }

  function handleTerritoryMouseLeave() {
    if (isDragging.value)
      return

    const previousHovered = hoveredTerritoryCode.value
    hoveredTerritoryCode.value = null
    if (previousHovered) {
      const svgNode = select('svg').node() as SVGSVGElement
      if (svgNode) {
        updateTerritoryVisualFeedback(svgNode, null, false)
      }
    }
  }

  function createBorderZoneOverlays(
    svg: SVGSVGElement,
    customComposite: any,
    width: number,
    height: number,
    onTerritoryClick?: (territoryCode: string) => void,
  ) {
    if (!isDragEnabled.value || !customComposite)
      return

    customComposite.build(width, height, true)
    const allBorders = customComposite.getCompositionBorders(width, height)
    const activeTerritoryCodes = new Set(geoDataStore.allActiveTerritories.map(t => t.code))
    const borders = allBorders.filter((border: any) =>
      activeTerritoryCodes.has(border.territoryCode),
    )

    const svgSelection = select(svg)

    let borderZoneGroup = svgSelection.select<SVGGElement>('.border-zone-overlays')
    if (borderZoneGroup.empty()) {
      borderZoneGroup = svgSelection
        .append('g')
        .attr('class', 'border-zone-overlays')
        .style('pointer-events', 'auto')
    }
    else {
      borderZoneGroup.selectAll('*').remove()
    }

    borderZoneGroup
      .selectAll('.border-zone-overlay')
      .data(borders)
      .enter()
      .append('rect')
      .attr('class', 'border-zone-overlay')
      .attr('data-territory', (d: any) => d.territoryCode)
      .attr('x', (d: any) => Math.min(d.bounds[0][0], d.bounds[1][0]))
      .attr('y', (d: any) => Math.min(d.bounds[0][1], d.bounds[1][1]))
      .attr('width', (d: any) => Math.abs(d.bounds[1][0] - d.bounds[0][0]))
      .attr('height', (d: any) => Math.abs(d.bounds[1][1] - d.bounds[0][1]))
      .style('fill', 'transparent')
      .style('stroke', 'none')
      .style('pointer-events', 'auto')
      .style('cursor', (d: any) => getCursorStyle(d.territoryCode))
      .on('click', (_event, d: any) => {
        if (onTerritoryClick) {
          onTerritoryClick(d.territoryCode)
        }
      })
      .on('mousedown', (event) => {
        handleTerritoryMouseDown(event as MouseEvent)
      })
      .on('mouseenter', (event) => {
        handleTerritoryMouseEnter(event as MouseEvent)
      })
      .on('mouseleave', () => {
        handleTerritoryMouseLeave()
      })

    select(svg).selectAll('path[data-territory]').style('pointer-events', function () {
      const element = this as SVGPathElement
      const territoryCode = element.getAttribute('data-territory')
      return (territoryCode && isTerritoryDraggable(territoryCode)) ? 'none' : null
    })

    disableTooltipPointerEvents(svg)
  }

  function disableTooltipPointerEvents(svg: SVGSVGElement) {
    const svgSelection = select(svg)

    svgSelection.selectAll('[aria-label], [role="tooltip"], .plot-tooltip, .plot-tip')
      .style('pointer-events', 'none')

    svgSelection.selectAll('title')
      .style('pointer-events', 'none')

    const observer = new MutationObserver((_mutations) => {
      _mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            if (element.hasAttribute('aria-label')
              || element.getAttribute('role') === 'tooltip'
              || element.classList.contains('plot-tooltip')
              || element.classList.contains('plot-tip')) {
              ;(element as HTMLElement).style.pointerEvents = 'none'
            }
            const childTooltips = element.querySelectorAll('[aria-label], [role="tooltip"], .plot-tooltip, .plot-tip')
            childTooltips.forEach((tooltip) => {
              ;(tooltip as HTMLElement).style.pointerEvents = 'none'
            })
          }
        })
      })
    })

    observer.observe(svg, { childList: true, subtree: true })

    ;(svg as any)._tooltipObserver = observer
  }

  function cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopDrag)
    }

    const svgSelection = select('svg')
    const svgNode = svgSelection.node() as SVGSVGElement
    if (svgNode) {
      svgSelection.selectAll('.temporary-composition-border').remove()

      if ((svgNode as any)._tooltipObserver) {
        ;(svgNode as any)._tooltipObserver.disconnect()
        delete (svgNode as any)._tooltipObserver
      }
    }
  }

  return {
    isDragEnabled,
    isDragging,
    dragTerritoryCode,
    hoveredTerritoryCode,

    isTerritoryDraggable,
    getTerritoryCodeFromElement,
    getCursorStyle,
    handleTerritoryMouseDown,
    handleTerritoryMouseEnter,
    handleTerritoryMouseLeave,
    createBorderZoneOverlays,
    updateTerritoryVisualFeedback,
    disableTooltipPointerEvents,
    cleanup,
  }
}
