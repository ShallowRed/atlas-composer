# Projections

Each projection of Atlas Composer is a definition in `src/core/projections/definitions/`. `projectionRegistry`, in `src/core/projections/registry.ts`, registers the definitions of `ALL_PROJECTIONS` when the module loads. [atlases.md](atlases.md) describes the projection preferences of an atlas, and [d3-to-atlas-parameter-mapping.md](d3-to-atlas-parameter-mapping.md) gives the conversion of the parameters of `d3-composite-projections`.

## Definitions

`ProjectionDefinition`, in `src/core/projections/types.ts`, describes one projection. The presets and the atlas configurations name a projection by its `id`. `projectionRegistry.get` also resolves each entry of `aliases`, and ignores the case of the name. `name` and `description` are translation keys of `src/i18n/locales/en.json` and `src/i18n/locales/fr.json`.

`create` returns a new d3 projection. `ProjectionFactory.create`, in `src/core/projections/factory.ts`, calls it and applies `defaultParameters`, which the given parameters override.

`strategy` tells which library provides `create`. `D3_BUILTIN` is a projection of `d3-geo`, and `D3_EXTENDED` a projection of `d3-geo-projection`. `D3_COMPOSITE` is a projection that already combines several territories, from `d3-composite-projections` or `geoAlbersUsa` of `d3-geo`. Such a projection sets its own `center`, `rotate` and `parallels`, so `ProjectionFactory` skips these three parameters for it.

`supportsComposite`, `supportsSplit` and `supportsUnified`, in `capabilities`, give the view modes that offer the projection. `projectionRegistry.filter` applies them from `viewMode`, and keeps the definitions with the `D3_COMPOSITE` strategy for the `built-in-composite` view.

## Families and categories

`family` describes the geometry of the projection. Its values come from `@atlas-composer/specification`, and a composite preset writes the family of each territory. The positioning parameter, the constraints of the parameter registry and the panning depend on the family, as the next sections describe.

`category` groups the projections in the menus: `ProjectionUIService.getProjectionGroups` makes one group per category and excludes the `COMPOSITE` category. A category can hold several families. The definitions of category `WORLD` have the families `PSEUDOCYLINDRICAL`, `CYLINDRICAL` and `AZIMUTHAL`. The definitions of `src/core/projections/definitions/composite.ts` have the category `COMPOSITE` and the family `MISCELLANEOUS`.

## Recommendations

`projectionRegistry.recommend` filters the definitions like `filter`, computes a score for each one and returns them by decreasing score.

- Each definition starts at 50.
- A definition listed in `ProjectionFilterContext.recommended` gains 40.
- A definition with the `D3_COMPOSITE` strategy gains 20 in the `built-in-composite` view.

The level follows from the score: `excellent` from 80, `good` from 60, and `usable` below. `projectionRecommendations` of `src/stores/view.ts` passes the `recommended` list of the atlas and the view mode to `ProjectionUIService.getProjectionRecommendations`, which excludes the `COMPOSITE` category. In the application, a projection is therefore `excellent` when the atlas recommends it and `usable` in the other cases. `useProjectionRecommendations` gives the badge and the color of each level in `ProjectionDropdown`.

## Positioning with center and rotate

The presets and the stores hold the d3 values: `center` is `[longitude, latitude]` and `rotate` is `[λ, φ, γ]`. `src/core/positioning/` holds the rules that use them, for two views given by `PositioningView`. The `composite` view positions the territories of a custom composite, and the `global` view positions a projection that draws a whole map.

`getPositionParameter` gives the parameter that a control edits: `center` for the `CYLINDRICAL` family in the `composite` view, and `rotate` in the other cases.

`applyPositioning` differs between the two views.

- In the `composite` view, a territory whose file or preset leaves out `center` keeps the center of its d3 factory, as in the loader: `extractTerritoryParameters` writes this center when it reads the file, `[0, 13.9389]` for `conic-equidistant` and `[0, 33.6442]` for `conic-equal-area`. `applyPositioning` passes `center` and `rotate` to d3, with zeros for a missing value.
- In the `global` view, `getTargetCoordinates` computes the point that the two parameters place at the translation point, and `getTargetRotate` turns the sphere to this point. The projection keeps the center of its factory.

