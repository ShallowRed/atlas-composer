import type { CanvasDimensions, CompositeProjectionConfig, ValidationError } from '@atlas-composer/specification'
import type { DeprecatedPositioning, Positioning } from '@/core/positioning'
import type { ProjectionFamilyType } from '@/core/projections/types'
import type { Result } from '@/core/types/result'
import type { AtlasConfig } from '@/types/atlas'
import type { AtlasId } from '@/types/branded'
import { DEFAULT_REFERENCE_SCALE, PROJECTION_FAMILIES, validateConfig } from '@atlas-composer/specification'
import { convertPositioning, replaceDeprecatedPositioning } from '@/core/positioning'
import { projectionRegistry } from '@/core/projections/registry'
import { err, ok } from '@/core/types/result'

export interface CompositeConfigContext {
  atlasConfig: AtlasConfig
  canvasDimensions: CanvasDimensions
}

type RawObject = Record<string, unknown>

const FAMILIES: ReadonlySet<unknown> = new Set(PROJECTION_FAMILIES)

function isObject(value: unknown): value is RawObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasTerritoryObjects(raw: unknown): raw is RawObject & { territories: RawObject[] } {
  return isObject(raw) && Array.isArray(raw.territories) && raw.territories.every(isObject)
}

function projectionIdOf(territory: RawObject): string | undefined {
  const id = isObject(territory.projection) ? territory.projection.id : undefined
  return typeof id === 'string' ? id : undefined
}

export function formatValidationError({ path, message }: ValidationError): string {
  return path ? `${path}: ${message}` : message
}

function withoutUndefined(object: RawObject): RawObject {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined))
}

// projectionId and zoomLevel are parameters of the application that earlier exports wrote
function readParameters(parameters: RawObject, family: ProjectionFamilyType, atlasCenter?: [number, number]): RawObject {
  const { projectionId: _projectionId, zoomLevel: _zoomLevel, ...rest } = parameters
  const atlasPositioning: Positioning = atlasCenter ? { center: atlasCenter } : {}
  const converted = replaceDeprecatedPositioning(rest as RawObject & DeprecatedPositioning & Positioning, family, atlasPositioning)
  const positioning = converted.rotate === undefined && converted.center === undefined && atlasCenter
    ? convertPositioning(atlasPositioning, family)
    : {}
  return withoutUndefined({ ...converted, ...positioning })
}

function readLayout(layout: RawObject): RawObject {
  const { pixelClipExtent, ...rest } = layout
  return pixelClipExtent === null ? rest : layout
}

function readTerritory(territory: RawObject, { atlasConfig }: CompositeConfigContext): RawObject {
  const { projection, layout } = territory
  const definition = projectionRegistry.get(projectionIdOf(territory) ?? '')
  if (!isObject(projection) || !definition) {
    return territory
  }

  const atlasCenter = atlasConfig.compositeProjectionConfig?.territories.find(t => t.code === territory.code)?.center
  return {
    ...territory,
    projection: {
      ...projection,
      family: FAMILIES.has(projection.family) ? projection.family : definition.family,
      ...(isObject(projection.parameters) && { parameters: readParameters(projection.parameters, definition.family, atlasCenter) }),
    },
    ...(isObject(layout) && { layout: readLayout(layout) }),
  }
}

function validate(config: unknown): Result<CompositeProjectionConfig, string[]> {
  const { valid, errors } = validateConfig(config)
  return valid ? ok(config as CompositeProjectionConfig) : err(errors.map(formatValidationError))
}

/**
 * Reads a composite configuration of the specification, and the deprecated forms
 * of the files that earlier versions of the application exported.
 */
export function readCompositeConfig(raw: unknown, context: CompositeConfigContext): Result<CompositeProjectionConfig, string[]> {
  if (!hasTerritoryObjects(raw)) {
    return validate(raw)
  }

  const unknownProjections = raw.territories.flatMap((territory) => {
    const id = projectionIdOf(territory)
    return id !== undefined && !projectionRegistry.get(id)
      ? [`Territory ${String(territory.code)}: unknown projection '${id}'`]
      : []
  })
  if (unknownProjections.length > 0) {
    return err(unknownProjections)
  }

  return validate({
    ...raw,
    referenceScale: raw.referenceScale ?? DEFAULT_REFERENCE_SCALE,
    canvasDimensions: raw.canvasDimensions ?? context.canvasDimensions,
    territories: raw.territories.map(territory => readTerritory(territory, context)),
  })
}

export function checkAtlasCompatibility(
  config: CompositeProjectionConfig,
  currentAtlasId: AtlasId,
): string[] {
  if (config.metadata.atlasId !== currentAtlasId) {
    return [
      `Configuration was exported for atlas '${config.metadata.atlasId}' but current atlas is '${currentAtlasId}'. Territory codes may not match.`,
    ]
  }
  return []
}
