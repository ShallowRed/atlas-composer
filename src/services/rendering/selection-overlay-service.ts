import type { CanvasRect, CompositionBorder, EdgesBeyond, FrameHandle, HandleIndex, TerritoryShape } from '@/core/positioning'
import { select } from 'd3'
import { rectFromCorners } from '@/core/positioning'

const SELECTION_CLASS = 'map-selection'
const HOVER_CLASS = 'map-hover'

const HANDLE_CURSORS: Record<HandleIndex, string> = {
  0: 'nwse-resize',
  1: 'nesw-resize',
  2: 'nwse-resize',
  3: 'nesw-resize',
  4: 'ns-resize',
  5: 'ew-resize',
  6: 'ns-resize',
  7: 'ew-resize',
}

// Sizes in pixels of the screen
const HANDLE_SIZE = 8
const STROKE_WIDTH = 1.5
const LABEL_FONT_SIZE = 11
const LABEL_PADDING = 4
const LABEL_GAP = 6

export interface SelectionDrawing {
  visible: CanvasRect
  beyond: EdgesBeyond
  handles: FrameHandle[]
  // Size of the grabbing zone of a corner and of a side, in pixels of the screen
  cornerHitSize: number
  sideHitSize: number
  label: string
  canvas: { width: number, height: number }
  // Units of the canvas per pixel of the screen
  unit: number
  onHandlePointerDown: (event: PointerEvent, handle: HandleIndex) => void
}

export interface CompositionFrames {
  getCompositionBorders: () => CompositionBorder[]
}

export interface TerritoryFrame {
  rect: CanvasRect
  point: [number, number]
}

export class SelectionOverlayService {
  // Units of the canvas per pixel of the screen
  static canvasUnitOf(svg: SVGSVGElement): number {
    const ctm = svg.getScreenCTM()
    const scale = ctm ? Math.hypot(ctm.a, ctm.b) : 1
    return scale > 0 ? 1 / scale : 1
  }

