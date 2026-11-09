# Development

This document describes the tests that protect the format and the rendering, the publication of the packages, the deployment of the site and the debug logs. [AGENTS.md](../AGENTS.md) describes the toolchain, `pnpm check` and the boundaries of the code.

## Tests of the format and the rendering

A unit test sits in a `__tests__` folder beside the module it tests. The specs of `src/__tests__/` combine the application and the packages. `src/__tests__/composite-utils.ts` replaces the loading of the geographic data, so these specs run without `pnpm geodata:prepare`.

To run one spec:

```bash
pnpm exec vitest run src/__tests__/format-verdicts.spec.ts
```

`src/__tests__/format-verdicts.spec.ts` gives each file of `packages/specification/__tests__/fixtures/valid/` and `packages/specification/__tests__/fixtures/invalid/` to `validateConfig`, `readCompositeConfig` and `ProjectionLoader`, and expects the same verdict from all three. Each file of `src/__tests__/fixtures/exports/` holds a deprecated form: `validateConfig` and `ProjectionLoader` refuse it, and `readCompositeConfig` accepts it. `src/__tests__/exports-import.spec.ts` imports these files and compares the projected points with `src/__tests__/fixtures/exports-coordinates.json`.

`src/__tests__/export-validity.spec.ts` imports each preset of type `composite-custom` into the application, exports it and passes the result to `validateConfig`.

`src/__tests__/roundtrip-loader.spec.ts` compares the application with the loader. It reads each preset of type `composite-custom` and each file of `src/__tests__/fixtures/families/`, which covers a projection family that the presets leave out. For nine points in the bounds of each territory, it takes the position given by the application after the import, and it requires a distance of at most 1e-6 pixel with three other positions: the loader on the source file, the loader on the exported file, and the application after it loads the preset. The third comparison applies to the presets. The spec removes `pixelClipExtent` from the files given to the loader, because the clipping returns `null` for a point outside the extent.

`src/__tests__/projection-catalog.spec.ts` compares `PROJECTION_CATALOG` with two tables. Each definition of `projectionRegistry` with `supportsComposite` appears in the catalog with the same family, and each alias resolves to the same definition. The keys of `d3ProjectionFactories` are the identifiers of the catalog, and the loader gives the same coordinates for an alias and for its identifier.

`src/__tests__/view-rendering.spec.ts` protects the rendering of the views. For each atlas of `configs/atlas-registry.json` and each view among `unified`, `split` and `composite-custom` for which the atlas declares a preset, it follows the path of an atlas change and of a view change in the stores, then projects nine points per territory. It compares them with `src/__tests__/fixtures/view-rendering.json`, under a key such as `france/split`, with a tolerance of 1e-6 pixel. The comment at the top of the spec names the commit that produced the references.

The variable `UPDATE_VIEW_RENDERING=1` writes this file from the current rendering. The run starts from an empty reference, so a run filtered to some cases writes these cases alone. [docs/atlases.md](atlases.md) describes its use when adding an atlas.

```bash
UPDATE_VIEW_RENDERING=1 pnpm exec vitest run src/__tests__/view-rendering.spec.ts
```

`src/__tests__/documentation.spec.ts` compares the documents named in its `DOCUMENTS` constant with the repository, outside the fenced code blocks for the first three checks:

- a relative link leads to a file or folder tracked by git;
- a path in inline code designates a tracked file, where `<atlas>` stands for `france` and `<id>` or `*` for one path segment;
- an identifier in camel case or Pascal case in inline code appears in the source;
- a `pnpm` command in inline code or in a `bash` block is a script of `package.json`, or `install`, `exec` or `run`.

## Publication of the packages

The packages of `packages/` are published on npm with [changesets](https://github.com/changesets/changesets). The author of a pull request that changes a published package runs `pnpm changeset` and commits the file it creates in `.changeset/`. `.changeset/config.json` ignores the private root package `atlas-composer`.

`.github/workflows/release.yml` runs on each push to `main` and calls `changesets/action` after the check. When changeset files are pending, the action opens or updates the pull request `chore: release packages`, whose commit comes from `pnpm run version`. When this pull request is merged, no changeset file remains, and the action runs `pnpm run release`, which builds the packages and publishes the new versions. The publication authenticates with npm by trusted publishing, through the GitHub OIDC token that the permission `id-token: write` gives to the job.

## Deployment

`.github/workflows/deploy.yml` deploys the site to GitHub Pages on each push to `main`. After the check, it prepares the geographic data of each atlas with `pnpm geodata:prepare`, because git ignores `src/public/data/`, runs `pnpm build` and publishes the `dist` folder. The workflow names each atlas: [docs/atlases.md](atlases.md) describes the line to add for a new atlas. The concurrency group `pages` lets a running deployment finish before the next one starts.

## Debug logs

`src/utils/logger.ts` declares one logger of the [debug](https://www.npmjs.com/package/debug) library per module, with a namespace such as `ac:render:overlay`. A module takes its logger from `logger` and passes a format string with its arguments.

```typescript
import { logger } from '@/utils/logger'

const debug = logger.parameters.manager

debug('Skipping territory %s', territoryCode)
```

`pnpm dev:debug` starts Vite with `VITE_DEBUG` set to `ac:*`, and the scripts of `package.json` that start with `dev:debug:` select one domain. `src/main.ts` copies this value into `localStorage.debug`. The library reads `localStorage.debug` when it is imported, before `src/main.ts` writes it, so the logs appear after a reload of the page.

The library writes with `console.debug`, which Chrome shows at the Verbose level of the console. The value stays in the browser for later runs of `pnpm dev`. To change the selection or to stop the logs, enter one of these lines in the console and reload the page:

```javascript
localStorage.debug = 'ac:*,-ac:data:*'
localStorage.removeItem('debug')
```
