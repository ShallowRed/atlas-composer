# Atlases

An atlas is a set of territories with its presets. `configs/atlas-registry.json` lists the atlases, and each atlas has a configuration in `configs/atlases/`. `configs/schemas/` gives the form of both files.

## Registry

`src/core/atlases/registry.ts` imports the registry when the application is built, so the list of atlases, their presets and their behavior are available at startup. The registry also holds the groups of the atlas menu.

An entry points to its configuration by `configPath`, relative to `configs/`. `loadAtlasConfiguration` in `src/services/atlas/atlas-config-loader.ts` reads this file the first time the atlas is used and keeps the result in memory by atlas id.

The default atlas is the entry with `isDefault`, or else the first entry. The default view mode of an atlas is the type of its preset with `isDefault`, or else the type of its first preset. [presets.md](presets.md) describes the preset types.

## Configuration of an atlas

A configuration names the territories, their bounds and centers, the files of `src/public/data/` that the application loads (`dataSources`), the projection preferences and the territory collections. [scripts.md](scripts.md) describes the `extraction` field of a territory.

`territories` is a list or `*`. In a list, `id` is a Natural Earth id, or a compound id such as `620-20` for a territory that an extraction rule produces. `code` names the territory in the presets, the collections and the application. With `*`, the application loads every feature of the file named by `dataSources`, and the atlas has no `compositeTerritories`. `configs/atlases/world.json` is this case.

`loadAtlasConfig` in `src/core/atlases/loader.ts` converts the JSON file to the `AtlasConfig` type of the application.

## Projection preferences

`projectionPreferences` holds two optional fields, each with definition ids of `src/core/projections/definitions/`.

`defaultCompositeProjection` is a definition with the `D3_COMPOSITE` strategy. `initializeAtlas` in `src/stores/composition.ts` copies it to `compositeProjection` of the projection store each time an atlas is initialized, and leaves `null` when the field is absent. A view preset of type `built-in-composite` replaces this value with its `projectionId` when it loads. The built-in composite map draws `compositeProjection`, or the selected projection when the value is `null`.

`recommended` lists the projections that the projection menus mark as recommended. [projections.md](projections.md) describes the definitions and the recommendations.

## Territory collections

`territoryCollections` holds named sets. `configs/schemas/atlas.schema.json` gives their form.

`behavior.collectionSets` in the registry entry tells each part of the interface which set to use, by the name of the set:

- `territoryScope` gives the options of the territory selector of the unified and split views. It names an `incremental` set. `loadAtlasConfig` turns each collection of the set into a territory mode. The first mode is the initial one. When the set is missing, the atlas has no territory selector.
- `territoryManager` gives the default grouping of `TerritorySetManager`, in the custom composite view. It names a `mutually-exclusive` set.
- `territoryGroups` gives the default grouping of the territories of `SplitView`. It names a `mutually-exclusive` set.

The two grouping controls offer every `mutually-exclusive` set of the atlas when there are several. The application reads a set of another `selectionType` too, and logs a message (`loadAtlasConfig`, `useCollectionSet`). When the atlas has collections and the entry names no set for a grouping, the view shows its territories in one group. An atlas without `territoryCollections` has no list in `TerritorySetManager`.

## Territories of a custom composite

`activeTerritoryCodes` of `src/stores/view.ts` holds the territories that the custom composite draws. `applyCompositionState` in `src/stores/composition.ts` fills it with the territories of the preset each time an atlas or a composite preset loads, and `filterAtlasConfigByPreset` reduces the composite configuration to the same territories when the atlas is initialized.

`TerritorySetManager` lists the territories of the geographic data and adds or removes one with `addTerritoryToComposite` and `removeTerritoryFromComposite`. `filteredTerritories` of `src/stores/geoData.ts` keeps the active codes in this view. `resetTransforms` of the composition store restores the territories of the preset.

The built-in composite draws every territory, and the unified and split views follow the territory mode when the atlas has a territory selector.

## Translated names

`name`, `description`, `shortName`, `region` and each `label` accept a string or an object keyed by language, with `en` required. `resolveI18nValue` in `src/core/atlases/i18n-utils.ts` returns the value of the requested locale, then `en`, then the first key.

`loadAtlasConfiguration` resolves the names of a configuration once, in the locale of its first load. `useTerritoryModeOptions` resolves the labels of the territory modes in the current locale. `getAvailableAtlasesGrouped` passes no locale, so the atlas menu shows the `en` value.

## View modes and controls

The view modes of an atlas are the distinct types of its presets in the registry (`getAvailableViewModes`). The view mode menu is disabled when the atlas has one mode. `src/views/MapView.vue` chooses the map and the control panel from the mode, and `ViewOrchestrationService` in `src/core/view/view-orchestration-service.ts` holds the conditions of the controls that depend on it.

- `composite-custom` shows `TerritorySetManager`, `PresetSelector`, `ImportControls`, `GlobalProjectionControls`, `TerritoriesControl` and the composition borders toggle.
- `built-in-composite` shows `ViewPresetSelector` and the composition borders toggle.
- `split` shows the territory selector, `ViewPresetSelector`, `TerritoriesControl` and the scale preservation toggle.
- `unified` shows the territory selector, `ViewPresetSelector` and `ProjectionParamsControls`, and the map draws the outline of the sphere.

The territory selector appears when the `territoryScope` entry names a set of the atlas. The graticule and map limits toggles appear in every mode. `src/stores/view.ts` computes `showProjectionSelector`, true in the unified view while no view preset is active, and `showIndividualProjectionSelectors`, true in the split and custom composite views. `shouldShowRightSidebar` reads both to display the control panel.

## Adding an atlas

1. Find the Natural Earth ids and the polygon indices of the territories with `pnpm geodata:lookup` and `pnpm geodata:analyze`, as [scripts.md](scripts.md) describes.
2. Copy `configs/atlases/portugal.json` to `configs/atlases/<atlas>.json`, then replace its `id`, names, `dataSources`, `metadata`, `territories` and `territoryCollections`. Set `projectionPreferences` to the projections of the new atlas, and remove `projectionPreferences` when the atlas has neither a composite definition nor a recommended projection. [projections.md](projections.md) describes how to add one.
3. Add an entry to `configs/atlas-registry.json` with the same `id`, a `group`, a `sortOrder`, the `configPath` of the new file and the `behavior.collectionSets` of the new sets.
4. Create the presets in `configs/presets/<atlas>/<id>.json`, each with an id that starts with the atlas id, and declare them in the registry entry. The atlas needs exactly one preset with `isDefault`. [presets.md](presets.md) describes how to create a preset.
5. Run `pnpm geodata:prepare <atlas>`, then add this command to the `Prepare geodata` step of `.github/workflows/deploy.yml`, with `--resolution` when `dataSources` names another resolution than 50m.
6. Add the flag of the atlas to `ATLAS_FLAGS` in `src/utils/atlas-icons.ts`.
7. When the territories of the atlas have a name of their own, such as the member states of Europe, add the key `atlas.territories.<atlas>.territories` to `src/i18n/locales/en.json` and `src/i18n/locales/fr.json`. `SplitView` uses it as the title of its territories, and `territory.territories` for an atlas without this key.
8. Run `pnpm geodata:validate <atlas>`.
9. Regenerate the rendering reference of the new atlas, as [development.md](development.md) describes. `src/__tests__/view-rendering.spec.ts` fails on an atlas without reference.
10. Add a changeset for `@atlas-composer/preset-library`, whose catalog reads the registry, as [development.md](development.md) describes.
11. Open each view of the new atlas with `pnpm dev`, then run `pnpm check`.
