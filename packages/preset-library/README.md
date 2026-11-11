# @atlas-composer/preset-library

> Composite map presets of Atlas Composer.

This package publishes the presets of the Atlas Composer app, such as France with its overseas territories or the USA with Alaska and Hawaii, and a catalog that describes them. A `composite-custom` preset is a configuration of `@atlas-composer/specification`, which `@atlas-composer/projection-loader` turns into a d3 projection.

## Installation

```bash
npm install @atlas-composer/preset-library @atlas-composer/projection-loader d3-geo
```

## Usage

```typescript
import { getPreset } from '@atlas-composer/preset-library'
import { ProjectionLoader } from '@atlas-composer/projection-loader'
import { d3ProjectionFactories } from '@atlas-composer/projection-loader/helpers'
import * as d3 from 'd3-geo'

const loader = new ProjectionLoader()
loader.registerAll(d3ProjectionFactories)

const config = await getPreset('france-standard')

if (config) {
  const projection = loader.load(config, { width: 800, height: 600 })
  const path = d3.geoPath(projection)
}
```

`loader.load` validates the configuration and throws a `ConfigValidationError` for a configuration that the format refuses. `validateConfig` of the loader returns `{ valid, errors, warnings }` without throwing.

`listPresets()` returns the `composite-custom` presets, and `listPresets({ includeViewModes: true })` returns every preset:

```typescript
import { listPresets } from '@atlas-composer/preset-library'

for (const preset of listPresets({ atlasId: 'france' }))
  console.log(preset.id, preset.name)
```

Each preset file is also published by its path, `@atlas-composer/preset-library/<atlas>/<identifier>`:

```typescript
import config from '@atlas-composer/preset-library/france/france-standard' with { type: 'json' }
```

## Catalog

`catalog.presets` has an entry for each preset, keyed by its identifier. An entry has:

- `id`, the identifier of the preset, such as `france-standard`;
- `name` and `description`, in English;
- `atlasId` and `region`, the identifier of the atlas, such as `france`;
- `type`: `composite-custom`, `built-in-composite`, `split` or `unified`;
- `tags`: `['default']` for the default preset of the atlas, `[]` for the others.

`catalog.version` is the version of the package.

The `built-in-composite`, `split` and `unified` presets describe the views of the Atlas Composer app. `getPreset` loads a `composite-custom` preset, and returns `undefined` for the other types.

## Atlases

Each atlas of the app is published by its path, `@atlas-composer/preset-library/atlases/<atlas>`, with its schema at `@atlas-composer/preset-library/schemas/atlas.schema`. An atlas configuration names the territories, their codes, bounds and centers, the rules that cut them out of Natural Earth, and the territory collections. `dataSources` names the files that the app loads.

`buildTerritories(config, source)` builds one GeoJSON feature per territory of an atlas:

```typescript
import { buildTerritories, createNaturalEarthSource } from '@atlas-composer/preset-library'
import config from '@atlas-composer/preset-library/atlases/france' with { type: 'json' }
import { feature } from 'topojson-client'
import topology from 'world-atlas/countries-50m.json' with { type: 'json' }

const source = createNaturalEarthSource(feature(topology, topology.objects.countries).features, '50m')
const { collection } = buildTerritories(config, source)
```

- A Natural Earth source goes through the extraction rules of the atlas. The polygon indices of these rules count the polygons of `countries-50m.json` of `world-atlas` 2.0.2: an atlas with rules refuses another resolution, and another version of `world-atlas` cuts the territories at the wrong polygons. An atlas of every country, such as `world`, reads any resolution and names its territories `WD-<id>`.
- A source `{ kind: 'by-code', features }` takes features that carry the code of a territory in `properties.code`, such as `FR-GF`, and gathers them by code.
- The rings of the features follow the order that d3-geo reads, exterior rings clockwise. `rewindToRfc7946` orients a planar geometry as RFC 7946 asks.
- `buildTerritories` throws a `TerritoryBuildError` whose `issues` name the missing or unknown codes, the indices out of range, the rings that cross the antimeridian and the refused resolution.

## API

- `getPreset(id)` - Load the configuration of a `composite-custom` preset
- `getPresetMetadata(id)` - Get the catalog entry of a preset
- `getPresetPath(id)` - Get the path of the preset file, such as `france/france-standard.json`
- `getAllPresets()` - Get every catalog entry
- `listPresets(options)` - Filter the presets by `atlasId`, `type`, `region` and `tags`; `includeViewModes` adds the `built-in-composite`, `split` and `unified` presets
- `getPresetsForAtlas(atlasId)` - List the `composite-custom` presets of an atlas
- `getDefaultPreset(atlasId)` - Get the `composite-custom` preset tagged `default` of an atlas, else its first `composite-custom` preset
- `listCompositePresets()` - List the `composite-custom` presets
- `listViewModePresets()` - List the `built-in-composite`, `split` and `unified` presets
- `buildTerritories(config, source)` - Build one feature per territory of an atlas
- `createNaturalEarthSource(features, resolution)` - Build a source from the features of a Natural Earth topology
- `listAtlases()` - List the atlas identifiers, in alphabetical order
- `listRegions()` - List the atlas identifiers, in the order of the registry of the Atlas Composer app, [`configs/atlas-registry.json`](https://github.com/ShallowRed/atlas-composer/blob/main/configs/atlas-registry.json)
- `listTypes()` - List the preset types
- `isViewModeType(type)` - Check if a type is `built-in-composite`, `split` or `unified`

## License

MIT © [ShallowRed](https://github.com/ShallowRed)
