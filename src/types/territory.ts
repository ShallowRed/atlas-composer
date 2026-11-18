/**
 * Territory Type Definitions
 *
 * Domain: Territory representation for rendering
 * Scope: Frontend runtime types for map territories
 */

import type { I18nValue } from '#types'
import type { TerritoryCode } from './branded'

type Coordinates = [number, number]

type BoundingBox = [Coordinates, Coordinates]

// Codes of the territories checked in the custom composite, read at each build of the composite
export interface ActiveTerritoryProvider {
  getActiveTerritoryCodes: () => ReadonlySet<TerritoryCode>
  // A territory drawn at its geographic position has no frame: its bounds neither clip it nor outline it
  isUnframed?: (territoryCode: TerritoryCode) => boolean
}

// Offset of a territory in the composition, in pixels
export interface Translation {
  x: number
  y: number
}

export interface TerritoryConfig {
  code: TerritoryCode
  name: I18nValue
  center: Coordinates
  bounds: BoundingBox
}

export interface TerritoryCollection {
  id: string
  label: I18nValue
  codes: string[] | '*'
  exclude?: string[]
}

interface TerritoryCollectionSet {
  label: I18nValue
  selectionType: 'incremental' | 'mutually-exclusive'
  description?: I18nValue
  collections: TerritoryCollection[]
}

export type TerritoryCollections = Record<string, TerritoryCollectionSet>

export interface Territory {
  name: string
  code: TerritoryCode
  area: number
  region: string
  data: GeoJSON.FeatureCollection
}
