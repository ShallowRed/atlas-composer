# Architecture

Atlas Composer is a Vue application with Pinia stores and a rendering in d3, beside the npm packages of `packages/`. [adrs.md](adrs.md) gives the reasons of the decisions that this document describes.

## Layers

[AGENTS.md](../AGENTS.md) gives the rules of each layer of `src/`, and `eslint.config.js` checks them. The dependencies go from the interface to the domain. `src/views/` and `src/components/` call the composables and the stores. `src/composables/` calls the stores and `src/services/rendering/`. `src/stores/` calls the services and `src/core/`. `src/services/` calls `src/core/`, and `src/core/` imports none of these layers.

A service that keeps data is an instance, such as `GeoDataService` or `CompositeProjection`. A service of transformations has static methods, such as `TerritoryFilterService`.

## From an action to the map

The change of a territory parameter shows the steps from an action to the rendering. `TerritoryParameterControls` calls `setTerritoryParameter` of the parameters store. The store writes the value in its `ProjectionParameterManager` and increments `territoryParametersVersion`. The manager is a plain class, so these version counters give the reactivity: the getters of the store read the counter, and a `computed` or a watcher that calls a getter runs again after a write.

`MapRenderer` draws each map of the application. `SplitView` and `UnifiedView` use this component for their maps. It calls `useMapWatchers`, which watches the version counter, the view mode, the projections and the display options, and asks for a new rendering. `MapRenderer` groups these requests over 50 milliseconds. During a drag, it renders at each request. A rendering empties the container of the map, asks `useMapRender` for an SVG element, inserts this element and adds the overlays.

`useMapRender` reads the stores and calls `MapRenderCoordinator`, which gives the render options to `Cartographer`. In the `composite-custom` view, `CompositeProjection` reads the parameters of each territory, builds the composite projection with `buildCompositeProjection` of `@atlas-composer/projection-core`, and `D3MapRenderer` writes the paths of the territories.

A service imports no store, so the geoData store gives `Cartographer` the `parameterProvider` object of the parameters store when it creates the cartographer. `CompositeProjection` calls `getEffectiveParameters` on this object at each rendering.

The change of an atlas or of a view mode goes through the actions `selectAtlas` and `selectViewMode` of `src/stores/composition.ts`, which `AtlasConfigSection` calls. `selectAtlas` calls `initializeAtlas`, which clears the parameters and the geographic data, applies the default preset of the view mode, loads the default view preset, creates a new `Cartographer`, loads the data and calls `triggerRender`. If this initialization fails, the action selects the previous atlas again and shows an error. `selectViewMode` clears the global `center`, `rotate`, `parallels` and `scale`, and loads the default preset of this view, through `initializeAtlas` for the `composite-custom` view.

`triggerRender` increments `renderKey`, which `useMapWatchers` also watches. The actions that replace the state in several stores call it after their last write.

## Stores and composables

A store holds the state of one concept, and [adrs.md](adrs.md) gives the reasons. `src/stores/composition.ts` holds the use cases that replace the state of several stores. The geoData store holds the `Cartographer` of the current atlas, the loaded territories and `renderKey`. The app store holds the loading state, from which `MapView` decides to show the skeleton of the map.

A composable holds the logic of the interface. It reads the stores and gives a component computed values, as `useViewState` does for the flags of the view mode, or it handles the mouse events on the map, as `useTerritoryCursor`, `useProjectionPanning` and `useClipExtentEditor` do. The composables that draw, such as `useMapRender`, call `src/services/rendering/`.

## Order of the projection parameters

`ProjectionParameterManager`, in `src/services/parameters/projection-parameter-manager.ts`, holds three levels of parameters. The atlas level comes from the parameters of a `unified` preset. The global level comes from `ProjectionParamsControls`, the panning of the map and the rotation and parallels of a link. The territory level comes from the presets, the imported files, the territory controls and the drag of a territory.

`getEffectiveParameters` merges `{}`, the atlas level, the global level and the territory level, in this order, with `mergeParameters`. Each level replaces the keys of the previous levels that it defines.

`center` and `rotate` describe one position together, so both come from the first level that defines at least one of them, in the order territory, global, atlas. A territory that defines `center` alone therefore has no `rotate`, whatever the global level holds.

For the same reason, `setGlobalParameter` and `setTerritoryParameter` throw an `Error` for these two keys, and `setGlobalParameters` and `setTerritoryParameters` write them together. An update that names one of the two replaces both in its level. [projections.md](projections.md) describes the positioning and the parameter registry.

## State in the URL

`src/composables/useUrlState.ts` converts the state to the query of a link and back. `ShareButton` calls `copyShareableUrl`, which builds the link from the current state at this moment and copies it.

The query holds the atlas, the view, the projection, the territory mode, the global `rotate` and `parallels`, and the territory scales and translations. In the `composite-custom` view, these two values are written for each active territory, because the preset of the view gives them. In the other views, the query holds the values that differ from `TerritoryDefaultsService`. `serializeState` gives the keys.

When `MapView` is mounted, it gives `startMapView` the result of `readSharedLink`. `parseSharedLink`, in `src/core/view/shared-link.ts`, keeps the values of a known form and ignores the others. `startMapView` writes the atlas and the view of the link, and `initializeAtlas` runs once. It applies the default presets of the view, then `applySharedLink` writes the values of the link before the geographic data loads. It keeps a projection that the view proposes, a territory of the atlas and the numbers that `parameterRegistry` accepts.

## Application and packages

The application depends on two packages at runtime. It takes the types of the exported file, `validateConfig` and the shared constants from `@atlas-composer/specification`, and `CompositeProjection` calls `@atlas-composer/projection-core`. `ProjectionLoader` calls the same `buildCompositeProjection`, so the application and the loader share the composition of the projections. The build of `@atlas-composer/projection-loader` includes these two packages in its bundle.

`@atlas-composer/projection-loader` is a development dependency of the application: the specs of `src/__tests__/` compare it with the application, as [development.md](development.md) describes. `@atlas-composer/preset-library` reads `configs/atlas-registry.json` and the presets that the application also reads, as [presets.md](presets.md) describes.

The application and its tests resolve a package through the `exports` field of its `package.json`, which points to `dist/`. After a change in a package, `pnpm build:packages` gives the application the new code.
