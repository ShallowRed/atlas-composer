import type { ProjectionLike as CoreProjectionLike, SubProjectionEntry } from '@atlas-composer/projection-core'
import type {
  CompositeProjectionConfig,
  GeoBounds,
  LayoutConfig,
  TerritoryConfig,
} from '@atlas-composer/specification'

import {
  buildCompositeProjection,
  calculateClipExtentFromPixelOffset,
} from '@atlas-composer/projection-core'

export interface ProjectionLike {
  (coordinates: [number, number]): [number, number] | null
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
  scale?: {
    (): number
    (scale: number): ProjectionLike
  }
  translate?: {
    (): [number, number]
    (translate: [number, number]): ProjectionLike
  }
  clipExtent?: {
    (): [[number, number], [number, number]] | null
    (extent: [[number, number], [number, number]] | null): ProjectionLike
  }
  clipAngle?: {
    (): number
    (angle: number): ProjectionLike
  }
  stream?: (stream: StreamLike) => StreamLike
  precision?: {
    (): number
    (precision: number): ProjectionLike
  }
  fitExtent?: (extent: [[number, number], [number, number]], object: any) => ProjectionLike
  fitSize?: (size: [number, number], object: any) => ProjectionLike
  fitWidth?: (width: number, object: any) => ProjectionLike
  fitHeight?: (height: number, object: any) => ProjectionLike
}

export interface CompositeProjectionLike extends ProjectionLike {
  invert: (coordinates: [number, number]) => [number, number] | null
  scale: {
    (): number
    (scale: number): CompositeProjectionLike
  }
  translate: {
    (): [number, number]
    (translate: [number, number]): CompositeProjectionLike
  }
  fitSize: (size: [number, number], object: any) => CompositeProjectionLike
  fitExtent: (extent: [[number, number], [number, number]], object: any) => CompositeProjectionLike
}

interface TerritoryLayout {
  territory: TerritoryConfig
  factory: ProjectionFactory
  translateCoefficient: [number, number]
  clipCoefficients: [number, number, number, number] | null
}

export interface StreamLike {
  point: (x: number, y: number) => void
  lineStart: () => void
  lineEnd: () => void
  polygonStart: () => void
  polygonEnd: () => void
  sphere?: () => void
}

export type ProjectionFactory = () => ProjectionLike

export type { CompositeProjectionConfig, GeoBounds, LayoutConfig, TerritoryConfig }

export interface LoaderOptions {
  width: number
  height: number
  enableClipping?: boolean
  debug?: boolean
}

function computeScaleFactor(
  canvasDimensions: { width: number, height: number } | undefined,
  targetWidth: number,
  targetHeight: number,
): number {
  if (!canvasDimensions)
    return 1

  // Scale to fit: use the smaller ratio to ensure content fits within target
  const widthRatio = targetWidth / canvasDimensions.width
  const heightRatio = targetHeight / canvasDimensions.height

  return Math.min(widthRatio, heightRatio)
}

export class ProjectionLoader {
  private factories = new Map<string, ProjectionFactory>()

  register(id: string, factory: ProjectionFactory): void {
    this.factories.set(id, factory)
  }

  registerAll(factories: Record<string, ProjectionFactory>): void {
    for (const [id, factory] of Object.entries(factories)) {
      this.register(id, factory)
    }
  }

  unregister(id: string): boolean {
    return this.factories.delete(id)
  }

  clear(): void {
    this.factories.clear()
  }

  getRegistered(): string[] {
    return Array.from(this.factories.keys())
  }

  isRegistered(id: string): boolean {
    return this.factories.has(id)
  }