On a conic projection, `applyPositioning` sets `parallels`. Without a value, `getDerivedParallels` gives `[44, 49]` in the `global` view and the latitude of the target point plus and minus 2 degrees in the `composite` view. At a target latitude of 0, the projection keeps its parallels.

When a territory changes family in the `composite` view, `changeTerritoryProjection` of `src/stores/parameters.ts` calls `convertPositioning`, which writes the same target point in the parameter of the new family. [architecture.md](architecture.md) gives the order in which the levels of parameters combine.

## Clip extent and fit

The `pixelClipExtent` of a territory is `[x1, y1, x2, y2]`, in pixels relative to the translation of the territory. `CompositeProjection.build`, in `src/services/projection/composite-projection.ts`, reads the parameters of each territory from `ProjectionParameterProvider`, and `applyRenderingParameters` of `@atlas-composer/projection-core` turns `pixelClipExtent` into the d3 `clipExtent`. The rectangle depends on the translation alone: a change of `rotate`, `center` or `scaleMultiplier` moves the map inside a fixed rectangle. A territory without `pixelClipExtent` is clipped to the projected corners of its `bounds`.

`useClipExtentEditor` draws the corners of the selected territory in the `composite-custom` view, and a drag moves a corner by steps of 5 pixels. `ProjectionLoader` divides the values by `referenceScale`, so the clipping follows the size requested from the loader.

The territories of a custom composite are positioned by their scale and their translation, as [presets.md](presets.md) describes. The other maps go through `ProjectionService.getD3Projection`, in `src/services/projection/projection-service.ts`, which calls `fitExtent` on the data, or on the sphere when the map shows it. When `autoFitDomain` of the projection store is false, the function then multiplies the fitted scale by `scaleMultiplier`.

## Parameter registry

`parameterRegistry`, in `src/core/parameters/parameter-registry.ts`, holds the description of each parameter, and `src/core/parameters/parameter-definitions.ts` registers these descriptions. `familyConstraints` gives, for one family, the relevance of the parameter, its bounds, its step and an optional validation function. `getDefaultValue` reads the value that a control shows when the parameter is missing. `getConstraintsForFamily` treats a parameter without an entry for the family as irrelevant.

The relevance of `center` and `rotate` comes from `usesPositionParameter`, so `center` is relevant for the `CYLINDRICAL` family, and `rotate` for the `CYLINDRICAL`, `PSEUDOCYLINDRICAL`, `CONIC` and `AZIMUTHAL` families.

`validateParameters` checks the relevant parameters of a family and returns a list of `ParameterIssue`. `requiresPreset` applies to the presets, as [presets.md](presets.md) describes, and `extractTerritoryParameters` keeps the exportable parameters of a territory.

## Panning

`useProjectionPanning` converts a drag on the map into a change of the global `rotate`. `supportsPanning` accepts the `CYLINDRICAL`, `PSEUDOCYLINDRICAL`, `AZIMUTHAL` and `POLYHEDRAL` families. One pixel is 0.5 degree. The longitude wraps between -180 and 180, and the latitude stays between -90 and 90. `rotateLatitudeLocked` of the projection store is true at startup and fixes the latitude, and `ProjectionParamsControls` holds its toggle.

## Adding a projection

1. Add a `ProjectionDefinition` to a file of `src/core/projections/definitions/` whose array is part of `ALL_PROJECTIONS`.
2. Add the keys of `name` and `description` to `src/i18n/locales/en.json` and `src/i18n/locales/fr.json`.
3. When the definition has `supportsComposite`, a composite preset can use it and the export writes it. Add its id and its family to `PROJECTION_CATALOG` in `packages/specification/src/catalog.ts`, and its factory under the same id to `d3ProjectionFactories` in `packages/projection-loader/src/d3-projection-helpers.ts`. `src/__tests__/projection-catalog.spec.ts` compares the definitions, the catalog and the factories. Add a changeset for `@atlas-composer/specification` and `@atlas-composer/projection-loader`, as [development.md](development.md) describes.
4. To recommend the projection for an atlas, add its id to `projectionPreferences.recommended` in the configuration of the atlas.
5. Run `pnpm check`.
