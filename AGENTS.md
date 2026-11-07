# Atlas Composer

Instructions for coding agents working in this repository.

## Toolchain

Node is pinned in `.node-version`, which mise and the CI read, and pnpm in the `packageManager` field of `package.json`, through corepack. `pnpm check` runs what the CI runs (`.github/workflows/check.yml`): it builds the packages, measures the loader bundle against its size limit (`pnpm check:size`) and type-checks each packed package installed alone (`pnpm check:packages`), compares `types/atlas-registry.ts` with the type generated from the registry schema (`pnpm check:registry-type`), then runs the lint, the type check, the search for unused files, exports and dependencies (`pnpm check:dead-code`, knip, configured in `knip.jsonc`), the tests and `pnpm geodata:validate --all`. The deploy and release workflows run this check first.

## Boundaries

The code keeps these boundaries, and `eslint.config.js` checks them with messages that name the place a change belongs. When a rule fires, move the code there; keep the rule.

- `src/core/` is the domain, without framework or I/O: registries of atlases, projections and parameters, projection definitions, positioning, conversion of presets. It imports neither Vue, vue-i18n, Pinia, the stores, the services nor the interface code, and calls neither `fetch` nor `localStorage`.
- `src/services/` does the I/O: loading the configurations and the geographic data, d3 rendering, files. It imports neither Pinia, the stores, `src/i18n/`, vue-i18n nor the interface code: a store action passes the locale as an argument.
- `src/stores/` holds the state and the use cases, as store actions. It imports no interface code, and reads the locale from `src/i18n/`.
- `src/composables/` holds the interface logic and calls `src/services/rendering/` only.
- `src/components/` and `src/views/` render the DOM and import no service.

The tests in `__tests__/` folders combine these layers and stay outside the rules.

The files of `BOUNDARY_EXCEPTIONS` in `eslint.config.js` break a boundary on the current code. Remove a file from this list when it complies; add none.

## Configurations

`configs/` holds the atlases, the registry and the presets. `pnpm geodata:validate --all` validates `configs/atlas-registry.json` against `configs/schemas/atlas-registry.schema.json` and checks that each of its preset paths exists. `types/atlas-registry.ts` is generated from this schema: after a change to the schema, run `pnpm generate:types`.
