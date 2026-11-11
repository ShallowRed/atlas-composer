# Geographic data scripts

`scripts/prepare-geodata.ts` builds the geographic files of an atlas from Natural Earth, and `scripts/validate-configs.ts` compares the configurations with these files. The territories come from `buildTerritories` of `packages/preset-library/src/territories.ts`, which the package `@atlas-composer/preset-library` publishes too. `scripts/config/` holds the code they share to read the registry and the atlas configurations. Each script prints its arguments with `--help`, and `package.json` gives the commands.

## Preparing the data of an atlas

`pnpm geodata:prepare <atlas>` finds the atlas in `configs/atlas-registry.json` and reads its configuration. The script stops when the configuration does not match `configs/schemas/atlas.schema.json`. `prepareAtlasData` in `scripts/geodata/prepare.ts` builds the territories with `buildTerritories`, with each name in English, and the metadata with `createBackendConfig` of `scripts/config/adapter.ts`.

The script reads the Natural Earth topology of `world-atlas` 2.0.2, a development dependency of the repository, in `node_modules`. The resolution comes from `--resolution`, then from the `NE_RESOLUTION` environment variable, and is 50m by default. An atlas uses the resolution written in the file names of its `dataSources`. `buildTerritories` refuses another resolution than 50m for an atlas with extraction rules, since its polygon indices count the polygons of the 50m topology.

The script writes three files in `src/public/data/`, a folder that git ignores. With the 50m resolution, these files are:

- `src/public/data/world-countries-50m.json`, the topology that the script reads.
- `src/public/data/<atlas>-territories-50m.json`, a GeoJSON feature collection with one feature per territory.
- `src/public/data/<atlas>-metadata-50m.json`, the description of the atlas and of its territory rules.

The script gathers the Natural Earth features of each id, padded to three digits, into one geometry, and a territory takes the features whose id equals its `id` padded to three digits. A feature takes its `name`, `code` and `iso` from the configuration. The script stops with a `TerritoryBuildError` that names each territory without a feature.

When `territories` is `*`, each Natural Earth id gives one territory with its id padded to three digits, the code `WD-<id>` and the name of its first feature, and no rule applies. Features without an id or a geometry, and ids without a name, are left out and named in a warning. `configs/atlases/world.json` is this case.

The territories follow the order of the rings that d3-geo reads, exterior rings clockwise. `buildTerritories` drops a polygon whose exterior ring has a planar area below 1e-12 square degree, a line of aligned points that d3-geo can read as the whole sphere, unless the territory has no other polygon.

## Territory extraction rules

The `extraction` field of a territory describes how the script cuts the territory out of a Natural Earth feature. `configs/schemas/atlas.schema.json` declares `extractFrom`, `polygonIndices` and `duplicateFrom`. `configs/atlases/portugal.json` has examples of indices, and `configs/atlases/france.json` an example of `duplicateFrom`.

`extractFrom` names the parent, a territory of the same atlas, by its `id`. The parent feature has a `MultiPolygon` geometry, and the script leaves any other geometry whole.

A territory with `extractFrom` takes its polygons in one of two ways:

- With `polygonIndices`, the territory takes the polygons at these positions of the parent, counted from zero. An index out of range stops the script with a `TerritoryBuildError`.
- Without `polygonIndices`, the territory takes each polygon that fits inside its `bounds`. The script compares the bounding box of the first ring of the polygon with this box, with a tolerance of 0.1 degree. A polygon goes to the first territory of the configuration whose box contains it, in the order of `territories`.

The script applies the indices first, and the boxes to the polygons that remain. The parent keeps every polygon that no rule takes. The script reads `polygonIndices` on a territory that has `extractFrom`, and ignores it on any other territory.

`duplicateFrom` copies the geometry of a feature into a new territory with its own `id`, `name`, `code` and `iso`. The script runs the duplication after the extraction, so the source can be an extracted territory. The script looks for the source by the `id` and the `code` of a built territory, and stops with a `TerritoryBuildError` when it finds none.

## Finding the ids and the polygon indices

`pnpm geodata:lookup` finds a country by name or by id and prints its Natural Earth id and the shape of its geometry. `pnpm geodata:analyze` takes this id and lists the polygons by decreasing area, each with its index, bounds and center, then suggests groups of nearby polygons. Polygon indices differ between resolutions, so pass the resolution of the atlas with `--resolution=`.

## Validating the configurations

`pnpm geodata:validate <atlas>` checks one atlas, and `pnpm geodata:validate --all` checks every atlas of the registry. `pnpm check` runs the second command.

For each atlas, the script checks the following points:

- The configuration matches `configs/schemas/atlas.schema.json`.
- The atlas has exactly one preset with `isDefault`.
- Each preset has an id that starts with the atlas id, and is stored at `configs/presets/<atlas>/<id>.json`.
- A preset of type `composite-custom` passes `validateConfig` of `@atlas-composer/specification`. Any other preset matches `configs/schemas/preset-<type>.schema.json`, and its `id` equals its id in the registry.
- At each resolution present in `src/public/data/`, each territory `code` has a feature in the generated data. A feature without a territory in the configuration produces a warning.

An atlas without generated data produces a warning, so the check runs on a fresh clone. The `--all` option adds two checks of the whole repository: the registry matches `configs/schemas/atlas-registry.schema.json`, and the registry declares each JSON file of `configs/presets/` once.

The registry and the presets of an atlas are described in [atlases.md](atlases.md) and [presets.md](presets.md).
