interface RasterSourceDefinition {
  kind: 'raster'
  // Template of a Web Mercator tile, with {z}, {x} and {y}
  tiles: string
  tileSize: number
  maxZoom: number
  attribution: string
}

interface VectorSourceDefinition {
  kind: 'vector'
  // TileJSON whose tiles[0] is the current template of the OpenMapTiles tiles
  tileJson: string
  tileSize: number
  maxZoom: number
  attribution: string
}

export type BasemapSourceDefinition = RasterSourceDefinition | VectorSourceDefinition

export const BASEMAP_SOURCE_DEFINITIONS = {
  relief: {
    kind: 'raster',
    tiles: 'https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png',
    tileSize: 256,
    maxZoom: 6,
    attribution: 'Natural Earth, OpenFreeMap',
  },
  imagery: {
    kind: 'raster',
    tiles: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg',
    tileSize: 256,
    maxZoom: 13,
    attribution: 'Sentinel-2 cloudless 2016 by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)',
  },
  streets: {
    kind: 'vector',
    tileJson: 'https://tiles.openfreemap.org/planet',
    tileSize: 512,
    maxZoom: 10,
    attribution: 'OpenFreeMap © OpenMapTiles, © OpenStreetMap contributors',
  },
} as const satisfies Record<string, BasemapSourceDefinition>

export type BasemapSource = 'none' | keyof typeof BASEMAP_SOURCE_DEFINITIONS

export const BASEMAP_SOURCES = ['none', ...Object.keys(BASEMAP_SOURCE_DEFINITIONS)] as BasemapSource[]
