# @atlas-composer/projection-loader

## 3.1.0

### Minor Changes

- b74a0d3: `applyRenderingParameters` of `@atlas-composer/projection-core` applies `clipAngle`, `precision` and the clip extent of a sub-projection.

  A territory without `pixelClipExtent` is clipped at its `bounds`, in the loader as in the application. A territory with neither is not clipped. The format stays 1.1, so a file 1.1 without `pixelClipExtent` is drawn differently by this version of the loader and by the previous ones.

## 3.0.0

### Major Changes

- d47a8f2: `load` and `loadFromJSON` validate the configuration against the schema of `@atlas-composer/specification` 2.0, and throw a `ConfigValidationError` for every configuration that the schema refuses. Its `errors` property lists the `path`, `message` and `code` of each error. The assertion `validateConfig` of the loader 2 is removed: the package exports `validateConfig` of the specification, which returns `{ valid, errors, warnings }` without throwing, and the types `ValidationError` and `ValidationResult`.

  The loader applies the d3 parameters of the configuration as given. It reads neither `focusLongitude`, `focusLatitude` nor `family`, and it ignores `scale`, `distance` and `tilt`. A territory without `bounds` is loaded, and the composite projection returns `null` for its points.

  An alias of the projection catalog takes the factory registered under it, else the factory of its identifier: `albers` is built by `geoConicEqualArea`, and `natural-earth-1` is an alias of `natural-earth`. The keys of `d3ProjectionFactories` are the identifiers of the catalog: the key `albers` is removed, and the key `natural-earth-1` is renamed `natural-earth`. The `./helpers` entry keeps its exports `albers`, created by `geoAlbers`, and `naturalEarth1`. To build `albers` with `geoAlbers`, as the loader 2 did:

  ```typescript
  import { albers } from "@atlas-composer/projection-loader/helpers";

  loader.register("albers", albers);
  ```

## 2.1.1

### Patch Changes

- f030439: The type declarations include the types of `@atlas-composer/specification`, so a project that installs the loader alone compiles with `skipLibCheck: false`. `naturalEarth1` comes from `d3-geo`, and the `d3-geo-projection` peer dependency is removed. `load()` accepts every configuration version of major 1.

## 2.1.0

### Minor Changes

- `loader.load()` returns a `CompositeProjectionLike`: `scale()` and `translate()` set after loading recompute every territory projection, and `fitSize()` and `fitExtent()`, which Observable Plot calls, fit the projection to a new size.
- A territory without `pixelClipExtent` has no clip extent; 2.0 clipped a territory with bounds to a square that extends 10% of the scale on each side of its translate.
- A territory without `scaleMultiplier` takes the reference scale; 2.0 kept the default scale of its d3 projection.

## 2.0.1

### Patch Changes

- 8ee3030: Add third-party license attribution for d3-geo and d3-composite-projections

  - Add NOTICES.md files to both packages with proper ISC and BSD-3-Clause license attribution
  - Add JSDoc comments attributing stream multiplexer and composite builder to d3-geo
  - Include NOTICES.md in published npm package files
  - Update README files with acknowledgments section

## 2.0.0

### Major Changes

- 2a986b9: **BREAKING CHANGES:**

  - Removed all example files from `packages/projection-loader/examples/` (13 files removed)
  - Removed `name` and `names` properties from projection loader - i18n concerns are no longer handled
  - Removed deprecated type exports: `ExportedConfig`, `ProjectionParameters`, `Territory`, and `Layout` (use types from `@atlas-composer/specification` instead)
  - Removed global function exports (`registerProjection`, `loadCompositeProjection`, `clearProjections`, `getRegisteredProjections`, `isProjectionRegistered`, `unregisterProjection`, `registerProjections`, `loadFromJSON`) - use `ProjectionLoader` class instead

  **Features:**

  - Instance-based `ProjectionLoader` class with isolated projection registries
  - Cleaner API focused on projection loading and transformation

  **Changes:**

  - Replaced deprecated types with specifications from `@atlas-composer/specification`
  - Simplified interface by removing translation-related functionality
  - Renamed internal file from `standalone-projection-loader.ts` to `projection-loader.ts`
  - Updated documentation to describe current API without temporal language

  **Migration Guide:**

  1. **API changes**: Replace global function calls with `ProjectionLoader` instance:

     ```typescript
     // Before:
     import {
       registerProjection,
       loadCompositeProjection,
     } from "@atlas-composer/projection-loader";
     registerProjection("mercator", () => d3.geoMercator());
     const projection = loadCompositeProjection(config, options);

     // After:
     import { ProjectionLoader } from "@atlas-composer/projection-loader";
     const loader = new ProjectionLoader();
     loader.register("mercator", () => d3.geoMercator());
     const projection = loader.load(config, options);
     ```

  2. **Type imports**: Import configuration types from `@atlas-composer/specification`:

     - `ExportedConfig` → `CompositeProjectionConfig`
     - `Territory` → `TerritoryConfig`
     - `Layout` → `LayoutConfig`
     - Remove `ProjectionParameters` (no longer exported)

  3. **Removed properties**: The `name`/`names` properties are removed from loader output. Handle internationalization in your application code.

## 1.1.1

### Patch Changes

- Bundle projection-core inline for browser/Observable compatibility. Fixes import errors when using the package via CDN.

## 1.1.0

### Minor Changes

- Graduate to stable release with npm publishing support

### Patch Changes

- Updated dependencies
  - @atlas-composer/projection-core@1.0.1
  - @atlas-composer/specification@1.0.1
