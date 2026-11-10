# Atlas Composer

Instructions for coding agents working in this repository.

## Toolchain

Node is pinned in `.node-version`, which mise and the CI read, and pnpm in the `packageManager` field of `package.json`, through corepack. `pnpm check` runs what the CI runs (`.github/workflows/check.yml`): it builds the packages, measures the loader bundle against its size limit (`pnpm check:size`) and type-checks each packed package installed alone (`pnpm check:packages`), compares `types/atlas-registry.ts` and `types/atlas-config.ts` with the types generated from the registry schema and from the atlas schema (`pnpm check:generated-types`), then runs the lint, the type check, the search for unused files, exports and dependencies and for import cycles (`pnpm check:dead-code`, knip, configured in `knip.jsonc`), the tests and `pnpm geodata:validate --all`. The deploy and release workflows run this check first.

## Boundaries

The code keeps these boundaries, and `eslint.config.js` checks them with messages that name the place a change belongs. When a rule fires, move the code there; keep the rule.

- `src/core/` is the domain, without framework or I/O: registries of atlases, projections and parameters, projection definitions, positioning, conversion of presets. It imports neither Vue, vue-i18n, Pinia, the stores, the services nor the interface code, and calls neither `fetch` nor `localStorage`.
- `src/services/` does the I/O: loading the configurations and the geographic data, d3 rendering, files. It imports neither Pinia, the stores, `src/i18n/`, vue-i18n nor the interface code: a store action passes the locale as an argument. `JsonFileLoader` is the only reader of the JSON files of the site.
- `src/stores/` holds the state and the use cases, as store actions. It imports no interface code, and reads the locale from `src/i18n/`. A use case that writes several stores is an action of `src/stores/composition.ts`, which imports the other stores: a store that imports it forms a cycle, which `pnpm check:dead-code` refuses.
- `src/composables/` holds the interface logic and calls `src/services/rendering/` only.
- `src/components/` and `src/views/` render the DOM and import no service.

The tests in `__tests__/` folders combine these layers and stay outside the rules.

## Errors

An expected failure, which a file, the network or an imported value can produce, goes through `Result<T, E>` of `src/core/types/result.ts` with a typed error of `src/core/types/errors.ts`, and `useErrorMessage` translates it where the interface shows it. A programming error, a state that the code excludes by construction, throws an `Error`. A `catch` converts an exception of a browser or library API, ignores an unreadable value of the URL, or bounds a use case. `eslint.config.js` refuses the `success` and `isValid` fields.

## Configurations

`configs/` holds the atlases, the registry and the presets. `pnpm geodata:validate --all` validates `configs/atlas-registry.json` against `configs/schemas/atlas-registry.schema.json`, checks that each of its preset paths exists, and validates each `unified`, `split` and `built-in-composite` preset against `configs/schemas/preset-<type>.schema.json`. The application reads these presets without checking their form. `types/atlas-registry.ts` is generated from this schema, and `types/atlas-config.ts` from `configs/schemas/atlas.schema.json`: after a change to one of these schemas, run `pnpm generate:types`.
