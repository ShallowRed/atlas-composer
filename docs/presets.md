# Presets

A preset is a file `configs/presets/<atlas>/<id>.json` declared in the `presets` list of its atlas in `configs/atlas-registry.json`. The view modes of an atlas are the types of its presets, as [atlases.md](atlases.md) describes.

## Preset types

The application reads a file according to the `type` of its entry in the registry.

- `composite-custom` gives one projection and one layout per territory. The file follows the format of `@atlas-composer/specification`: `packages/specification/schemas/` defines it, and `packages/specification/__tests__/fixtures/valid/minimal.json` is a complete example. The application exports this type, and `@atlas-composer/projection-loader` reads it.
- `unified` gives one projection and its parameters for the whole atlas.
- `split` gives one projection and its parameters per territory.
- `built-in-composite` names a definition with the `D3_COMPOSITE` strategy in `projectionId`. `applyViewPresetConfig` of `src/stores/view.ts` logs `globalScale` and leaves the scale of the map as it is.

The last three types have a `config` field. `configs/schemas/preset-<type>.schema.json` gives the form of the file, and `pnpm geodata:validate --all` validates each file against it.

## Declaration

An entry of the registry gives the `id`, the `name`, the `type` and the `configPath` of the preset. `pnpm geodata:validate --all` compares the entries with the files, as [scripts.md](scripts.md) describes.

## Loading

`PresetLoader.loadPreset`, in `src/services/presets/preset-loader.ts`, takes the atlas id from the text before the first hyphen of the preset id, finds the entry with `getPresetById` and reads the file with `JsonFileLoader`. It returns a `Result`, with `PRESET_UNKNOWN` for an id missing from the registry and `PRESET_INVALID` with the list of issues for a file that the validation refuses.

`validateCompositePreset`, in `src/core/presets/validator.ts`, calls `validateConfig`, then checks each territory. The projection is known to `projectionRegistry`, each required parameter that is relevant for the family is present, and `rotate` or `center` is present. A value outside the bounds of the [parameter registry](projections.md#parameter-registry) produces a warning in the `ac:presets:validator` log, and the preset loads. `validateViewPreset` checks the other types.

The stores apply a loaded preset. `initializeAtlas` of `src/stores/composition.ts` loads the default preset of the view mode, and `loadPreset` of the same store loads a composite preset that the user selects. Both pass a `composite-custom` file through `compositionStateFromConfig`, in `src/core/presets/composition-state.ts`, which gives the territory parameters that `extractTerritoryParameters` reads, the territories of the file and its canvas. `loadViewPreset` of `src/stores/view.ts` applies a preset of the three other types.

## Reference scale

`referenceScale`, at the root of a `composite-custom` file, is the default scale of the composite. `CompositeProjection` gives each territory the scale `referenceScale * scaleMultiplier`. `translateOffset` and `pixelClipExtent` are in pixels at this scale, for a canvas of size `canvasDimensions`. [d3-to-atlas-parameter-mapping.md](d3-to-atlas-parameter-mapping.md) gives the formulas from a d3 composite.

`GlobalProjectionControls` edits `referenceScale` in the projection store, and the export writes the current value. `ProjectionLoader` multiplies `referenceScale` by the smaller of the two ratios between the requested size and `canvasDimensions`.

## Creating a preset from an export

1. In the application, choose the atlas and the `composite-custom` view, then adjust the territories.
2. Download the JSON file from `CompositeExportDialog`. [export.md](export.md) describes the export.
3. Save the file as `configs/presets/<atlas>/<id>.json`, with an id that starts with the atlas id.
4. Add an entry with the type `composite-custom` to the `presets` list of the atlas in `configs/atlas-registry.json`.
5. Run `pnpm geodata:validate --all`.
6. Add a changeset for `@atlas-composer/preset-library`, as [development.md](development.md) describes.

`src/__tests__/export-validity.spec.ts` and `src/__tests__/roundtrip-loader.spec.ts` read each `composite-custom` preset of the registry. A new default preset changes the rendering of the atlas: [development.md](development.md) describes the regeneration of the references of `src/__tests__/view-rendering.spec.ts`.

## Preset library

`@atlas-composer/preset-library` publishes the presets and a catalog of them. `packages/preset-library/src/index.ts` imports `configs/atlas-registry.json` and builds `catalog` from its entries, with the English name of each preset and the tag `default` for the entry with `isDefault`.

The public directory option in `packages/preset-library/tsup.config.ts` copies `configs/presets/` into the `dist` folder of the package, and the `exports` field of `packages/preset-library/package.json` gives access to each file, such as `@atlas-composer/preset-library/france/france-standard`. `getPreset` returns the content of a `composite-custom` preset. [packages/preset-library/README.md](../packages/preset-library/README.md) describes the use of the package.
