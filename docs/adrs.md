# Architecture decisions

Each section gives a decision and its reasons. [AGENTS.md](../AGENTS.md) lists the boundaries of the code that follow from these decisions.

## The state of the application is in Pinia stores

The state of the application is in the Pinia stores of `src/stores/`.

The rendering and the controls follow the state through Vue reactivity, and a store gives this reactivity to components and composables directly. Pinia [documents actions](https://pinia.vuejs.org/core-concepts/actions.html) as the place of the business logic. The Vue devtools show the state of each store and each call of an action.

## Each store holds one concept

A store holds the state of one concept: `atlas` holds the selected atlas and its configuration, `projection` the selected projections and the canvas, `view` the view mode and the active territories. The use cases that replace the state of several stores, such as the initialization of an atlas, the import and the load of a custom preset, are actions of `src/stores/composition.ts`.

A change to one concept touches one store. `src/stores/composition.ts` imports the other stores, and `pnpm check:dead-code` refuses an import cycle.

## Domain identifiers have branded types

`AtlasId`, `ProjectionId`, `PresetId` and `TerritoryCode`, in `src/types/branded.ts`, are strings with a type-level brand.

The compiler refuses a `PresetId` where a function expects an `AtlasId`, and a signature names the kind of identifier it takes. The brand exists in the types and TypeScript erases it, so the value is a plain string at runtime. A string read from a file becomes an identifier through a constructor of `src/types/branded.ts` or a cast.

## Use cases are store actions, and a service imports no store

A use case that reads or writes the state of the application is an action of a store, and `useUrlState` reads and writes the stores for a link, from the interface layer. An action passes values to the services as arguments. A service can keep its own state: the parameters store owns a `ProjectionParameterManager`, which holds the levels of parameters. A service imports no store.

The dependencies go in one direction, and `eslint.config.js` checks it. Pinia [lets an action call another store](https://pinia.vuejs.org/cookbook/composing-stores.html), and a store action runs outside the `setup` of a component. A service runs in a test with plain arguments.

## Projection preferences are in the atlas configuration

`projectionPreferences`, in `configs/atlases/<atlas>.json`, gives the recommended projections of an atlas and its default composite projection. `configs/schemas/atlas.schema.json` defines this field, and [atlases.md](atlases.md) describes it.

The configuration of an atlas is the one source of what is specific to this atlas, and a new atlas declares its projections in its own file. `eslint.config.js` refuses an import of `src/core/atlases/` from `src/core/projections/`: a caller passes the recommended projections through `ProjectionFilterContext`.

## An expected failure goes through Result with a typed error

A failure that a file, the network or an imported value can produce is a `Result` with a typed error. The section Errors of [AGENTS.md](../AGENTS.md) gives the rule.

The signature of a function shows that it can fail and how. The caller handles the error by its `code`, and `useErrorMessage` translates this code where the interface shows it, so `src/core/` and `src/services/` import no translation.

## Positioning is in d3 parameters from end to end

The presets, the state of the application, the exported file and the loader all give the position of a territory with the d3 parameters `rotate`, `center` and `parallels`.

The application has one model, so the import of a file in the current format and the export hold the same values. A file written for d3 keeps its meaning: `configs/presets/usa/usa-pseudo-d3cp.json` gives a territory both `center` and `rotate`, as d3 does for Alaska in `geoAlbersUsa`. The loader applies the values of the file as they are, so a reader of the format needs no rule per projection family. The rules per family are in `src/core/positioning/`, which the import of deprecated forms, the panning of the map and the parameter registry use, and `eslint.config.js` refuses the deprecated fields elsewhere. [projections.md](projections.md) describes the positioning.

## The preset ids of the registry are the public ids

The `id` of a preset in `configs/atlas-registry.json` is the id that `@atlas-composer/preset-library` publishes and the name of the file `configs/presets/<atlas>/<id>.json`.

The project has one list of ids, and a user of the package reads the same name as the application. `packages/preset-library/src/index.ts` builds its catalog from the registry, and `pnpm geodata:validate --all` checks the form of each id and its path.

## The loader validates with the schema alone

`ProjectionLoader` calls `validateConfig` of `@atlas-composer/specification` and throws a `ConfigValidationError` for a file that the schema refuses. It neither tolerates nor converts a deprecated form.

A file is valid when the schema accepts it, and `src/__tests__/format-verdicts.spec.ts` requires the same verdict from the specification, the application and the loader. The loader has no list of tolerated forms to maintain. The application reads the files of its earlier versions with `readCompositeConfig`, as [export.md](export.md) describes, and the loader refuses them.
