# Export System

## Overview

The export system enables using custom composite projections outside Atlas Composer:
- **JSON Export** - Configuration data for import/backup/version control
- **NPM Package** - `@atlas-composer/projection-loader` for runtime loading

## Architecture

| Component | File | Purpose |
|-----------|------|---------|
| **Export Service** | composite-export-service.ts | Export orchestration, serialization |
| **Import Service** | composite-import-service.ts | Validation, application to stores |
| **Export Dialog** | CompositeExportDialog.vue | Copy/download UI |
| **Import Modal** | ImportModal.vue | Upload, validate, apply |

## Export Format (ExportedCompositeConfig)

```json
{
  "version": "1.0",
  "metadata": { "atlasId": "france", "exportDate": "...", "createdWith": "..." },
  "referenceScale": 2700,
  "territories": [{
    "code": "FR-MET",
    "projectionId": "conic-conformal",
    "projectionFamily": "CONIC",
    "parameters": { "rotate": [...], "parallels": [...], "scaleMultiplier": 1 },
    "layout": { "translateOffset": [0, 0], "clipExtent": [...] },
    "bounds": [[...], [...]]
  }]
}
```

## Import System

**Process**: Parse JSON → Check version → Validate structure → Check atlas compatibility → Apply to stores

**Application**: Sets projection via CompositeProjection, applies scale/translation to territory store

### Version Migration (ConfigMigrator)

- Plugin-based chain migration (v1.0 → v1.1 → v1.2)
- Automatic detection and migration during import
- `needsMigration()`, `canMigrate()`, `migrateToCurrentVersion()`

## NPM Package: @atlas-composer/projection-loader

### Features
- **Zero runtime dependencies** - users register projection factories
- **Plugin architecture** - `loader.register(id, factory)`
- **ESM-only** with TypeScript definitions
- **Tree-shakeable** - import only needed projections

### Usage
```typescript
import { ProjectionLoader } from '@atlas-composer/projection-loader'
import { geoConicConformal } from 'd3-geo'

const loader = new ProjectionLoader()
loader.register('conic-conformal', () => geoConicConformal())
const projection = loader.load(config, { width: 800, height: 600 })
```

### API

| Method | Purpose |
|----------|---------|
| `new ProjectionLoader()` | Create loader instance |
| `loader.register(id, factory)` | Register projection factory |
| `loader.registerAll(map)` | Bulk registration |
| `loader.load(config, options)` | Load composite projection |
| `loader.loadFromJSON(jsonString, options)` | Parse and load |
| `validateConfig(config)` | Validate configuration |
| `loader.clear()` | Clear registry |

### Package Structure
- Location: `packages/projection-loader/`
- Bundle: ~8KB ESM (vs 100KB with bundled deps)

## Preset Creation

1. Adjust positions in composite-custom mode
2. Export via Export Dialog (JSON)
3. Save to `configs/presets/{atlas-id}-{variant}.json`
4. Reference in atlas config via `defaultPreset`

## Testing

| Component | Tests |
|-----------|-------|
| CompositeExportService | 10 |
| CompositeImportService | 13 |
| **Total** | **23** |
