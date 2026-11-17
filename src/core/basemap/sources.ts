interface RasterSourceDefinition {
  kind: 'raster'
  // Template of a Web Mercator tile, with {z}, {x} and {y}
  tiles: string
  tileSize: number
  maxZoom: number
  attribution: string
  // The first words of a long attribution, which the map shows folded
  attributionSummary?: string
  // Terrarium: the altitude of each pixel in its red, green and blue, shaded in the browser
  encoding?: 'terrarium'
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
    tiles: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
    tileSize: 256,
    maxZoom: 12,
    encoding: 'terrarium',
    attributionSummary: 'Terrain Tiles on AWS',
    attribution: 'Terrain Tiles on AWS: USGS 3DEP, SRTM and GMTED2010; NOAA ETOPO1; Copernicus EU-DEM; ©\u00A0Kartverket; ©\u00A0LINZ, Crown copyright; ©\u00A0Commonwealth of Australia (Geoscience Australia); Open Government Licence – Canada; INEGI; ©\u00A0offene Daten Österreichs (DGM Österreich); ©\u00A0Environment Agency; ArcticDEM (NSF, DigitalGlobe)',
  },
  imagery: {
    kind: 'raster',
    tiles: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg',
    tileSize: 256,
    maxZoom: 13,
    attribution: 'EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)',
  },
  streets: {
    kind: 'vector',
    tileJson: 'https://tiles.openfreemap.org/planet',
    tileSize: 512,
    maxZoom: 10,
    attribution: 'OpenFreeMap ©\u00A0OpenMapTiles, ©\u00A0OpenStreetMap contributors',
  },
} as const satisfies Record<string, BasemapSourceDefinition>

export type BasemapSource = 'none' | keyof typeof BASEMAP_SOURCE_DEFINITIONS

export const BASEMAP_SOURCES = ['none', ...Object.keys(BASEMAP_SOURCE_DEFINITIONS)] as BasemapSource[]
