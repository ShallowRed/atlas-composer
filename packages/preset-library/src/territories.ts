import type { I18NValue, JSONAtlasConfig } from '../../../types/atlas-config.js'
import type { AreaGeometry, Ring } from './rewind.js'
import { longitudeSpan, rewindToD3, withoutFlatPolygons } from './rewind.js'

export type { AreaGeometry, MultiPolygonGeometry, PolygonGeometry, Position, Ring } from './rewind.js'

export type NaturalEarthResolution = '10m' | '50m' | '110m'

export interface SourceFeature {
  type: 'Feature'
  id?: string | number
  properties?: Record<string, unknown> | null
  geometry: AreaGeometry | null
}

/** Features of a Natural Earth topology of world-atlas 2.0.2, identified by their ISO 3166-1 numeric id */
export interface NaturalEarthSource {
  kind: 'natural-earth'
  resolution: NaturalEarthResolution
  features: SourceFeature[]
}

/** Features of the user, each with the code of a territory of the atlas in `properties.code` */
export interface ByCodeSource {
  kind: 'by-code'
  features: SourceFeature[]
}

export type TerritorySource = NaturalEarthSource | ByCodeSource

export interface TerritoryFeature {
  type: 'Feature'
  id: string
  properties: {
    id: string
    code: string
    name: string
    iso: string
  }
  geometry: AreaGeometry
}

export interface BuiltTerritories {
  collection: { type: 'FeatureCollection', features: TerritoryFeature[] }
  /** Names of the features that the atlas `*` leaves out for lack of an id */
  skippedFeatures: string[]
}

export interface TerritoryBuildIssues {
  missingCodes?: string[]
  unknownCodes?: string[]
  outOfRangeIndices?: Array<{ code: string, index: number }>
  antimeridianRings?: string[]
  missingDuplicateSources?: string[]
  byCodeOnWildcard?: true
  unsupportedResolution?: string
}

export class TerritoryBuildError extends Error {
  constructor(message: string, readonly issues: TerritoryBuildIssues) {
    super(message)
    this.name = 'TerritoryBuildError'
  }
}

type AtlasTerritories = Pick<JSONAtlasConfig, 'territories'>
type TerritoryConfig = Exclude<JSONAtlasConfig['territories'], '*'>[number]

const NATURAL_EARTH_RESOLUTIONS: readonly NaturalEarthResolution[] = ['10m', '50m', '110m']

// The polygon indices of the extraction rules count the polygons of the 50m topology
const RULES_RESOLUTION: NaturalEarthResolution = '50m'

export function createNaturalEarthSource(features: SourceFeature[], resolution: string): NaturalEarthSource {
  const known = NATURAL_EARTH_RESOLUTIONS.find(value => value === resolution)
  if (!known) {
    throw new TerritoryBuildError(`Unknown Natural Earth resolution "${resolution}"`, { unsupportedResolution: resolution })
  }
  return { kind: 'natural-earth', resolution: known, features }
}

function localizedName(name: I18NValue, locale: string): string {
  return typeof name === 'string' ? name : (name[locale] ?? name.en)
}

function polygonsOf(geometry: AreaGeometry | null): Ring[][] {
  if (!geometry) {
    return []
  }
  return geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates]
}

function territoryFeature(territory: TerritoryConfig, geometry: AreaGeometry, locale: string): TerritoryFeature {
  return {
    type: 'Feature',
    id: territory.id,
    properties: {
      id: territory.id,
      code: territory.code,
      name: localizedName(territory.name, locale),
      iso: territory.iso,
    },
    geometry,
  }
}

function fitsInBounds(polygon: Ring[], bounds: TerritoryConfig['bounds']): boolean {
  const ring = polygon[0]
  if (!ring || ring.length === 0) {
    return false
  }
  const tolerance = 0.1
  const longitudes = ring.map(([longitude]) => longitude!)
  const latitudes = ring.map(([, latitude]) => latitude!)
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  return Math.min(...longitudes) >= minLon - tolerance
    && Math.max(...longitudes) <= maxLon + tolerance
    && Math.min(...latitudes) >= minLat - tolerance
    && Math.max(...latitudes) <= maxLat + tolerance
}

function buildWorld(source: NaturalEarthSource): BuiltTerritories {
  const territories = new Map<string, TerritoryFeature>()
  const skippedFeatures: string[] = []

  for (const feature of source.features) {
    if (feature.id === undefined || feature.id === '' || !feature.geometry) {
      skippedFeatures.push(String(feature.properties?.name ?? ''))
      continue
    }
    const id = String(feature.id).padStart(3, '0')
    const existing = territories.get(id)
    if (existing) {
      existing.geometry = {
        type: 'MultiPolygon',
        coordinates: [...polygonsOf(existing.geometry), ...polygonsOf(feature.geometry)],
      }
      continue
    }
    territories.set(id, {
      type: 'Feature',
      id,
      properties: { id, code: `WD-${id}`, iso: '', name: String(feature.properties?.name ?? '') },
      geometry: feature.geometry,
    })
  }

  const features = [...territories.values()].map(territory => ({ ...territory, geometry: rewindToD3(withoutFlatPolygons(territory.geometry)) }))
  return { collection: { type: 'FeatureCollection', features }, skippedFeatures }
}

