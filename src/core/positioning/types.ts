export type D3Center = [number, number]
export type D3Rotate = [number, number, number]

export type PositioningView = 'composite' | 'global'

export type PositionParameter = 'center' | 'rotate'

export interface Positioning {
  center?: D3Center
  rotate?: D3Rotate | [number, number]
}

export interface PositioningParameters extends Positioning {
  parallels?: [number, number]
}

export interface DeprecatedPositioning {
  focusLongitude?: number
  focusLatitude?: number
  rotateGamma?: number
}
