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
    (): number | null
    (angle: number | null): ProjectionLike
  }

  precision?: {
    (): number
    (precision: number): ProjectionLike
  }
}

// Longitudes in [-180, 180]; a box whose minLon exceeds maxLon crosses the antimeridian
export interface GeoBounds {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

export type GeoBoundsArray = [[number, number], [number, number]]

export interface SubProjectionEntry {
  id: string
  projection: ProjectionLike
  bounds?: GeoBounds
}

export interface CompositeBuildInput {
  entries: SubProjectionEntry[]
  debug?: boolean
}

/** @deprecated Use CompositeBuildInput: CompositeProjectionConfig of @atlas-composer/specification names the exported file */
export type CompositeProjectionConfig = CompositeBuildInput

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