function buildFromNaturalEarth(territories: TerritoryConfig[], source: NaturalEarthSource, locale: string): TerritoryFeature[] {
  const hasRules = territories.some(territory => territory.extraction?.extractFrom)
  if (hasRules && source.resolution !== RULES_RESOLUTION) {
    throw new TerritoryBuildError(
      `The extraction rules of this atlas count the polygons of the ${RULES_RESOLUTION} topology, not of the ${source.resolution} one`,
      { unsupportedResolution: source.resolution },
    )
  }

  const featuresById = new Map(source.features.map(feature => [String(feature.id), feature]))
  const findFeature = (id: string) => featuresById.get(id.padStart(3, '0')) ?? featuresById.get(id)

  const result = new Map<string, TerritoryFeature>()
  const outOfRangeIndices: Array<{ code: string, index: number }> = []

  for (const parent of territories) {
    const feature = findFeature(parent.id)
    if (!feature?.geometry) {
      continue
    }
    const rules = territories.filter(territory => territory.extraction?.extractFrom === parent.id)
    if (rules.length === 0 || feature.geometry.type !== 'MultiPolygon') {
      result.set(parent.code, territoryFeature(parent, feature.geometry, locale))
      continue
    }

    const polygons = feature.geometry.coordinates
    const taken = new Set<number>()
    const extracted = new Map<string, Ring[][]>()

    for (const rule of rules) {
      for (const index of rule.extraction?.polygonIndices ?? []) {
        if (index < 0 || index >= polygons.length) {
          outOfRangeIndices.push({ code: rule.code, index })
          continue
        }
        extracted.set(rule.code, [...(extracted.get(rule.code) ?? []), polygons[index]!])
        taken.add(index)
      }
    }

    const boundsRules = rules.filter(rule => !rule.extraction?.polygonIndices)
    const remaining: Ring[][] = []
    polygons.forEach((polygon, index) => {
      if (taken.has(index)) {
        return
      }
      const rule = boundsRules.find(candidate => fitsInBounds(polygon, candidate.bounds))
      if (rule) {
        extracted.set(rule.code, [...(extracted.get(rule.code) ?? []), polygon])
      }
      else {
        remaining.push(polygon)
      }
    })

    result.set(parent.code, territoryFeature(parent, { type: 'MultiPolygon', coordinates: remaining }, locale))
    for (const rule of rules) {
      const rulePolygons = extracted.get(rule.code)
      if (rulePolygons) {
        result.set(rule.code, territoryFeature(rule, { type: 'MultiPolygon', coordinates: rulePolygons }, locale))
      }
    }
  }

  const missingDuplicateSources: string[] = []
  for (const territory of territories) {
    const sourceId = territory.extraction?.duplicateFrom
    if (!sourceId) {
      continue
    }
    const duplicated = [...result.values()].find(candidate => candidate.id === sourceId || candidate.properties.code === sourceId)
    if (duplicated) {
      result.set(territory.code, territoryFeature(territory, duplicated.geometry, locale))
    }
    else {
      missingDuplicateSources.push(territory.code)
    }
  }

  if (outOfRangeIndices.length > 0 || missingDuplicateSources.length > 0) {
    throw new TerritoryBuildError('The extraction rules of this atlas do not match the topology', { outOfRangeIndices, missingDuplicateSources })
  }

  return [...result.values()].map(territory => ({ ...territory, geometry: rewindToD3(withoutFlatPolygons(territory.geometry)) }))
}

function buildFromCodes(territories: TerritoryConfig[], source: ByCodeSource, locale: string): TerritoryFeature[] {
  const byCode = new Map(territories.map(territory => [territory.code, territory]))
  const polygons = new Map<string, Ring[][]>()
  const unknownCodes = new Set<string>()
  const antimeridianRings = new Set<string>()

  for (const feature of source.features) {
    const code = String(feature.properties?.code ?? '')
    if (!byCode.has(code)) {
      unknownCodes.add(code)
      continue
    }
    const featurePolygons = polygonsOf(feature.geometry)
    if (featurePolygons.some(polygon => polygon.some(ring => longitudeSpan(ring) > 180))) {
      antimeridianRings.add(code)
    }
    polygons.set(code, [...(polygons.get(code) ?? []), ...featurePolygons])
  }

  if (unknownCodes.size > 0 || antimeridianRings.size > 0) {
    throw new TerritoryBuildError('The features do not match the territories of this atlas', {
      unknownCodes: [...unknownCodes],
      antimeridianRings: [...antimeridianRings],
    })
  }

  return territories.flatMap((territory) => {
    const territoryPolygons = polygons.get(territory.code)
    return territoryPolygons
      ? [territoryFeature(territory, rewindToD3({ type: 'MultiPolygon', coordinates: territoryPolygons }), locale)]
      : []
  })
}

/**
 * Builds one feature per territory of an atlas. A Natural Earth source goes through the extraction rules of the
 * atlas, in the order of its territories; features by code are gathered by code.
 */
export function buildTerritories(
  config: AtlasTerritories,
  source: TerritorySource,
  { locale = 'en' }: { locale?: string } = {},
): BuiltTerritories {
  if (config.territories === '*') {
    if (source.kind === 'by-code') {
      throw new TerritoryBuildError('An atlas of every country reads a Natural Earth source', { byCodeOnWildcard: true })
    }
    return buildWorld(source)
  }

  const territories = config.territories
  const features = source.kind === 'natural-earth'
    ? buildFromNaturalEarth(territories, source, locale)
    : buildFromCodes(territories, source, locale)

  const built = new Set(features.map(feature => feature.properties.code))
  const missingCodes = territories.map(territory => territory.code).filter(code => !built.has(code))
  if (missingCodes.length > 0) {
    throw new TerritoryBuildError(`No feature for ${missingCodes.join(', ')}`, { missingCodes })
  }

  return { collection: { type: 'FeatureCollection', features }, skippedFeatures: [] }
}
