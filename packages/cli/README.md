# @atlas-composer/cli

> Command that writes the territories of an Atlas Composer atlas as GeoJSON, for GIS and tile tools.

The `atlas-composer` command reads the atlases and the presets of `@atlas-composer/preset-library` and the countries of Natural Earth from `world-atlas`.

## Installation

```bash
npm install @atlas-composer/cli
```

## Territories of an atlas

```bash
npx atlas-composer territories france > france.geojson
```

`territories <atlas>` writes to the standard output a GeoJSON `FeatureCollection` with one feature per territory of the atlas, in longitudes and latitudes. Each feature has the `id`, the `code`, the `name` and the `iso` of its territory in `properties`. The rings follow RFC 7946: exterior rings counterclockwise, and a ring that crosses the antimeridian cut in two. At `50m`, GEOS reads each geometry as valid; at `10m` and `110m`, some rings of Natural Earth cross themselves and GEOS reads their geometries as invalid: `ogr2ogr -makevalid` repairs them.

- `--resolution 10m|50m|110m` chooses the Natural Earth resolution, `50m` by default. An atlas with extraction rules, which count the polygons of a country in the `50m` topology, refuses another resolution.
- `--data <file>` reads the geometries from a JSON file of GeoJSON features, each with the code of a territory of the atlas in `properties.code`, in place of Natural Earth.

## Territories placed in a composite projection

```bash
npx atlas-composer compose france-standard --out france-standard.geojson
```

`compose <preset>` places each territory as the `composite-custom` preset draws it, with the overseas territories next to the mainland, and writes two files:

- `france-standard.geojson`, a GeoJSON `FeatureCollection` of the placed territories;
- `france-standard.geojson.json`, with the `canvasDimensions` and the `referenceScale` of the composition, the codes of the territories that the preset leaves out in `skippedCodes`, and the codes of the territories that their frame clips entirely in `emptyCodes`.

`compose <file.json>` reads a configuration exported from the Atlas Composer app, for the atlas that its `metadata.atlasId` names. `--data <file>` reads the geometries as for `territories`; without it, `compose` reads Natural Earth at `50m`.

### Coordinates of the composed file

The coordinates of the composed file are longitudes and latitudes that draw the composition in Web Mercator: display the file in EPSG:3857, or reproject it from EPSG:4326 to EPSG:3857. The longer side of the canvas spans the 360° of longitude, and the center of the canvas is at longitude 0 and latitude 0. A longitude of the file is a position in the composition, unrelated to the longitude of the territory on the globe.

The file is for GIS and tile tools, such as QGIS, GDAL, tippecanoe or MapLibre. d3-geo joins two vertices by a great-circle arc and reads the orientation of RFC 7946 as an inverted territory: with d3, load the preset with `@atlas-composer/projection-loader`.

### One territory per code

`compose` projects each territory through the sub-projection of its code, clipped to its frame and to the canvas. The Atlas Composer app draws each territory through every sub-projection. Two differences follow:

- a territory that the preset leaves out is missing from the composed file, where the app can draw it in the frame of another territory: US-ALEU, US-VI and US-MP in `usa-pseudo-d3cp`;
- a territory in the frame of another one is in the composed file once, in its own frame: FR-MF and FR-BL in `france-proportional`.

## API

```typescript
import { composeTerritories, naturalEarthSource } from '@atlas-composer/cli'
import { buildTerritories, getPreset } from '@atlas-composer/preset-library'
import atlas from '@atlas-composer/preset-library/atlases/france' with { type: 'json' }
import { ProjectionLoader } from '@atlas-composer/projection-loader'
import { d3ProjectionFactories } from '@atlas-composer/projection-loader/helpers'

const loader = new ProjectionLoader()
loader.registerAll(d3ProjectionFactories)

const { collection: territories } = buildTerritories(atlas, naturalEarthSource('50m'))
const config = await getPreset('france-standard')
if (!config) {
  throw new Error('Unknown preset')
}
const { collection, skippedCodes, emptyCodes } = composeTerritories(loader, config, territories)
```

`naturalEarthSource(resolution)` reads the countries of `world-atlas` as a source of `buildTerritories`. `composeTerritories(loader, config, territories)` returns the composed collection with `canvasDimensions`, `referenceScale`, `skippedCodes` and `emptyCodes`.

## License

MIT
