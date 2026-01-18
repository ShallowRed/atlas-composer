import type { ProjectionLike as CoreProjectionLike, SubProjectionEntry } from '@atlas-composer/projection-core'
import type {
  CompositeProjectionConfig,
  GeoBounds,
  LayoutConfig,
  ProjectionParameters as SpecProjectionParameters,
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

/** @deprecated Use CompositeProjectionConfig from @atlas-composer/specification */
export type ProjectionParameters = SpecProjectionParameters

/** @deprecated Use CompositeProjectionConfig from @atlas-composer/specification */
export type ExportedConfig = CompositeProjectionConfig

/** @deprecated Use TerritoryConfig from @atlas-composer/specification */
export type Territory = TerritoryConfig

/** @deprecated Use LayoutConfig from @atlas-composer/specification */
export type Layout = LayoutConfig

export interface LoaderOptions {
  width: number
  height: number
  enableClipping?: boolean
  debug?: boolean
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

  load(config: ExportedConfig, options: LoaderOptions): ProjectionLike {
    const { width, height, debug = false } = options

    if (config.version !== '1.0') {
      throw new Error(`Unsupported configuration version: ${config.version}`)
    }

    if (!config.territories || config.territories.length === 0) {
      throw new Error('Configuration must contain at least one territory')
    }

    const entries: SubProjectionEntry[] = config.territories.map((territory) => {
      const proj = this.createSubProjection(territory, width, height, config.referenceScale, debug)

      return {
        id: territory.code,
        projection: proj as CoreProjectionLike,
        bounds: {
          minLon: territory.bounds[0][0],
          minLat: territory.bounds[0][1],
          maxLon: territory.bounds[1][0],
          maxLat: territory.bounds[1][1],
        },
      }
    })

    if (debug) {
      console.log('[CompositeProjection] Created sub-projections:', {
        territories: config.territories.map(t => t.code),
        count: entries.length,
      })
    }

    return buildCompositeProjection({ entries, debug }) as ProjectionLike
  }

  loadFromJSON(jsonString: string, options: LoaderOptions): ProjectionLike {
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

  private createSubProjection(
    territory: Territory,
    width: number,
    height: number,
    referenceScale?: number,
    debug?: boolean,
  ): ProjectionLike {
    const { layout } = territory
    const projectionId = territory.projection.id
    const parameters = territory.projection.parameters

    if (!projectionId || !parameters) {
      throw new Error(`Territory ${territory.code} missing projection configuration`)
    }

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

    if (projection.scale && parameters.scaleMultiplier) {
      const effectiveReferenceScale = referenceScale || 2700
      const calculatedScale = effectiveReferenceScale * parameters.scaleMultiplier
      projection.scale(calculatedScale)
    }

    if (parameters.clipAngle && projection.clipAngle) {
      projection.clipAngle(parameters.clipAngle)
    }

    if (parameters.precision && projection.precision) {
      projection.precision(parameters.precision)
    }

    if (projection.translate) {
      const [offsetX, offsetY] = layout.translateOffset || [0, 0]
      projection.translate([
        width / 2 + offsetX,
        height / 2 + offsetY,
      ])
    }

    if (layout.pixelClipExtent && projection.clipExtent) {
      const territoryCenter = projection.translate?.() || [width / 2, height / 2]

      const clipExtent = calculateClipExtentFromPixelOffset(
        territoryCenter,
        layout.pixelClipExtent,
      )

      projection.clipExtent(clipExtent)
      if (debug) {
        console.log(
          `[Clipping] Applied pixelClipExtent for ${territory.code}:`,
          `original: ${JSON.stringify(layout.pixelClipExtent)} -> transformed: ${JSON.stringify(clipExtent)}`,
        )
      }
    }
    else if (projection.clipExtent) {
      const bounds = territory.bounds
      if (bounds && bounds.length === 2 && bounds[0].length === 2 && bounds[1].length === 2) {
        const scale = projection.scale?.() || 1
        const translate = projection.translate?.() || [0, 0]

        const padding = scale * 0.1
        const clipExtent: [[number, number], [number, number]] = [
          [translate[0] - padding, translate[1] - padding],
          [translate[0] + padding, translate[1] + padding],
        ]

        projection.clipExtent(clipExtent)

        if (debug) {
          console.log(`[Clipping] Applied default clip extent for ${territory.code}:`, clipExtent)
        }
      }
    }

    return projection
  }
}

export function validateConfig(config: unknown): asserts config is ExportedConfig {
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

// Legacy function exports for backward compatibility
const defaultLoader = new ProjectionLoader()

export function registerProjection(id: string, factory: ProjectionFactory): void {
  defaultLoader.register(id, factory)
}

export function registerProjections(factories: Record<string, ProjectionFactory>): void {
  defaultLoader.registerAll(factories)
}

export function unregisterProjection(id: string): boolean {
  return defaultLoader.unregister(id)
}

export function clearProjections(): void {
  defaultLoader.clear()
}

export function getRegisteredProjections(): string[] {
  return defaultLoader.getRegistered()
}

export function isProjectionRegistered(id: string): boolean {
  return defaultLoader.isRegistered(id)
}

export function loadCompositeProjection(config: ExportedConfig, options: LoaderOptions): ProjectionLike {
  return defaultLoader.load(config, options)
}

export function loadFromJSON(jsonString: string, options: LoaderOptions): ProjectionLike {
  return defaultLoader.loadFromJSON(jsonString, options)
}
