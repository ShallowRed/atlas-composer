import type { AxisControl } from '@/core/parameters/parameter-registry'
import { toDomain } from '@/core/parameters/parameter-input'

// Geometry of the selected frame on the canvas, in units of the canvas

export interface CanvasRect {
  left: number
  top: number
  right: number
  bottom: number
}

export interface CanvasSize {
  width: number
  height: number
}

// The frame of a territory as the map shows it, and the point of its territory on the canvas
export interface CompositionBorder {
  territoryCode: string
  bounds: [[number, number], [number, number]]
  point: [number, number]
}

// A frame of the composition and its territories: several territories share a frame when their frames have one rectangle
export interface FrameOfTerritories {
  rect: CanvasRect
  territoryCodes: string[]
}

// The shape of a territory as the map draws it, null when the map draws nothing of it
export interface TerritoryShape {
  territoryCode: string
  rect: CanvasRect | null
}

// Edges of the frame relative to the point of its territory, as pixelClipExtent holds them
export type FrameExtent = [left: number, top: number, right: number, bottom: number]

export interface EdgesBeyond {
  left: boolean
  top: boolean
  right: boolean
  bottom: boolean
}

// Corners first, clockwise from the top left, then the middles of the top, right, bottom and left sides
export type HandleIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface FrameHandle {
  index: HandleIndex
  x: number
  y: number
  beyond: boolean
}

export function rectFromCorners([[x0, y0], [x1, y1]]: [[number, number], [number, number]]): CanvasRect {
  return { left: Math.min(x0, x1), top: Math.min(y0, y1), right: Math.max(x0, x1), bottom: Math.max(y0, y1) }
}

// The frames in the order of the composition, each with its territories in that order
export function framesOfTerritories(borders: readonly CompositionBorder[]): FrameOfTerritories[] {
  const frames: FrameOfTerritories[] = []
  for (const border of borders) {
    const rect = rectFromCorners(border.bounds)
    const shared = frames.find(frame => frame.rect.left === rect.left && frame.rect.top === rect.top && frame.rect.right === rect.right && frame.rect.bottom === rect.bottom)
    if (shared) {
      shared.territoryCodes.push(border.territoryCode)
    }
    else {
      frames.push({ rect, territoryCodes: [border.territoryCode] })
    }
  }
  return frames
}

// The territory whose shape is nearest to the point, at a distance of zero inside the box of the shape.
// At an equal distance, the selected territory comes first, then the first in the order of the shapes.
export function nearestTerritory([x, y]: [number, number], shapes: readonly TerritoryShape[], selectedCode?: string | null): string | undefined {
  const distanceOf = ({ rect }: TerritoryShape) => rect
    ? Math.hypot(Math.max(rect.left - x, 0, x - rect.right), Math.max(rect.top - y, 0, y - rect.bottom))
    : Number.POSITIVE_INFINITY
  let nearest = shapes[0]
  let nearestDistance = nearest ? distanceOf(nearest) : Number.POSITIVE_INFINITY
  for (const shape of shapes.slice(1)) {
    const distance = distanceOf(shape)
    if (distance < nearestDistance || (distance === nearestDistance && shape.territoryCode === selectedCode)) {
      nearest = shape
      nearestDistance = distance
    }
  }
  return nearest?.territoryCode
}

// The part of the frame inside the canvas, or null when it is empty or has no area
export function visiblePart(rect: CanvasRect, canvas: CanvasSize): CanvasRect | null {
  const visible = {
    left: Math.max(0, rect.left),
    top: Math.max(0, rect.top),
    right: Math.min(canvas.width, rect.right),
    bottom: Math.min(canvas.height, rect.bottom),
  }
  return visible.right > visible.left && visible.bottom > visible.top ? visible : null
}

export function edgesBeyond(rect: CanvasRect, canvas: CanvasSize): EdgesBeyond {
  return { left: rect.left < 0, top: rect.top < 0, right: rect.right > canvas.width, bottom: rect.bottom > canvas.height }
}

