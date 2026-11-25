import type { CanvasDimensions } from '@atlas-composer/specification'

// The placement of a sub-projection on the canvas: its scale, and its anchor at the center of the canvas plus its translate offset, to which its frame is relative

export function subProjectionScale(referenceScale: number, scaleMultiplier: number): number {
  return referenceScale * scaleMultiplier
}

export function subProjectionAnchor({ width, height }: CanvasDimensions, [x, y]: [number, number]): [number, number] {
  return [width / 2 + x, height / 2 + y]
}

export function translateOffsetOf({ width, height }: CanvasDimensions, [x, y]: [number, number]): [number, number] {
  return [x - width / 2, y - height / 2]
}
