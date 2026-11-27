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
}

// An element of the territories of a composite file; its parameters stay in the parameter store, under its code
export interface CompositionEntry {
  code: TerritoryCode
  name: I18nValue
  bounds?: BoundingBox
}

// The entries of the custom composite, with the name that the export writes, read at each build of the composite in their order
export interface EntryProvider {
  getEntries: () => readonly CompositionEntry[]
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
