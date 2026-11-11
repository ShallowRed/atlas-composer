# Development

This document describes the tests of the format and the rendering, the publication of the packages, the deployment of the site and the debug logs. [AGENTS.md](../AGENTS.md) describes the toolchain, `pnpm check` and the boundaries of the code.

## Tests of the format and the rendering

A unit test is in a `__tests__` folder beside the module it tests. The specs of `src/__tests__/` combine the application and the packages. `src/__tests__/composite-utils.ts` replaces the loading of the geographic data, so these specs run without `pnpm geodata:prepare`.

To run one spec:

```bash
pnpm exec vitest run src/__tests__/format-verdicts.spec.ts
```

`src/__tests__/format-verdicts.spec.ts` gives each file of `packages/specification/__tests__/fixtures/valid/` and `packages/specification/__tests__/fixtures/invalid/` to `validateConfig`, `readCompositeConfig` and `ProjectionLoader`, and expects the same verdict from all three. Each file of `src/__tests__/fixtures/exports/` holds a deprecated form: `validateConfig` and `ProjectionLoader` refuse it, and `readCompositeConfig` accepts it. `src/__tests__/exports-import.spec.ts` imports these files and compares the projected points with `src/__tests__/fixtures/exports-coordinates.json`.

`src/__tests__/export-validity.spec.ts` imports each preset of type `composite-custom` into the application, exports it and passes the result to `validateConfig`.

`src/__tests__/roundtrip-loader.spec.ts` compares the application with the loader. It reads each preset of type `composite-custom` and each file of `src/__tests__/fixtures/families/`, which covers a projection family that the presets leave out or, for `src/__tests__/fixtures/families/rendering-parameters.json`, a territory with `clipAngle` and `precision` and a territory without `pixelClipExtent`. For nine points in the bounds of each territory, it takes the position given by the application after the import, and it requires a distance of at most 1e-6 pixel with three other positions: the loader on the source file, the loader on the exported file, and the application after it loads the preset. The third comparison applies to the presets. The spec gives the loader a `pixelClipExtent` of ±1e6 pixels, because the clipping returns `null` for a point outside the extent.

`src/__tests__/applied-parameters.spec.ts` compares the `clipExtent`, `clipAngle` and `precision` of the sub-projections of the application and of the loader, on the same files.

`src/__tests__/projection-catalog.spec.ts` compares `PROJECTION_CATALOG` with two tables. Each definition of `projectionRegistry` with `supportsComposite` appears in the catalog with the same family, and each alias resolves to the same definition. The keys of `d3ProjectionFactories` are the ids of the catalog, and the loader gives the same coordinates for an alias and for its id.

`src/__tests__/view-rendering.spec.ts` compares the rendering of the views with references. For each atlas of `configs/atlas-registry.json` and each view among `unified`, `split` and `composite-custom` for which the atlas declares a preset, it follows the path of an atlas change and of a view change in the stores, then projects nine points in the bounds of each territory, or in the union of these bounds for the `unified` view. It compares them with `src/__tests__/fixtures/view-rendering.json`, under a key such as `france/split`, with a tolerance of 1e-6 pixel. The comment at the top of the spec names the commit that produced the references.

The variable `UPDATE_VIEW_RENDERING=1` writes this file from the current rendering. The run starts from an empty reference, so the file then holds the cases of this run alone. After adding an atlas, keep the keys of this atlas and restore the others.

```bash
UPDATE_VIEW_RENDERING=1 pnpm exec vitest run src/__tests__/view-rendering.spec.ts
```

`scripts/__tests__/prepare-geodata.spec.ts` prepares each atlas from `world-atlas` and compares a digest of its territories and its metadata, keys sorted, features ordered by id and the creation date left out, with the snapshot of `scripts/__tests__/__snapshots__/`. A change to the preparation that changes these files updates the snapshot with `pnpm exec vitest run scripts -u`, and the diff of the snapshot names the atlases that change.

`src/__tests__/documentation.spec.ts` compares the documents named in its `DOCUMENTS` constant with the repository: relative links, paths, identifiers and `pnpm` commands.

## Publication of the packages

The packages of `packages/` are published on npm with [changesets](https://github.com/changesets/changesets). The author of a pull request that changes a published package runs `pnpm changeset` and commits the file it creates in `.changeset/`. `.changeset/config.json` ignores the private root package `atlas-composer`.

`.github/workflows/release.yml` runs on each push to `main`. After the check, the job `version` calls `changesets/action`, which opens or updates the pull request `chore: release packages` when changeset files are pending. Its commit comes from `pnpm run version`. A maintainer merges this pull request by rebase or squash, so that its title stays at the head of `main`. When the commit at the head of `main` starts with this title, the job `build` builds the packages and uploads the `dist` folder of each one as an artifact, and the job `publish` waits for the approval of a reviewer of the GitHub environment `npm`. This job installs the dependencies without their scripts and runs `pnpm run release`. It authenticates with npm by trusted publishing, through the GitHub OIDC token, and is the only job that holds `id-token: write`.

## Deployment

`.github/workflows/deploy.yml` deploys the site to GitHub Pages on each push to `main`. After the check, it prepares the geographic data of each atlas with `pnpm geodata:prepare`, because git ignores `src/public/data/`, runs `pnpm build` and publishes the `dist` folder. The workflow names each atlas: [atlases.md](atlases.md) describes the line to add for a new atlas. The concurrency group `pages` lets a running deployment finish before the next one starts.

## Debug logs

`src/utils/logger.ts` declares one logger of the [debug](https://www.npmjs.com/package/debug) library per module, with a namespace such as `ac:render:overlay`. A module takes its logger from `logger` and passes a format string with its arguments.

```typescript
import { logger } from '@/utils/logger'

const debug = logger.parameters.manager

debug('Skipping territory %s', territoryCode)
```

`pnpm dev:debug` starts Vite with `VITE_DEBUG` set to `ac:*`, and the scripts of `package.json` that start with `dev:debug:` select a part of the namespaces. `src/main.ts` copies this value into `localStorage.debug`. The library reads `localStorage.debug` when it is imported, before `src/main.ts` writes it, so the logs appear after a reload of the page.

The library writes with `console.debug`, which Chrome shows at the Verbose level of the console. The value stays in the browser for later runs of `pnpm dev`. To change the selection or to stop the logs, enter one of these lines in the console and reload the page:

```javascript
localStorage.debug = 'ac:*,-ac:data:*'
localStorage.removeItem('debug')
```
