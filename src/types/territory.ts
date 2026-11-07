/**
 * Territory Type Definitions
 *
 * Domain: Territory representation for rendering
 * Scope: Frontend runtime types for map territories
 */

import type { TerritoryCode } from './branded'

type Coordinates = [number, number]

type BoundingBox = [Coordinates, Coordinates]

// Offset of a territory in the composition, in pixels
export interface Translation {
  x: number
  y: number
}

export interface TerritoryConfig {
  code: TerritoryCode
  name: string
  shortName?: string
  region?: string
  center: Coordinates
  bounds: BoundingBox
}

export interface TerritoryCollection {
  id: string
  label: string
  codes: string[] | '*'
  exclude?: string[]
}

interface TerritoryCollectionSet {
  label: string
  selectionType: 'incremental' | 'mutually-exclusive'
  description?: string
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
