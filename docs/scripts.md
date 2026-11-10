# Geographic data scripts

`scripts/prepare-geodata.ts` builds the geographic files of an atlas from Natural Earth, and `scripts/validate-configs.ts` compares the configurations with these files. `scripts/config/` holds the code they share to read the registry and the atlas configurations. Each script prints its arguments with `--help`, and `package.json` gives the commands.

## Preparing the data of an atlas

`pnpm geodata:prepare <atlas>` finds the atlas in `configs/atlas-registry.json` and reads its configuration. The script stops when the configuration does not match `configs/schemas/atlas.schema.json`. `createBackendConfig` in `scripts/config/adapter.ts` then reduces the configuration to the territories and their rules, with each name in English.

The script downloads the Natural Earth topology of the `world-atlas` package from jsDelivr at each run. The resolution comes from `--resolution`, then from the `NE_RESOLUTION` environment variable, and is 50m by default. An atlas uses the resolution written in the file names of its `dataSources`.

The script writes three files in `src/public/data/`, a folder that git ignores. With the 50m resolution, these files are:

- `src/public/data/world-countries-50m.json`, the downloaded topology.
- `src/public/data/<atlas>-territories-50m.json`, a GeoJSON feature collection with one feature per territory.
- `src/public/data/<atlas>-metadata-50m.json`, the description of the atlas and of its territory rules.

The script keeps each Natural Earth feature whose id equals the `id` of a territory, and it also accepts this `id` padded to three digits. A feature takes its `name`, `code` and `iso` from the configuration. A territory whose `id` matches no feature and has no rule below is missing from the output, and the validation reports it.

When `territories` is `*`, the script keeps every feature, pads its id to three digits and applies no rule. `configs/atlases/world.json` is this case.

## Territory extraction rules

The `extraction` field of a territory describes how the script cuts the territory out of a Natural Earth feature. `configs/schemas/atlas.schema.json` declares `extractFrom`, `polygonIndices` and `duplicateFrom`. `configs/atlases/portugal.json` has examples of indices, and `configs/atlases/france.json` an example of `duplicateFrom`.

`extractFrom` names the parent, a territory of the same atlas whose `id` is a Natural Earth id. The adapter parses this value as an integer, so write the `id` of a parent without leading zeros. The parent feature has a `MultiPolygon` geometry, and the script leaves any other geometry whole.

A territory with `extractFrom` takes its polygons in one of two ways:

- With `polygonIndices`, the territory takes the polygons at these positions of the parent, counted from zero. The script logs a warning for an index out of range.
- Without `polygonIndices`, the territory takes each polygon that fits inside its `bounds`. The script compares the bounding box of the first ring of the polygon with this box, with a tolerance of 0.1 degree. A polygon goes to the first territory of the configuration whose box contains it.

The script applies the indices first, and the boxes to the polygons that remain. The parent keeps every polygon that no rule takes. The script reads `polygonIndices` on a territory that has `extractFrom`, and ignores it on any other territory.

`duplicateFrom` copies the geometry of a feature into a new territory with its own `id`, `name`, `code` and `iso`. The script runs the duplication after the extraction, so the source can be an extracted territory. The script looks for the source by feature id and by `code`, and logs a warning when it finds none.

## Finding the ids and the polygon indices

`pnpm geodata:lookup` finds a country by name or by id and prints its Natural Earth id and the shape of its geometry. `pnpm geodata:analyze` takes this id and lists the polygons by decreasing area, each with its index, bounds and center, then suggests groups of nearby polygons. Polygon indices differ between resolutions, so pass the resolution of the atlas with `--resolution=`.

## Validating the configurations

`pnpm geodata:validate <atlas>` checks one atlas, and `pnpm geodata:validate --all` checks every atlas of the registry. `pnpm check` runs the second command.

For each atlas, the script checks the following points:

- The configuration matches `configs/schemas/atlas.schema.json`.
- The atlas has exactly one preset with `isDefault`.
- Each preset has an id that starts with the atlas id, and is stored at `configs/presets/<atlas>/<id>.json`.
- A preset of type `composite-custom` passes `validateConfig` of `@atlas-composer/specification`, and the `id` of any other preset equals its id in the registry.
- At each resolution present in `src/public/data/`, each territory `code` has a feature in the generated data. A feature without a territory in the configuration produces a warning.

An atlas without generated data produces a warning, so the check runs on a fresh clone. The `--all` option adds two checks of the whole repository: the registry matches `configs/schemas/atlas-registry.schema.json`, and the registry declares each JSON file of `configs/presets/` once.

The registry and the presets of an atlas are described in [atlases.md](atlases.md) and [presets.md](presets.md).
