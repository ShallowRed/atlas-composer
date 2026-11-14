# @atlas-composer/preset-library

## 2.4.0

### Minor Changes

- f234c61: Add the presets of the New Zealand atlas: `new-zealand-standard`, a `composite-custom` preset in the transverse Mercator projection with the Chatham Islands in an inset, and the view presets `new-zealand-split` and `new-zealand-unified`.
- 4ab0197: Add the presets of the Norway atlas: `norway-standard`, a `composite-custom` preset in the transverse Mercator projection with Svalbard in an inset, and the view presets `norway-split` and `norway-unified`.
- a84803d: Add the presets of the South Africa atlas: `south-africa-standard`, a `composite-custom` preset in the Albers equal-area conic projection with the Prince Edward Islands in an inset, and the view presets `south-africa-split` and `south-africa-unified`.

### Patch Changes

- e68fcc9: The `japan-standard` preset leaves out the center of its conic territories, which keep the center of the d3 factory.

## 2.3.0

### Minor Changes

- eeac409: Add the presets of the Chile atlas: `chile-standard`, a `composite-custom` preset that reproduces the mainland, Juan Fernández and Easter Island frames of `geoTransverseMercatorChile` of d3-composite-projections, and the view presets `chile-builtin`, `chile-split` and `chile-unified`.
- 2280a18: Add the presets of the Ecuador atlas: `ecuador-standard`, a `composite-custom` preset that reproduces `geoMercatorEcuador` of d3-composite-projections, and the view presets `ecuador-builtin`, `ecuador-split` and `ecuador-unified`.
- e31705f: Add the presets of the Japan atlas: `japan-standard`, a `composite-custom` preset that reproduces `geoConicEquidistantJapan` of d3-composite-projections, and the view presets `japan-builtin`, `japan-split` and `japan-unified`.
- 32f6237: Add the presets of the Malaysia atlas: `malaysia-standard`, a `composite-custom` preset that reproduces `geoMercatorMalaysia` of d3-composite-projections, and the view presets `malaysia-builtin`, `malaysia-split` and `malaysia-unified`.

## 2.2.1

### Patch Changes

- dc853fb: Give Saint-Barthélemy the projection center of Saint-Martin in `france-proportional`, where the two territories share one frame, so that the two islands keep their relative places in this frame.

## 2.2.0

### Minor Changes

- a1f4979: Publish the configuration of each atlas at `@atlas-composer/preset-library/atlases/<atlas>`, with its schema at `@atlas-composer/preset-library/schemas/atlas.schema`, and add `catalog.atlases`, the name, group and path of each atlas.
- b07cdd2: Add `buildTerritories`, which builds one feature per territory of an atlas from a Natural Earth topology of `world-atlas` 2.0.2, through the extraction rules of the atlas, or from features of the user that carry the code of a territory. `createNaturalEarthSource` builds the first kind of source, `TerritoryBuildError` names the codes, indices and resolutions that the build refuses, and `rewindToRfc7946` orients a planar geometry as RFC 7946 asks.
- c034b79: Add the presets of the Spain atlas: `spain-standard`, a `composite-custom` preset that reproduces `geoConicConformalSpain` of d3-composite-projections, and the view presets `spain-builtin`, `spain-split` and `spain-unified`.

## 2.1.0

### Minor Changes

- ee68212: Remove the `atlasMetadata` field from the composite presets. The Atlas Composer application reads the projection preferences of an atlas from its configuration.

## 2.0.0

### Major Changes

- 0940f1c: The package takes its presets and its catalog from the registry of the Atlas Composer app, [`configs/atlas-registry.json`](https://github.com/ShallowRed/atlas-composer/blob/main/configs/atlas-registry.json), and each preset file is named after the preset identifier. The public path of a preset is `@atlas-composer/preset-library/<atlas>/<identifier>`. Eleven paths change:

  - `@atlas-composer/preset-library/france/france-customcomposite-pseudod3cp` → `@atlas-composer/preset-library/france/france-pseudo-d3cp`
  - `@atlas-composer/preset-library/france/france-customcomposite-proportionnald3cp` → `@atlas-composer/preset-library/france/france-proportional`
  - `@atlas-composer/preset-library/france/france-customcomposite-nsp` → `@atlas-composer/preset-library/france/france-standard`
  - `@atlas-composer/preset-library/france/france-builtincomposite-d3cp` → `@atlas-composer/preset-library/france/france-builtin-d3cp`
  - `@atlas-composer/preset-library/portugal/portugal-default` → `@atlas-composer/preset-library/portugal/portugal-standard`
  - `@atlas-composer/preset-library/portugal/portugal-built-in-composite` → `@atlas-composer/preset-library/portugal/portugal-builtin`
  - `@atlas-composer/preset-library/usa/usa-builtincomposite-d3cp` → `@atlas-composer/preset-library/usa/usa-builtin-d3cp`
  - `@atlas-composer/preset-library/usa/usa-builtincomposite-d3cpterritories` → `@atlas-composer/preset-library/usa/usa-builtin-territories`
  - `@atlas-composer/preset-library/usa/usa-builtincomposite-albersusa` → `@atlas-composer/preset-library/usa/usa-albers`
  - `@atlas-composer/preset-library/usa/usa-customcompsite-pseudod3cp` → `@atlas-composer/preset-library/usa/usa-pseudo-d3cp`
  - `@atlas-composer/preset-library/europe/europe-builtincomposite-d3cp` → `@atlas-composer/preset-library/europe/europe-builtin`

  The preset files are in `dist/<atlas>/<identifier>.json` of the package, and `getPresetPath(id)` returns their path relative to `dist/`, for example `france/france-standard.json`. The `id` field of each `unified`, `split` and `built-in-composite` preset file is the preset identifier, for example `france-split` and `usa-albers`.

  The content of the presets follows the presets of the Atlas Composer app. The `unified` and `split` presets give the position of each projection by its d3 parameters, such as `rotate`. The `$schema` of each `composite-custom` preset is `../../schemas/preset.schema.json`. In `france-standard`, FR-MET has `rotate` `[-3, -46.2, 0]` and `parallels` `[0, 60]`. In `usa-pseudo-d3cp`, US-CONT has `center` `[-0.6, 38.7]`.

  The `name` and `description` of each catalog entry are the English name and description of the registry, for example `NSP composite` for `france-standard`. The tags are reduced to `default`, which marks the default preset of each atlas in the registry; the tags `albers`, `conic-conformal`, `d3-builtin`, `d3-composite-projections`, `d3cp-style`, `natural-earth`, `proportional`, `split-view`, `territories` and `world-view` are removed. The `default` tag marks `france-pseudo-d3cp` for France and `usa-builtin-d3cp` for the USA, and `getDefaultPreset('france')` returns `france-pseudo-d3cp`.

  `PresetRegion` is `string`. `getAllPresets()`, `listPresets()`, `catalog.presets` and `listRegions()` follow the order of the registry: `listPresets({ atlasId: 'france' })[0]` is `france-pseudo-d3cp`. `catalog.lastUpdated` is removed, and `catalog.version` is the version of the package.

## 1.0.1

### Patch Changes

- Add npm publishing infrastructure and configuration
- Updated dependencies
  - @atlas-composer/specification@1.0.1
