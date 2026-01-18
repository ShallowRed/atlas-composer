/**
 * Territory Type Definitions
 *
 * Domain: Territory representation for rendering
 * Scope: Frontend runtime types for map territories
 */

import type { TerritoryCode } from './branded'

export type Coordinates = [number, number]

export type BoundingBox = [Coordinates, Coordinates]

export type PixelOffset = [number, number]

export type ProjectionRotation = [number, number, number?]

export type ConicParallels = [number, number]

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

export interface TerritoryCollectionSet {
  label: string
  selectionType: 'incremental' | 'mutually-exclusive'
  description?: string
  collections: TerritoryCollection[]
}

export type TerritoryCollections = Record<string, TerritoryCollectionSet>
