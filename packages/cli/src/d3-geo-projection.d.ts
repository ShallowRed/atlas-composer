declare module 'd3-geo-projection' {
  import type { AreaGeometry } from '@atlas-composer/preset-library'
  import type { GeoStream } from 'd3-geo'

  interface StreamProjection { stream: (output: GeoStream) => GeoStream }

  /** Projects a feature to planar coordinates and assembles the rings into polygons, or into a null geometry when nothing is left */
  export function geoProject<Feature extends { type: 'Feature', geometry: AreaGeometry }>(
    feature: Feature,
    projection: StreamProjection,
  ): Omit<Feature, 'geometry'> & { geometry: AreaGeometry | null }
  export function geoProject<Collection extends { type: 'FeatureCollection', features: ReadonlyArray<{ geometry: AreaGeometry }> }>(
    collection: Collection,
    projection: StreamProjection,
  ): Collection
}