  load(config: CompositeProjectionConfig, options: LoaderOptions): CompositeProjectionLike {
    const { width, height, debug = false } = options

    if (config.version !== '1.0') {
      throw new Error(`Unsupported configuration version: ${config.version}`)
    }

    if (!config.territories || config.territories.length === 0) {
      throw new Error('Configuration must contain at least one territory')
    }

    const referenceScale = config.referenceScale || 2700
    const canvasDimensions = config.canvasDimensions || { width, height }

    const layouts: TerritoryLayout[] = config.territories.map((territory) => {
      const factory = this.getFactory(territory.projection.id, territory.code)
      const [offsetX, offsetY] = territory.layout.translateOffset || [0, 0]
      const clip = territory.layout.pixelClipExtent

      return {
        territory,
        factory,
        translateCoefficient: [
          offsetX / referenceScale,
          offsetY / referenceScale,
        ] as [number, number],
        clipCoefficients: clip
          ? [
              clip[0] / referenceScale,
              clip[1] / referenceScale,
              clip[2] / referenceScale,
              clip[3] / referenceScale,
            ] as [number, number, number, number]
          : null,
      }
    })

    const scaleFactor = computeScaleFactor(canvasDimensions, width, height)
    let currentScale = referenceScale * scaleFactor
    let currentTranslate: [number, number] = [width / 2, height / 2]

    const rebuildEntries = (): SubProjectionEntry[] => {
      return layouts.map((layout) => {
        const proj = this.createSubProjectionFromLayout(
          layout,
          currentScale,
          currentTranslate,
          debug,
        )
        return {
          id: layout.territory.code,
          projection: proj as CoreProjectionLike,
          bounds: {
            minLon: layout.territory.bounds[0][0],
            minLat: layout.territory.bounds[0][1],
            maxLon: layout.territory.bounds[1][0],
            maxLat: layout.territory.bounds[1][1],
          },
        }
      })
    }

    let entries = rebuildEntries()
    let baseProjection = buildCompositeProjection({ entries, debug })

    const composite = ((coords: [number, number]) => baseProjection(coords)) as CompositeProjectionLike

    const rebuild = () => {
      entries = rebuildEntries()
      baseProjection = buildCompositeProjection({ entries, debug })
    }

    composite.stream = stream => baseProjection.stream(stream)
    composite.invert = coords => baseProjection.invert?.(coords) ?? null

    composite.scale = function (s?: number): any {
      if (arguments.length === 0)
        return currentScale
      currentScale = s!
      rebuild()
      return composite
    } as CompositeProjectionLike['scale']

    composite.translate = function (t?: [number, number]): any {
      if (arguments.length === 0)
        return currentTranslate
      currentTranslate = t!
      rebuild()
      return composite
    } as CompositeProjectionLike['translate']

    composite.fitSize = function (size: [number, number], _object: any): CompositeProjectionLike {
      const [w, h] = size
      const newScaleFactor = computeScaleFactor(canvasDimensions, w, h)
      currentScale = referenceScale * newScaleFactor
      currentTranslate = [w / 2, h / 2]
      rebuild()
      return composite
    }

    composite.fitExtent = function (
      extent: [[number, number], [number, number]],
      object: any,
    ): CompositeProjectionLike {
      const x0 = extent[0][0]
      const y0 = extent[0][1]
      const x1 = extent[1][0]
      const y1 = extent[1][1]
      return composite.fitSize([x1 - x0, y1 - y0], object)
        .translate([(x0 + x1) / 2, (y0 + y1) / 2])
    }

    if (debug) {
      console.log('[CompositeProjection] Created with relative scaling:', {
        territories: config.territories.map(t => t.code),
        referenceScale,
        currentScale,
        scaleFactor,
      })
    }

    return composite
  }

  private getFactory(projectionId: string, territoryCode: string): ProjectionFactory {
    const factory = this.factories.get(projectionId)
    if (!factory) {
      const registered = this.getRegistered()
      const availableList = registered.length > 0 ? registered.join(', ') : 'none'
      throw new Error(
        `Projection "${projectionId}" is not registered. `
        + `Available projections: ${availableList}. `
        + `Use loader.register('${projectionId}', factory) to register it.`,
      )
    }
    return factory
  }

