import type { ProjectionLike as CoreProjectionLike, SubProjectionEntry } from '@atlas-composer/projection-core'
import type {
  CanvasDimensions,
  CompositeProjectionConfig,
  TerritoryConfig,
  ValidationError,
} from '@atlas-composer/specification'

import {
  applyRenderingParameters,
  boundsFromArray,
  buildCompositeProjection,
} from '@atlas-composer/projection-core'
import {
  DEFAULT_SCALE_MULTIPLIER,
  resolveProjectionAlias,
  validateConfig,
} from '@atlas-composer/specification'

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

export interface LoaderOptions {
  width: number
  height: number
  enableClipping?: boolean
  debug?: boolean
}

export class ConfigValidationError extends Error {
  readonly errors: ValidationError[]

  constructor(errors: ValidationError[]) {
    super(`Invalid composite projection configuration:\n${errors.map(({ path, message }) => `- ${path}: ${message}`).join('\n')}`)
    this.name = 'ConfigValidationError'
    this.errors = errors
  }
}

function computeScaleFactor(
  canvasDimensions: CanvasDimensions,
  targetWidth: number,
  targetHeight: number,
): number {
  // Scale to fit: use the smaller ratio to ensure content fits within target
  const widthRatio = targetWidth / canvasDimensions.width
  const heightRatio = targetHeight / canvasDimensions.height

  return Math.min(widthRatio, heightRatio)
}

function assertValidConfig(config: CompositeProjectionConfig): void {
  const { valid, errors } = validateConfig(config)
  if (!valid) {
    throw new ConfigValidationError(errors)
  }
}

export interface SubProjectionOptions {
  /** Scale of the composite: `referenceScale` of the configuration draws it at its `canvasDimensions` */
  scale: number
  /** Position of the center of the canvas */
  translate: [number, number]
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

    assertValidConfig(config)

    const { referenceScale, canvasDimensions } = config
    const layouts = this.createLayouts(config)

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
        const { bounds } = layout.territory
        return {
          id: layout.territory.code,
          projection: proj as CoreProjectionLike,
          ...(bounds && {
            bounds: {
              minLon: bounds[0][0],
              minLat: bounds[0][1],
              maxLon: bounds[1][0],
              maxLat: bounds[1][1],
            },
          }),
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

  /**
   * Builds the sub-projection of each territory of a composite, with its clipping,
   * at the given scale and translation.
   */
  createSubProjections(config: CompositeProjectionConfig, options: SubProjectionOptions): Map<string, ProjectionLike> {
    assertValidConfig(config)

    return new Map(this.createLayouts(config).map(layout => [
      layout.territory.code,
      this.createSubProjectionFromLayout(layout, options.scale, options.translate),
    ]))
  }

  private createLayouts(config: CompositeProjectionConfig): TerritoryLayout[] {
    const { referenceScale } = config

    return config.territories.map((territory) => {
      const factory = this.getFactory(territory.projection.id)
      const [offsetX, offsetY] = territory.layout.translateOffset
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
  }

  private getFactory(projectionId: string): ProjectionFactory {
    const factory = this.factories.get(projectionId) ?? this.factories.get(resolveProjectionAlias(projectionId))
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

    if (parameters.center !== undefined && projection.center) {
      projection.center(parameters.center)
    }

    if (parameters.rotate !== undefined && projection.rotate) {
      const [lambda, phi, gamma = 0] = parameters.rotate
      projection.rotate([lambda, phi, gamma])
    }

    if (parameters.parallels !== undefined && projection.parallels) {
      projection.parallels(parameters.parallels)
    }

    const scaleMultiplier = parameters.scaleMultiplier ?? DEFAULT_SCALE_MULTIPLIER
    const territoryScale = scale * scaleMultiplier
    if (projection.scale) {
      projection.scale(territoryScale)
    }

    if (projection.translate) {
      projection.translate([
        translate[0] + translateCoefficient[0] * scale,
        translate[1] + translateCoefficient[1] * scale,
      ])
    }

    applyRenderingParameters(
      projection as CoreProjectionLike,
      {
        clipAngle: parameters.clipAngle,
        precision: parameters.precision,
        pixelClipExtent: clipCoefficients && [
          clipCoefficients[0] * scale,
          clipCoefficients[1] * scale,
          clipCoefficients[2] * scale,
          clipCoefficients[3] * scale,
        ],
        bounds: territory.bounds && boundsFromArray(territory.bounds),
      },
      projection.translate?.() || translate,
    )

    if (debug) {
      console.log(`[Clipping] Applied clip for ${territory.code}:`, projection.clipExtent?.())
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

    // load validates the parsed value
    return this.load(config as CompositeProjectionConfig, options)
  }
}
