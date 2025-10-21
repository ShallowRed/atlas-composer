/**
 * GeoJSON Type Definitions
 * Common types used across scripts and frontend for geographic data
 *
 * Provides basic GeoJSON type definitions. More specialized types
 * should use @types/geojson if needed.
 */

export interface GeoJSONProperties {
  [key: string]: any
}

export interface GeoJSONGeometry {
  type: string
  coordinates: any
}

export interface GeoJSONFeature {
  type: 'Feature'
  id?: string | number
  properties: GeoJSONProperties
  geometry: GeoJSONGeometry
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}
