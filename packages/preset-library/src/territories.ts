import type { AreaGeometry, Ring } from './rewind.js'
import { geoCentroid, geoContains, geoDistance } from 'd3-geo'
import { hasArea, longitudeSpan, rewindToD3, withoutFlatPolygons } from './rewind.js'

export type { AreaGeometry, MultiPolygonGeometry, PolygonGeometry, Position, Ring } from './rewind.js'

export type NaturalEarthResolution = '10m' | '50m' | '110m'

/** A GeoJSON feature as GeoJSON readers, topojson-client and JSON imports type it */
export interface FeatureInput {
  type?: string
  id?: string | number
  properties?: Readonly<Record<string, unknown>> | null
  geometry: { type: string, coordinates?: unknown } | null
}

/** A feature collection, a single feature or a list of features */
export type FeaturesInput = { features: ReadonlyArray<FeatureInput> } | FeatureInput | ReadonlyArray<FeatureInput>

export type I18NInput = string | { readonly en: string, readonly [locale: string]: string | undefined }

/** The territories of an atlas configuration, such as `@atlas-composer/preset-library/atlases/france` */
export interface TerritoryInput {
  id: string
  code: string
  name: I18NInput
  iso: string
  bounds: ReadonlyArray<ReadonlyArray<number>>
  extraction?: {
    extractFrom?: string
    polygonIndices?: ReadonlyArray<number>
    duplicateFrom?: string
  }
}

export interface AtlasTerritoriesInput {
  /** The territories, or `*` for an atlas of every country */
  territories: string | ReadonlyArray<TerritoryInput>
}

export interface SourceFeature {
  id?: string | number
  properties?: Readonly<Record<string, unknown>> | null
  geometry: AreaGeometry | null
}

/** Features of a Natural Earth topology of world-atlas 2.0.2, identified by their ISO 3166-1 numeric id */
export interface NaturalEarthSource {
  kind: 'natural-earth'
  resolution: NaturalEarthResolution
  features: SourceFeature[]
  /** The features of the 50m topology, whose polygons the extraction rules count, for a source at another resolution */
  ruleFeatures?: SourceFeature[]
}

