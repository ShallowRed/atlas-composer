import { select } from 'd3'
import { computed, ref } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'

/**
 * Manages territory cursor interaction for drag-to-move functionality
 * Only active in composite-custom mode for overseas territories
 */
export function useTerritoryCursor() {
  const configStore = useConfigStore()
  const parameterStore = useParameterStore()
  const geoDataStore = useGeoDataStore()

  // Drag state
  const isDragging = ref(false)
  const dragTerritoryCode = ref<string | null>(null)
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const dragStartOffsetX = ref(0)
  const dragStartOffsetY = ref(0)

  // Hover state for visual feedback
  const hoveredTerritoryCode = ref<string | null>(null)

  /**
   * Check if territory dragging is enabled
   * Only enabled in composite-custom mode
   */
  const isDragEnabled = computed(() => {
    return configStore.viewMode === 'composite-custom'
  })

  /**
   * Update visual feedback for territory hover/drag states using D3.js
   * Creates temporary borders if composition borders are disabled
   */
  function updateTerritoryVisualFeedback(svg: SVGSVGElement, territoryCode: string | null, isDragging: boolean = false) {
    const svgSelection = select(svg)

    // Always clean up temporary borders first
    svgSelection.selectAll('.temporary-composition-border').remove()

    // Check if composition borders exist (they might be disabled in settings)
    const existingBorders = svgSelection.selectAll('.composition-border')
    const bordersExist = !existingBorders.empty()

    if (bordersExist) {
      // Reset all visual feedback using D3 selections for existing borders
      existingBorders
        .style('opacity', '0.5')
        .style('stroke-width', '1.25')

      // Apply feedback for active territory
      if (territoryCode) {
        svgSelection.selectAll(`.composition-border[data-territory="${territoryCode}"]`)
          .style('opacity', isDragging ? '1.0' : '0.8')
          .style('stroke-width', isDragging ? '2.0' : '1.5')
      }
    }
    else if (territoryCode) {
      // Create temporary borders for visual feedback when borders are disabled
      createTemporaryBorder(svg, territoryCode, isDragging)
    }

    // Reset zone overlays
    svgSelection.selectAll('.border-zone-overlay')
      .style('fill', 'transparent')

    // Apply zone feedback for active territory
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

  /**
   * Create temporary border for visual feedback when composition borders are disabled
   */
  function createTemporaryBorder(svg: SVGSVGElement, territoryCode: string, isDragging: boolean) {
    // Remove any existing temporary borders
    select(svg).selectAll('.temporary-composition-border').remove()

    // Get the custom composite projection to calculate border bounds
    const customComposite = geoDataStore.cartographer?.customComposite
    if (!customComposite)
      return

    const rect = svg.getBoundingClientRect()
    const borders = customComposite.getCompositionBorders(rect.width, rect.height)

    // Find the border for this territory
    const border = borders.find((b: any) => b.territoryCode === territoryCode)
    if (!border)
      return

    // Create temporary border element
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

  /**
   * Check if a territory can be dragged
   * Prevents mainland territories from being dragged and checks if territory is in filtered list
   */
  function isTerritoryDraggable(territoryCode: string): boolean {
    if (!isDragEnabled.value)
      return false

    // Get mainland code from atlas config
    const atlasConfig = configStore.currentAtlasConfig
    const mainlandCode = atlasConfig?.geoDataConfig?.mainlandCode

    // Don't allow dragging mainland territories
    if (mainlandCode && territoryCode === mainlandCode) {
      return false
    }

    // Only allow dragging territories that are currently visible/filtered
    const filteredTerritoryCodes = new Set(geoDataStore.filteredTerritories.map(t => t.code))
    if (!filteredTerritoryCodes.has(territoryCode)) {
      return false
    }

    return true
  }

  /**
   * Extract territory code from SVG path element
   * Looks for data-territory attribute or feature properties
   */
  function getTerritoryCodeFromElement(element: Element): string | null {
    // First try data-territory attribute
    const territoryAttr = element.getAttribute('data-territory')
    if (territoryAttr)
      return territoryAttr

    // Fallback: try to find territory code in bound data
    // This would be set by Observable Plot during rendering
    const boundData = (element as any).__data__
    if (boundData?.properties?.code) {
      return boundData.properties.code
    }

    return null
  }

  /**
   * Get cursor style for territory element based on drag state
   */
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

  /**
   * Start territory drag operation
   */
  function startDrag(event: MouseEvent, territoryCode: string) {
    if (!isTerritoryDraggable(territoryCode)) {
      return
    }
    isDragging.value = true
    dragTerritoryCode.value = territoryCode
    dragStartX.value = event.clientX
    dragStartY.value = event.clientY

    // Get current territory offset from parameter store
    const params = parameterStore.getEffectiveParameters(territoryCode)
    const currentTranslateOffset = params.translateOffset || [0, 0]
    dragStartOffsetX.value = currentTranslateOffset[0]
    dragStartOffsetY.value = currentTranslateOffset[1]

    // Disable tooltips during drag by temporarily removing title attributes
    const target = event.target as Element
    if (target && target.hasAttribute && target.hasAttribute('title')) {
      target.setAttribute('data-original-title', target.getAttribute('title') || '')
      target.removeAttribute('title')
    }

    // Apply drag visual feedback
    const svg = target.closest('svg') as SVGSVGElement
    if (svg) {
      updateTerritoryVisualFeedback(svg, territoryCode, true)
    }

    // Set grabbing cursor on document body during drag
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

    // Add global mouse move and mouse up listeners
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopDrag)

    // Prevent text selection and default behavior during drag
    event.preventDefault()
    event.stopPropagation()
  }

  /**
   * Handle mouse move during drag
   */
  function handleMouseMove(event: MouseEvent) {
    if (!isDragging.value || !dragTerritoryCode.value)
      return

    const dx = event.clientX - dragStartX.value
    const dy = event.clientY - dragStartY.value

    // Pure 1:1 movement: CompositeProjection handles translateOffset directly as screen pixels
    // No scaling needed - direct cursor movement to territory movement
    const newOffsetX = dragStartOffsetX.value + dx
    const newOffsetY = dragStartOffsetY.value + dy

    // Update parameter store with new position (this will update both sliders and rendering)
    parameterStore.setTerritoryParameter(dragTerritoryCode.value, 'translateOffset', [newOffsetX, newOffsetY])
  }

  /**
   * Stop territory drag operation
   */
  function stopDrag() {
    const draggedTerritory = dragTerritoryCode.value

    // Restore title attribute if it was temporarily removed using D3.js
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

    // Clear visual feedback using D3.js
    const svgNode = select('svg').node() as SVGSVGElement
    if (svgNode) {
      updateTerritoryVisualFeedback(svgNode, null, false)
    }

    isDragging.value = false
    dragTerritoryCode.value = null

    // Restore document cursor and text selection
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    // Remove global listeners
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', stopDrag)
  }

  /**
   * Handle mouse down on territory element
   */
  function handleTerritoryMouseDown(event: MouseEvent) {
    const target = event.target as Element
    const territoryCode = getTerritoryCodeFromElement(target)

    if (territoryCode && isTerritoryDraggable(territoryCode)) {
      startDrag(event, territoryCode)
    }
  }

  /**
   * Handle mouse enter on territory element for hover feedback
   */
  function handleTerritoryMouseEnter(event: MouseEvent) {
    const target = event.target as Element
    const territoryCode = getTerritoryCodeFromElement(target)

    if (territoryCode && isTerritoryDraggable(territoryCode)) {
      hoveredTerritoryCode.value = territoryCode

      // Apply visual feedback
      const svg = target.closest('svg') as SVGSVGElement
      if (svg) {
        updateTerritoryVisualFeedback(svg, territoryCode, false)
      }
    }
  }

  /**
   * Handle mouse leave on territory element
   */
  function handleTerritoryMouseLeave() {
    if (isDragging.value)
      return // Don't clear feedback during drag

    const previousHovered = hoveredTerritoryCode.value
    hoveredTerritoryCode.value = null

    // Clear visual feedback using D3.js
    if (previousHovered) {
      const svgNode = select('svg').node() as SVGSVGElement
      if (svgNode) {
        updateTerritoryVisualFeedback(svgNode, null, false)
      }
    }
  }

  /**
   * Create invisible border zone overlays for improved drag UX using D3.js
   * These zones match the composition borders and provide larger drag areas
   */
  function createBorderZoneOverlays(svg: SVGSVGElement, customComposite: any, width: number, height: number) {
    if (!isDragEnabled.value || !customComposite)
      return

    // Build composite and get borders
    customComposite.build(width, height, true)
    const allBorders = customComposite.getCompositionBorders(width, height)

    // Filter borders to only include territories that are currently filtered/visible
    const filteredTerritorycodes = new Set(geoDataStore.filteredTerritories.map(t => t.code))
    const borders = allBorders.filter((border: any) =>
      filteredTerritorycodes.has(border.territoryCode),
    )

    const svgSelection = select(svg)

    // Create or select the border zone group using D3
    let borderZoneGroup = svgSelection.select<SVGGElement>('.border-zone-overlays')
    if (borderZoneGroup.empty()) {
      borderZoneGroup = svgSelection
        .append('g')
        .attr('class', 'border-zone-overlays')
        .style('pointer-events', 'auto')
    }
    else {
      // Clear existing overlays using D3
      borderZoneGroup.selectAll('*').remove()
    }

    // Create invisible rect overlays for each filtered border zone using D3
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
      .on('mousedown', (event) => {
        handleTerritoryMouseDown(event as MouseEvent)
      })
      .on('mouseenter', (event) => {
        handleTerritoryMouseEnter(event as MouseEvent)
      })
      .on('mouseleave', () => {
        handleTerritoryMouseLeave()
      })

    // Disable pointer events on territory paths to prevent conflicts using D3.js
    // Only disable for territories that are both draggable and in the filtered list
    select(svg).selectAll('path[data-territory]').style('pointer-events', function () {
      const element = this as SVGPathElement
      const territoryCode = element.getAttribute('data-territory')
      return (territoryCode && isTerritoryDraggable(territoryCode)) ? 'none' : null
    })

    // Disable pointer events on tooltips to prevent conflicts
    disableTooltipPointerEvents(svg)
  }

  /**
   * Disable pointer events on Observable Plot tooltips to prevent interference using D3.js
   */
  function disableTooltipPointerEvents(svg: SVGSVGElement) {
    const svgSelection = select(svg)

    // Observable Plot creates tooltips with specific classes - use D3 to disable pointer events
    svgSelection.selectAll('[aria-label], [role="tooltip"], .plot-tooltip, .plot-tip')
      .style('pointer-events', 'none')

    // Also target any title elements (native SVG tooltips) using D3
    svgSelection.selectAll('title')
      .style('pointer-events', 'none')

    // Use a MutationObserver to catch dynamically created tooltips
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            // Check if it's a tooltip element
            if (element.hasAttribute('aria-label')
              || element.getAttribute('role') === 'tooltip'
              || element.classList.contains('plot-tooltip')
              || element.classList.contains('plot-tip')) {
              ;(element as HTMLElement).style.pointerEvents = 'none'
            }
            // Also check child elements
            const childTooltips = element.querySelectorAll('[aria-label], [role="tooltip"], .plot-tooltip, .plot-tip')
            childTooltips.forEach((tooltip) => {
              ;(tooltip as HTMLElement).style.pointerEvents = 'none'
            })
          }
        })
      })
    })

    observer.observe(svg, { childList: true, subtree: true })

    // Store observer for cleanup
    ;(svg as any)._tooltipObserver = observer
  }

  /**
   * Cleanup function to remove event listeners
   */
  function cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopDrag)
    }

    // Clean up mutation observers and temporary borders using D3.js
    const svgSelection = select('svg')
    const svgNode = svgSelection.node() as SVGSVGElement
    if (svgNode) {
      // Remove temporary borders using D3
      svgSelection.selectAll('.temporary-composition-border').remove()

      // Clean up mutation observer
      if ((svgNode as any)._tooltipObserver) {
        ;(svgNode as any)._tooltipObserver.disconnect()
        delete (svgNode as any)._tooltipObserver
      }
    }
  }

  return {
    // State
    isDragEnabled,
    isDragging,
    dragTerritoryCode,
    hoveredTerritoryCode,

    // Methods
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
