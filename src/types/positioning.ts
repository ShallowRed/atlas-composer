export interface CanonicalPositioning {
  focusLongitude: number
  focusLatitude: number
  rotateGamma?: number
}

export type D3Center = [number, number]
export type D3Rotate = [number, number, number]
export type PositioningFamily = 'CYLINDRICAL' | 'CONIC' | 'AZIMUTHAL' | 'OTHER'

export interface PositioningApplication {
  center?: D3Center
  rotate?: D3Rotate
}

export const DEFAULT_CANONICAL_POSITIONING: CanonicalPositioning = {
  focusLongitude: 0,
  focusLatitude: 0,
  rotateGamma: 0,
}

export function isCanonicalPositioning(value: unknown): value is CanonicalPositioning {
  if (!value || typeof value !== 'object')
    return false
  const pos = value as Record<string, unknown>
  return (
    typeof pos.focusLongitude === 'number'
    && typeof pos.focusLatitude === 'number'
    && !Number.isNaN(pos.focusLongitude)
    && !Number.isNaN(pos.focusLatitude)
    && pos.focusLongitude >= -180
    && pos.focusLongitude <= 180
    && pos.focusLatitude >= -90
    && pos.focusLatitude <= 90
  )
}

export function isD3Center(value: unknown): value is D3Center {
  if (!Array.isArray(value) || value.length !== 2)
    return false
  return value.every(v => typeof v === 'number' && !Number.isNaN(v))
}

export function isD3Rotate(value: unknown): value is D3Rotate {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3)
    return false
  return value.every(v => typeof v === 'number' && !Number.isNaN(v))
}
