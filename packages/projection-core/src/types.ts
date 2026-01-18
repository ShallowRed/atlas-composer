/**
 * D3's geographic projections use a streaming API where geometry flows
 * through a pipeline of transforms.
 */
export interface StreamLike {
  point: (x: number, y: number) => void
  lineStart: () => void
  lineEnd: () => void
  polygonStart: () => void
  polygonEnd: () => void
  sphere?: () => void
}

/**
 * D3 projections use getter/setter pattern: calling without arguments returns
 * the current value, with arguments sets and returns this.
 */
export interface ProjectionLike {
  (coordinates: [number, number]): [number, number] | null

  invert?: (coordinates: [number, number]) => [number, number] | null

  stream: (stream: StreamLike) => StreamLike

  scale: {
    (): number
    (scale: number): ProjectionLike
  }

  translate: {
    (): [number, number]
    (translate: [number, number]): ProjectionLike
  }

  center?: {
    (): [number, number]
    (center: [number, number]): ProjectionLike
  }

  rotate?: {
    (): [number, number, number]
    (angles: [number, number, number]): ProjectionLike
  }

  parallels?: {
    (): [number, number]
    (parallels: [number, number]): ProjectionLike
  }

  clipExtent?: {
    (): [[number, number], [number, number]] | null
    (extent: [[number, number], [number, number]] | null): ProjectionLike
  }

  clipAngle?: {
    (): number
    (angle: number): ProjectionLike
  }

  precision?: {
    (): number
    (precision: number): ProjectionLike
  }
}

export interface GeoBounds {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

export type GeoBoundsArray = [[number, number], [number, number]]

export interface SubProjectionEntry {
  id: string
  name: string
  projection: ProjectionLike
  bounds?: GeoBounds
}

export interface CompositeProjectionConfig {
  entries: SubProjectionEntry[]
  debug?: boolean
}

export interface PointCaptureResult {
  pointStream: StreamLike
  getCapturedPoint: () => [number, number] | null
  resetCapture: () => void
}

export interface InvertResult {
  coordinates: [number, number]
  territoryId?: string
}

export interface InvertOptions {
  tolerance?: number
  debug?: boolean
}

export interface ClipExtentOptions {
  epsilon?: number
}