// A corner takes at most a third of the smaller visible side, so that the inside of a small frame still moves it
export function cornerHitSize(visible: CanvasRect, hitSize: number): number {
  return Math.min(hitSize, Math.min(visible.right - visible.left, visible.bottom - visible.top) / 3)
}

// The handles of a side show when the side measures three grabbing zones at least
export function frameHandles(visible: CanvasRect, beyond: EdgesBeyond, hitSize: number): FrameHandle[] {
  const { left, top, right, bottom } = visible
  const middleX = (left + right) / 2
  const middleY = (top + bottom) / 2
  const corners: FrameHandle[] = [
    { index: 0, x: left, y: top, beyond: beyond.left || beyond.top },
    { index: 1, x: right, y: top, beyond: beyond.right || beyond.top },
    { index: 2, x: right, y: bottom, beyond: beyond.right || beyond.bottom },
    { index: 3, x: left, y: bottom, beyond: beyond.left || beyond.bottom },
  ]
  const sides: FrameHandle[] = []
  if (right - left >= 3 * hitSize) {
    sides.push({ index: 4, x: middleX, y: top, beyond: beyond.top }, { index: 6, x: middleX, y: bottom, beyond: beyond.bottom })
  }
  if (bottom - top >= 3 * hitSize) {
    sides.push({ index: 5, x: right, y: middleY, beyond: beyond.right }, { index: 7, x: left, y: middleY, beyond: beyond.left })
  }
  return [...corners, ...sides].sort((a, b) => a.index - b.index)
}

// The frame relative to the point of its territory, from the rectangle that the map shows
export function frameFromRect(rect: CanvasRect, [x, y]: [number, number]): FrameExtent {
  return [rect.left - x, rect.top - y, rect.right - x, rect.bottom - y]
}

const MOVED_EDGES: Record<HandleIndex, { x?: 0 | 2, y?: 1 | 3 }> = {
  0: { x: 0, y: 1 },
  1: { x: 2, y: 1 },
  2: { x: 2, y: 3 },
  3: { x: 0, y: 3 },
  4: { y: 1 },
  5: { x: 2 },
  6: { y: 3 },
  7: { x: 0 },
}

// Moves the edges that a handle holds; from the centre, the opposite edge moves the other way.
// An edge stops at the one it faces, so that left ≤ right and top ≤ bottom, and at the domain of its axis.
export function resizeFrame(start: FrameExtent, handle: HandleIndex, dx: number, dy: number, controls: readonly AxisControl[], fromCenter = false): FrameExtent {
  const frame = [...start] as FrameExtent
  const { x, y } = MOVED_EDGES[handle]
  if (x !== undefined) {
    moveEdges(frame, start, x, x === 0 ? 2 : 0, dx, fromCenter)
  }
  if (y !== undefined) {
    moveEdges(frame, start, y, y === 1 ? 3 : 1, dy, fromCenter)
  }
  return frame.map((value, edge) => toDomain(value, controls[edge]!.domain, controls[edge]!.format)) as FrameExtent
}

function moveEdges(frame: FrameExtent, start: FrameExtent, edge: number, opposite: number, delta: number, fromCenter: boolean) {
  frame[edge] = start[edge]! + delta
  if (fromCenter) {
    frame[opposite] = start[opposite]! - delta
  }
  const [low, high] = edge < opposite ? [edge, opposite] : [opposite, edge]
  if (frame[low]! > frame[high]!) {
    if (fromCenter) {
      const center = (start[low]! + start[high]!) / 2
      frame[low] = center
      frame[high] = center
    }
    else {
      frame[edge] = frame[opposite]!
    }
  }
}

// The position moves within the domain and the writing of each axis; with the axis constraint, it keeps to the axis where the pointer went further
export function moveOffset([x, y]: [number, number], dx: number, dy: number, [xControl, yControl]: readonly AxisControl[], onOneAxis = false): [number, number] {
  const [moveX, moveY] = !onOneAxis ? [dx, dy] : Math.abs(dx) >= Math.abs(dy) ? [dx, 0] : [0, dy]
  return [toDomain(x + moveX, xControl!.domain, xControl!.format), toDomain(y + moveY, yControl!.domain, yControl!.format)]
}