/** Features of the user, each with the code of a territory of the atlas in `properties.code` */
export interface ByCodeSource {
  kind: 'by-code'
  features: FeaturesInput
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

/** A polygon of a source at another resolution than 50m that the build leaves out, with the territory of its nearest polygon */
export interface LeftOutPolygon {
  code: string
  centroid: [number, number]
}

export interface BuiltTerritories {
  collection: { type: 'FeatureCollection', features: TerritoryFeature[] }
  /** Features that the atlas `*` leaves out: by their name when they have no id or no geometry, by their code when they have no name */
  skippedFeatures: string[]
  /** Polygons without counterpart in the 50m topology, farther than 50 km from it and outside the bounds of their territory */
  leftOutPolygons: LeftOutPolygon[]
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

const NATURAL_EARTH_RESOLUTIONS: readonly NaturalEarthResolution[] = ['10m', '50m', '110m']

/** The resolution whose polygons the indices of the extraction rules count */
export const RULES_RESOLUTION: NaturalEarthResolution = '50m'

// A polygon of another resolution without counterpart at 50m stays with its territory up to this distance, in radians
const ATTACHMENT_DISTANCE = 50 / 6371

// Keeps the polygons and multipolygons, the geometries of a territory, and reads any other geometry as none
function toSourceFeatures(input: FeaturesInput): SourceFeature[] {
  const features: ReadonlyArray<FeatureInput> = Array.isArray(input) ? input : 'features' in input ? input.features : [input as FeatureInput]
  return features.map(({ id, properties, geometry }) => ({
    ...(id !== undefined && { id }),
    properties,
    geometry: geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon' ? geometry as AreaGeometry : null,
  }))
}

/**
 * Builds a Natural Earth source from the features of a topology of world-atlas 2.0.2, such as `topojson.feature(topology, topology.objects.countries)`.
 * At another resolution than 50m, an atlas with extraction rules also needs the features of the 50m topology in `ruleFeatures`.
 */
export function createNaturalEarthSource(features: FeaturesInput, resolution: string, ruleFeatures?: FeaturesInput): NaturalEarthSource {
  const known = NATURAL_EARTH_RESOLUTIONS.find(value => value === resolution)
  if (!known) {
    throw new TerritoryBuildError(`Unknown Natural Earth resolution "${resolution}"`, { unsupportedResolution: resolution })
  }
  return {
    kind: 'natural-earth',
    resolution: known,
    features: toSourceFeatures(features),
    ...(ruleFeatures && { ruleFeatures: toSourceFeatures(ruleFeatures) }),
  }
}

function localizedName(name: I18NInput, locale: string): string {
  return typeof name === 'string' ? name : (name[locale] ?? name.en)
}

function polygonsOf(geometry: AreaGeometry | null): Ring[][] {
  if (!geometry) {
    return []
  }
  return geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates]
}

function territoryFeature(territory: TerritoryInput, geometry: AreaGeometry, locale: string): TerritoryFeature {
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

function fitsInBounds(polygon: Ring[], bounds: TerritoryInput['bounds']): boolean {
  const ring = polygon[0]
  if (!ring || ring.length === 0) {
    return false
  }
  const tolerance = 0.1
  const longitudes = ring.map(([longitude]) => longitude!)
  const latitudes = ring.map(([, latitude]) => latitude!)
  const [minLon, minLat] = bounds[0]!
  const [maxLon, maxLat] = bounds[1]!
  return Math.min(...longitudes) >= minLon! - tolerance
    && Math.max(...longitudes) <= maxLon! + tolerance
    && Math.min(...latitudes) >= minLat! - tolerance
    && Math.max(...latitudes) <= maxLat! + tolerance
}

interface NaturalEarthCountry {
  name: string
  geometry: AreaGeometry
}

// One entry per Natural Earth id padded to three digits: the features that share an id, such as Australia and
// Ashmore and Cartier Islands for 036 at 10m and 50m, form one MultiPolygon with the name of the first
function gatherById(features: SourceFeature[]): { countries: Map<string, NaturalEarthCountry>, skippedFeatures: string[] } {
  const countries = new Map<string, NaturalEarthCountry>()
  const skippedFeatures: string[] = []

  for (const feature of features) {
    const name = String(feature.properties?.name ?? '')
    if (feature.id === undefined || feature.id === '' || !feature.geometry) {
      skippedFeatures.push(name)
      continue
    }
    const id = String(feature.id).padStart(3, '0')
    const existing = countries.get(id)
    countries.set(id, existing
      ? { name: existing.name || name, geometry: { type: 'MultiPolygon', coordinates: [...polygonsOf(existing.geometry), ...polygonsOf(feature.geometry)] } }
      : { name, geometry: feature.geometry })
  }

  return { countries, skippedFeatures }
}

function buildWorld(source: NaturalEarthSource): BuiltTerritories {
  const { countries, skippedFeatures } = gatherById(source.features)
  const features: TerritoryFeature[] = []

  for (const [id, country] of countries) {
    if (country.name === '') {
      skippedFeatures.push(`WD-${id}`)
      continue
    }
    features.push({
      type: 'Feature',
      id,
      properties: { id, code: `WD-${id}`, iso: '', name: country.name },
      geometry: rewindToD3(withoutFlatPolygons(country.geometry)),
    })
  }

  return { collection: { type: 'FeatureCollection', features }, skippedFeatures, leftOutPolygons: [] }
}

interface AssignedPolygon {
  polygon: Ring[]
  code: string
}

// The extraction rules of a parent applied to its polygons at 50m: by index, then by bounds, the rest to the parent
function assignByRules(
  parent: TerritoryInput,
  rules: ReadonlyArray<TerritoryInput>,
  polygons: Ring[][],
  outOfRangeIndices: Array<{ code: string, index: number }>,
): AssignedPolygon[] {
  const codeByIndex = new Map<number, string>()

  for (const rule of rules) {
    for (const index of rule.extraction?.polygonIndices ?? []) {
      if (index < 0 || index >= polygons.length) {
        outOfRangeIndices.push({ code: rule.code, index })
        continue
      }
      codeByIndex.set(index, rule.code)
    }
  }

  const boundsRules = rules.filter(rule => !rule.extraction?.polygonIndices)
  return polygons.map((polygon, index) => ({
    polygon,
    code: codeByIndex.get(index) ?? boundsRules.find(candidate => fitsInBounds(polygon, candidate.bounds))?.code ?? parent.code,
  }))
}

function asPolygon(coordinates: Ring[]) {
  return { type: 'Polygon' as const, coordinates }
}

/**
 * Gives each polygon of another resolution the territory of the 50m polygon that contains its centroid or, without one,
 * of the 50m polygon with the nearest vertex. A polygon without counterpart at 50m, farther than ATTACHMENT_DISTANCE
 * and outside the bounds of its territory, such as an islet that Natural Earth draws at 10m only, is left out.
 */
function attachToRules(
  parent: TerritoryInput,
  polygons: Ring[][],
  assigned: AssignedPolygon[],
  boundsOf: (code: string) => TerritoryInput['bounds'],
  leftOutPolygons: LeftOutPolygon[],
): AssignedPolygon[] {
  if (assigned.length === 0) {
    return polygons.map(polygon => ({ polygon, code: parent.code }))
  }
  return polygons.flatMap((polygon) => {
    const centroid = geoCentroid(asPolygon(polygon))
    const container = assigned.find(candidate => geoContains(asPolygon(candidate.polygon), centroid))
    if (container) {
      return [{ polygon, code: container.code }]
    }

    let nearest = assigned[0]!
    let distance = Infinity
    for (const candidate of assigned) {
      for (const vertex of candidate.polygon[0] ?? []) {
        const candidateDistance = geoDistance(centroid, vertex as [number, number])
        if (candidateDistance < distance) {
          distance = candidateDistance
          nearest = candidate
        }
      }
    }
    if (distance > ATTACHMENT_DISTANCE && !fitsInBounds(polygon, boundsOf(nearest.code))) {
      leftOutPolygons.push({ code: nearest.code, centroid })
      return []
    }
    return [{ polygon, code: nearest.code }]
  })
}

function buildFromNaturalEarth(
  territories: ReadonlyArray<TerritoryInput>,
  source: NaturalEarthSource,
  locale: string,
): { features: TerritoryFeature[], leftOutPolygons: LeftOutPolygon[] } {
  const hasRules = territories.some(territory => territory.extraction?.extractFrom)
  if (hasRules && source.resolution !== RULES_RESOLUTION && !source.ruleFeatures) {
    throw new TerritoryBuildError(
      `The extraction rules of this atlas count the polygons of the ${RULES_RESOLUTION} topology: give its features in ruleFeatures to build at ${source.resolution}`,
      { unsupportedResolution: source.resolution },
    )
  }
  const attaches = source.resolution !== RULES_RESOLUTION && source.ruleFeatures !== undefined

  const { countries } = gatherById(source.features)
  const ruleCountries = attaches ? gatherById(source.ruleFeatures!).countries : countries
  const pad = (id: string) => id.padStart(3, '0')
  const boundsOf = (code: string) => territories.find(territory => territory.code === code)!.bounds

  const result = new Map<string, TerritoryFeature>()
  const outOfRangeIndices: Array<{ code: string, index: number }> = []
  const leftOutPolygons: LeftOutPolygon[] = []

  for (const parent of territories) {
    const feature = countries.get(pad(parent.id))
    if (!feature?.geometry) {
      continue
    }
    const ruleGeometry = ruleCountries.get(pad(parent.id))?.geometry
    const rules = territories.filter(territory => territory.extraction?.extractFrom === parent.id)
    const appliesRules = rules.length > 0 && ruleGeometry?.type === 'MultiPolygon'
    if (!ruleGeometry || (!attaches && !appliesRules)) {
      result.set(parent.code, territoryFeature(parent, feature.geometry, locale))
      continue
    }

    const byRules = appliesRules
      ? assignByRules(parent, rules, polygonsOf(ruleGeometry), outOfRangeIndices)
      : polygonsOf(ruleGeometry).map(polygon => ({ polygon, code: parent.code }))
    // d3-geo reads a flat ring as the whole sphere, which would contain every centroid
    const assigned = attaches
      ? attachToRules(parent, polygonsOf(feature.geometry).filter(hasArea), byRules.filter(({ polygon }) => hasArea(polygon)), boundsOf, leftOutPolygons)
      : byRules
    const polygonsOfCode = (code: string) => assigned.filter(candidate => candidate.code === code).map(({ polygon }) => polygon)

    result.set(parent.code, territoryFeature(parent, { type: 'MultiPolygon', coordinates: polygonsOfCode(parent.code) }, locale))
    for (const rule of rules) {
      const rulePolygons = polygonsOfCode(rule.code)
      if (rulePolygons.length > 0) {
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
    throw new TerritoryBuildError('The extraction rules of this atlas do not match the topology', {
      ...(outOfRangeIndices.length > 0 && { outOfRangeIndices }),
      ...(missingDuplicateSources.length > 0 && { missingDuplicateSources }),
    })
  }

  return {
    features: [...result.values()].map(territory => ({ ...territory, geometry: rewindToD3(withoutFlatPolygons(territory.geometry)) })),
    leftOutPolygons,
  }
}

function buildFromCodes(territories: ReadonlyArray<TerritoryInput>, source: ByCodeSource, locale: string): TerritoryFeature[] {
  const byCode = new Map(territories.map(territory => [territory.code, territory]))
  const polygons = new Map<string, Ring[][]>()
  const unknownCodes = new Set<string>()
  const antimeridianRings = new Set<string>()

  for (const feature of toSourceFeatures(source.features)) {
    const code = String(feature.properties?.code ?? '')
    if (!byCode.has(code)) {
      unknownCodes.add(code)
      continue
    }
    if (!feature.geometry) {
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
      ...(unknownCodes.size > 0 && { unknownCodes: [...unknownCodes] }),
      ...(antimeridianRings.size > 0 && { antimeridianRings: [...antimeridianRings] }),
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
  config: AtlasTerritoriesInput,
  source: TerritorySource,
  { locale = 'en' }: { locale?: string } = {},
): BuiltTerritories {
  if (typeof config.territories === 'string') {
    if (config.territories !== '*') {
      throw new Error(`The territories of an atlas are a list or "*", not "${config.territories}"`)
    }
    if (source.kind === 'by-code') {
      throw new TerritoryBuildError('An atlas of every country reads a Natural Earth source', { byCodeOnWildcard: true })
    }
    return buildWorld(source)
  }

  const territories = config.territories
  const { features, leftOutPolygons } = source.kind === 'natural-earth'
    ? buildFromNaturalEarth(territories, source, locale)
    : { features: buildFromCodes(territories, source, locale), leftOutPolygons: [] }

  const built = new Set(features.map(feature => feature.properties.code))
  const missingCodes = territories.map(territory => territory.code).filter(code => !built.has(code))
  if (missingCodes.length > 0) {
    throw new TerritoryBuildError(`No feature for ${missingCodes.join(', ')}`, { missingCodes })
  }

  return { collection: { type: 'FeatureCollection', features }, skippedFeatures: [], leftOutPolygons }
}