  private createSubProjectionFromLayout(
    layout: TerritoryLayout,
    scale: number,
    translate: [number, number],
    debug?: boolean,
  ): ProjectionLike {
    const { territory, factory, translateCoefficient, clipCoefficients } = layout
    const parameters = territory.projection.parameters
    const projection = factory()

    const hasFocus = parameters.focusLongitude !== undefined && parameters.focusLatitude !== undefined
    const projFamily = territory.projection.family

    if (hasFocus && projFamily === 'CONIC' && projection.rotate) {
      projection.rotate([-parameters.focusLongitude!, -parameters.focusLatitude!, 0])
    }
    else if (hasFocus && projection.center) {
      projection.center([parameters.focusLongitude!, parameters.focusLatitude!])
    }
    else if (parameters.center && projection.center) {
      projection.center(parameters.center)
    }

    if (parameters.rotate && projection.rotate && !hasFocus) {
      const rotate = Array.isArray(parameters.rotate)
        ? [...parameters.rotate, 0, 0].slice(0, 3) as [number, number, number]
        : [0, 0, 0] as [number, number, number]
      projection.rotate(rotate)
    }

    if (parameters.parallels && projection.parallels) {
      const parallels = Array.isArray(parameters.parallels)
        ? [...parameters.parallels, 0].slice(0, 2) as [number, number]
        : [0, 60] as [number, number]
      projection.parallels(parallels)
    }

    const scaleMultiplier = parameters.scaleMultiplier ?? 1
    const territoryScale = scale * scaleMultiplier
    if (projection.scale) {
      projection.scale(territoryScale)
    }

    if (parameters.clipAngle && projection.clipAngle) {
      projection.clipAngle(parameters.clipAngle)
    }

    if (parameters.precision && projection.precision) {
      projection.precision(parameters.precision)
    }

    if (projection.translate) {
      projection.translate([
        translate[0] + translateCoefficient[0] * scale,
        translate[1] + translateCoefficient[1] * scale,
      ])
    }

    if (clipCoefficients && projection.clipExtent) {
      const territoryCenter = projection.translate?.() || translate
      const clipExtent = calculateClipExtentFromPixelOffset(
        territoryCenter,
        [
          clipCoefficients[0] * scale,
          clipCoefficients[1] * scale,
          clipCoefficients[2] * scale,
          clipCoefficients[3] * scale,
        ],
      )
      projection.clipExtent(clipExtent)

      if (debug) {
        console.log(`[Clipping] Applied clip for ${territory.code}:`, clipExtent)
      }
    }

    return projection
  }

  loadFromJSON(jsonString: string, options: LoaderOptions): CompositeProjectionLike {
    let config: unknown

    try {
      config = JSON.parse(jsonString)
    }
    catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    validateConfig(config)
    return this.load(config, options)
  }
}

export function validateConfig(config: unknown): asserts config is CompositeProjectionConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be an object')
  }

  const cfg = config as Record<string, unknown>

  if (!cfg.version) {
    throw new Error('Configuration must have a version field')
  }

  if (!cfg.metadata || typeof cfg.metadata !== 'object' || !(cfg.metadata as Record<string, unknown>).atlasId) {
    throw new Error('Configuration must have metadata with atlasId')
  }

  if (!cfg.territories || !Array.isArray(cfg.territories)) {
    throw new Error('Configuration must have territories array')
  }

  if (cfg.territories.length === 0) {
    throw new Error('Configuration must have at least one territory')
  }

  for (const territory of cfg.territories as Record<string, unknown>[]) {
    if (!territory.code) {
      throw new Error(`Territory missing required field 'code': ${JSON.stringify(territory)}`)
    }

    const proj = territory.projection as Record<string, unknown> | undefined
    if (!proj || !proj.id || !proj.parameters) {
      throw new Error(`Territory ${territory.code} missing projection configuration. Required: projection.id and projection.parameters`)
    }

    if (!territory.bounds) {
      throw new Error(`Territory ${territory.code} missing bounds`)
    }
  }
}
