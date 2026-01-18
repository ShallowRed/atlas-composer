---
"@atlas-composer/projection-loader": major
"@atlas-composer/projection-core": patch
---

**BREAKING CHANGES:**

- Removed all example files from `packages/projection-loader/examples/` (13 files removed)
- Removed `name` and `names` properties from projection loader - i18n concerns are no longer handled
- Removed deprecated type exports: `ExportedConfig`, `ProjectionParameters`, `Territory`, and `Layout` (use types from `@atlas-composer/specification` instead)
- Removed global function exports (`registerProjection`, `loadCompositeProjection`, etc.) - use `ProjectionLoader` class instead

**Features:**

- Instance-based `ProjectionLoader` class with isolated projection registries
- Cleaner API focused on projection loading and transformation

**Refactoring:**

- Replaced deprecated types with specifications from `@atlas-composer/specification`
- Simplified interface by removing translation-related functionality
- Renamed internal file from `standalone-projection-loader.ts` to `projection-loader.ts`

**Migration Guide:**

1. **API changes**: Replace global function calls with `ProjectionLoader` instance:
   ```typescript
   // Before:
   import { registerProjection, loadCompositeProjection } from '@atlas-composer/projection-loader'
   registerProjection('mercator', () => d3.geoMercator())
   const projection = loadCompositeProjection(config, options)
   
   // After:
   import { ProjectionLoader } from '@atlas-composer/projection-loader'
   const loader = new ProjectionLoader()
   loader.register('mercator', () => d3.geoMercator())
   const projection = loader.load(config, options)
   ```

2. **Type imports**: Import configuration types from `@atlas-composer/specification`:
   - `ExportedConfig` → `CompositeProjectionConfig`
   - `Territory` → `TerritoryConfig`
   - `Layout` → `LayoutConfig`

3. **Removed properties**: The `name`/`names` properties are removed from loader output. Handle internationalization in your application code.