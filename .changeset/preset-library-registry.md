---
"@atlas-composer/preset-library": major
---

The package takes its presets and its catalog from the registry of the Atlas Composer app, [`configs/atlas-registry.json`](https://github.com/ShallowRed/atlas-composer/blob/main/configs/atlas-registry.json), and each preset file is named after the preset identifier. The public path of a preset is `@atlas-composer/preset-library/<atlas>/<identifier>`. Eleven paths change:

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
