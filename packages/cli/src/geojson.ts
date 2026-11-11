import type { AreaGeometry, Position, TerritoryFeature } from '@atlas-composer/preset-library'

/** A territory as the command writes it: the identifier of the built territory stays in `properties.id`, since a tile tool reads a number in an `id` member */
export interface GeoJsonTerritory {
  type: 'Feature'
  properties: TerritoryFeature['properties']
  geometry: AreaGeometry
}

export interface GeoJsonTerritories {
  type: 'FeatureCollection'
  features: GeoJsonTerritory[]
}

export function mapPositions(geometry: AreaGeometry, convert: (position: Position) => Position): AreaGeometry {
  return geometry.type === 'Polygon'
    ? { type: 'Polygon', coordinates: geometry.coordinates.map(ring => ring.map(convert)) }
    : { type: 'MultiPolygon', coordinates: geometry.coordinates.map(polygon => polygon.map(ring => ring.map(convert))) }
}
