# @atlas-composer/projection-loader

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