  // The point of the canvas under a point of the screen
  static canvasPointOf(svg: SVGSVGElement, clientX: number, clientY: number): [number, number] {
    const ctm = svg.getScreenCTM()
    const point = ctm ? new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse()) : { x: clientX, y: clientY }
    return [point.x, point.y]
  }

  // The box of the shapes that an entry draws for its own territory, null when it draws none, and whether a shape holds the point of
  // the canvas. The groups of the territories have no transform: the coordinates of their paths are those of the canvas.
  static shapeOf(svg: SVGSVGElement, code: string, [x, y]: [number, number]): TerritoryShape {
    const paths = [...svg.querySelectorAll<SVGPathElement>('g.territories path[data-territory][data-entry]')]
      .filter(path => path.getAttribute('data-territory') === code && path.getAttribute('data-entry') === code && path.getAttribute('d'))
    const boxes = paths.map(path => path.getBBox())
    const rect = boxes.length > 0
      ? {
          left: Math.min(...boxes.map(box => box.x)),
          top: Math.min(...boxes.map(box => box.y)),
          right: Math.max(...boxes.map(box => box.x + box.width)),
          bottom: Math.max(...boxes.map(box => box.y + box.height)),
        }
      : null
    return { territoryCode: code, rect, holdsPoint: paths.some(path => path.isPointInFill(new DOMPoint(x, y))) }
  }

  // The frame of a territory as the map shows it, and the point of the territory that its pixelClipExtent is relative to
  static frameOf(composite: CompositionFrames | null | undefined, code: string): TerritoryFrame | null {
    const border = composite?.getCompositionBorders().find(item => item.territoryCode === code)
    return border ? { rect: rectFromCorners(border.bounds), point: border.point } : null
  }

  static clearSelection(svg: SVGSVGElement): void {
    select(svg).selectAll(`.${SELECTION_CLASS}`).remove()
  }

  // The selection goes last, above the frames of the composition
  static drawSelection(svg: SVGSVGElement, drawing: SelectionDrawing): void {
    this.clearSelection(svg)
    const { visible, beyond, unit } = drawing
    const group = select(svg).append('g').attr('class', SELECTION_CLASS)

    const sides = [
      { beyond: beyond.top, points: [visible.left, visible.top, visible.right, visible.top] },
      { beyond: beyond.right, points: [visible.right, visible.top, visible.right, visible.bottom] },
      { beyond: beyond.bottom, points: [visible.left, visible.bottom, visible.right, visible.bottom] },
      { beyond: beyond.left, points: [visible.left, visible.top, visible.left, visible.bottom] },
    ]
    for (const { beyond: isBeyond, points: [x1, y1, x2, y2] } of sides) {
      group.append('line')
        .attr('x1', x1!)
        .attr('y1', y1!)
        .attr('x2', x2!)
        .attr('y2', y2!)
        .attr('stroke', 'var(--color-primary)')
        .attr('stroke-width', STROKE_WIDTH * unit)
        // A dashed side stands for an edge beyond the canvas
        .attr('stroke-dasharray', isBeyond ? `${4 * unit} ${3 * unit}` : null)
        .attr('pointer-events', 'none')
    }

    const size = HANDLE_SIZE * unit
    const { width, height } = drawing.canvas
    for (const handle of drawing.handles) {
      const hit = (handle.index < 4 ? drawing.cornerHitSize : drawing.sideHitSize) * unit
      // A handle on the edge of the canvas comes in by half its size: the svg gives no pointer beyond its box
      const x = Math.min(width - size / 2, Math.max(size / 2, handle.x))
      const y = Math.min(height - size / 2, Math.max(size / 2, handle.y))
      const hitLeft = Math.max(0, x - hit / 2)
      const hitTop = Math.max(0, y - hit / 2)
      const node = group.append('g')
        .attr('class', 'selection-handle')
        .attr('data-handle', handle.index)
        .style('cursor', HANDLE_CURSORS[handle.index])
        .style('touch-action', 'none')
        .on('pointerdown', (event: PointerEvent) => drawing.onHandlePointerDown(event, handle.index))
      node.append('rect')
        .attr('x', hitLeft)
        .attr('y', hitTop)
        .attr('width', Math.min(width, x + hit / 2) - hitLeft)
        .attr('height', Math.min(height, y + hit / 2) - hitTop)
        .attr('fill', 'transparent')
      node.append('rect')
        .attr('x', x - size / 2)
        .attr('y', y - size / 2)
        .attr('width', size)
        .attr('height', size)
        // A filled handle stands for an edge beyond the canvas
        .attr('fill', handle.beyond ? 'var(--color-primary)' : 'var(--color-base-100)')
        .attr('stroke', 'var(--color-primary)')
        .attr('stroke-width', STROKE_WIDTH * unit)
    }

    this.drawLabel(group, drawing)
  }

  // Under the frame, above it at the bottom of the canvas, inside it when the frame fills the height
  private static drawLabel(group: ReturnType<typeof select<SVGGElement, unknown>>, { visible, label, canvas, unit }: SelectionDrawing): void {
    const fontSize = LABEL_FONT_SIZE * unit
    const padding = LABEL_PADDING * unit
    const gap = LABEL_GAP * unit
    const height = fontSize + padding * 2
    const below = visible.bottom + gap
    const above = visible.top - gap - height
    const y = below + height <= canvas.height ? below : above >= 0 ? above : visible.bottom - gap - height
    const x = (visible.left + visible.right) / 2

    const background = group.append('rect')
      .attr('y', y)
      .attr('height', height)
      .attr('rx', 3 * unit)
      .attr('fill', 'var(--color-primary)')
      .attr('pointer-events', 'none')
    const text = group.append('text')
      .attr('class', 'selection-label')
      .attr('x', x)
      .attr('y', y + padding + fontSize * 0.85)
      .attr('text-anchor', 'middle')
      .attr('font-size', fontSize)
      .attr('fill', 'var(--color-primary-content)')
      .attr('pointer-events', 'none')
      .style('font-variant-numeric', 'tabular-nums')
      .text(label)
    const width = text.node()!.getComputedTextLength() + padding * 3
    background.attr('x', x - width / 2).attr('width', width)
  }

  static drawHover(svg: SVGSVGElement, rect: CanvasRect | null, unit: number): void {
    select(svg).selectAll(`.${HOVER_CLASS}`).remove()
    if (!rect) {
      return
    }
    select(svg).append('rect').attr('class', HOVER_CLASS).attr('x', rect.left).attr('y', rect.top).attr('width', rect.right - rect.left).attr('height', rect.bottom - rect.top).attr('fill', 'none').attr('stroke', 'var(--color-primary)').attr('stroke-width', unit).attr('pointer-events', 'none')
  }
}
