# Export System

## Overview
The export system enables users to use their custom composite projections outside Atlas composer:
- **JSON Export** - Configuration data for import/backup/version control
- **Code Export** - Ready-to-use code in D3.js (JS/TS) or Observable Plot
- **NPM Package** - `@atlas-composer/projection-loader` for runtime loading
- **Preset Creation** - Export configurations as presets for default atlas layouts

## Architecture

### Export Pipeline
1. **Configuration Serialization** - Convert projection state to JSON
2. **Code Generation** - Generate code that uses NPM loader package
3. **User Delivery** - Copy to clipboard or download file
4. **User Feedback** - Toast notifications for success/error

### Import Pipeline
1. **File Upload** - JSON file via modal dialog
2. **Validation** - Schema validation, version check, atlas compatibility
3. **Preview** - Show configuration details before applying
4. **Application** - Apply to stores (projection, scale, translation)

### Key Files
- `src/services/export/composite-export-service.ts` - Export orchestration
- `src/services/export/composite-import-service.ts` - Import validation & application
- `src/services/export/code-generator.ts` - Code generation (D3/Plot)
- `src/components/ui/CompositeExportDialog.vue` - Export UI
- `src/components/ui/ImportModal.vue` - Import UI
- `packages/projection-loader/` - Standalone NPM package (loader implementation)

## Configuration Export (composite-export-service.ts)

### Registry-Based Export System
Export system now integrates with the unified parameter registry for complete parameter coverage.

### ExportedCompositeConfig Type
Serialized projection configuration with:
- `metadata` - Export metadata (atlasId, atlasName, exportDate, createdWith, notes)
- `referenceScale` - Base scale for territory scaling
- `territories[]` - Array of territory configurations
  - `code` - Territory identifier
  - `name` - Territory display name
  - `projectionId` - D3 projection identifier
  - `projectionFamily` - Projection family type
  - `parameters` - Complete registry-based parameter set
  - `layout` - Layout configuration (translateOffset, clipExtent)
  - `bounds` - Geographic bounds [[minLon, minLat], [maxLon, maxLat]]

### CompositeExportService.exportToJSON()
Registry-integrated export with complete parameter coverage:
- Uses `ProjectionParameterProvider` for complete parameter resolution
- Leverages parameter registry for all exportable parameters
- Maintains backward compatibility with legacy D3-based export
- Parameter provider integration: `parameterProvider.getExportableParameters()`
- Registry-based parameter validation and metadata
- Complete parameter inheritance resolution: territory → global → atlas → registry defaults

## Code Generation (code-generator.ts)

### Formats

#### D3 JavaScript (generateD3JS)
Generates standalone JavaScript function:
```javascript
function createCompositeProjection(width, height) {
  const proj0 = d3.geoAzimuthalEqualArea()
    .center([2.5, 47])
    .rotate([-2.5, -47])
    // ... parameters
  
  const compositeProjection = d3.geoProjection(function(lon, lat) {
    // Stream multiplexing logic
  })
  
  return compositeProjection
}
```

#### D3 TypeScript (generateD3TS)
Adds TypeScript type annotations:
```typescript
function createCompositeProjection(
  width: number,
  height: number
): d3.GeoProjection {
  // ... same as JS with types
}
```

#### Observable Plot (generateObservablePlot)
Generates Plot-compatible projection function:
```javascript
function createCompositeProjection({ width, height }) {
  // Sub-projections
  // Stream multiplexing
  // Returns Plot-compatible projection
}
```

### Stream Multiplexing Protocol

All formats implement D3 stream protocol for routing geometry to sub-projections.

#### D3 Stream API Requirements
The stream protocol requires strict method call ordering:
1. `polygonStart()` - Begin a polygon (multi-ring)
2. `lineStart()` - Begin a ring/line
3. `point(lon, lat)` - Add point to current ring
4. `lineEnd()` - End current ring/line
5. `polygonEnd()` - End polygon

Polygons = polygonStart + (one or more rings) + polygonEnd
Each ring = lineStart + points + lineEnd

#### State Machine Implementation
Four tracking variables manage stream routing:
- `activeStream` - Currently selected sub-projection stream (null when undecided)
- `polygonActive` - Whether inside polygon (between polygonStart/polygonEnd)
- `polygonStarted` - Whether polygonStart() was called on active stream
- `ringActive` - Whether inside ring (between lineStart/lineEnd)

#### Stream Methods

**point(lon, lat)**
Routes point to appropriate sub-projection based on geographic bounds:
1. Find matching stream by checking if `[lon, lat]` falls within territory bounds
2. If first point of ring (`!ringActive`):
   - Set `activeStream` to matched stream
   - Set `ringActive = true`
   - If in polygon and not started, call `s.polygonStart()` and set `polygonStarted = true`
   - Call `s.lineStart()`
3. Call `s.point(lon, lat)` on active stream

**lineStart()**
Marks start of new ring:
- Reset `ringActive = false`
- Active stream determined by first point

**lineEnd()**
Marks end of ring:
- Call `activeStream.lineEnd()` if stream exists
- If NOT in polygon, reset `activeStream = null` (single-ring features)
- If in polygon, preserve `activeStream` for multi-ring polygons

**polygonStart()**
Marks start of polygon:
- Set `polygonActive = true`
- Reset `polygonStarted = false`
- Reset `activeStream = null` (critical for feature independence)

**polygonEnd()**
Marks end of polygon:
- Call `activeStream.polygonEnd()` if stream exists and started
- Reset all state: `activeStream = null`, `polygonActive = false`, `polygonStarted = false`

#### Feature Independence
Critical requirement: Each GeoJSON feature must independently select its stream.

The `activeStream = null` reset in `polygonStart()` ensures:
- First polygon selects stream based on its first point
- Second polygon selects different stream based on its first point
- No stream leakage between features

Without this reset, all features would use the same stream (first feature's stream), causing territories to disappear or render in wrong locations.

#### Geographic Bounds Routing
Each territory has bounds `[[minLon, minLat], [maxLon, maxLat]]`.

Point routing checks if point falls within any territory's bounds:
```javascript
const epsilon = 1e-6
const isInBounds = 
  lon >= bounds[0][0] - epsilon && 
  lon <= bounds[1][0] + epsilon &&
  lat >= bounds[0][1] - epsilon && 
  lat <= bounds[1][1] + epsilon
```

Epsilon (1e-6) provides small tolerance for floating point comparisons.

### Number Precision

JavaScript floating point arithmetic can produce precision errors:
- `-61.46000000000001` instead of `-61.46`
- `-17.110000000000003` instead of `-17.11`

Solution: Round all coordinates to 6 decimals in generated code.

Helper functions:
```typescript
roundNumber(n: number, decimals = 6): number {
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}

formatNumberArray(arr: number[]): string {
  return `[${arr.map(n => roundNumber(n)).join(', ')}]`
}
```

Applied to all projection parameters:
- center, rotate, parallels, scale, translate, bounds

### Projection Name Mapping

D3 projection IDs use kebab-case (e.g., `azimuthal-equal-area`).
D3 function names use camelCase (e.g., `d3.geoAzimuthalEqualArea`).

Mapping logic:
```typescript
const projectionMap: Record<string, string> = {
  'azimuthal-equal-area': 'geoAzimuthalEqualArea',
  'azimuthal-equidistant': 'geoAzimuthalEquidistant',
  // ... 20+ projections
}
```

Function: `getD3ProjectionFunction(projectionId: string): string`
- Returns D3 function name for projection ID
- Used in code generation templates

## Composite Export Service (composite-export-service.ts)

### Version Management
The service imports version information from `package.json` for embedded configuration metadata:
```typescript
import packageJson from '../../../package.json'
const version = packageJson.version || '1.0'
```

This ensures:
- Single source of truth for version numbers
- Automatic version updates with package releases
- Fallback to '1.0' for development builds
- Consistent versioning across exported configurations

### Export Orchestration
Coordinates the export pipeline:
- Serializes configuration via ConfigExporter
- Generates code via CodeGenerator
- Handles file downloads and clipboard operations
- Manages export format selection (JSON, D3 JS/TS, Observable Plot)

## UI Integration (ExportModal.vue)

### Features
- Format selection (D3 JS/TS, Observable Plot)
- One-click copy to clipboard
- Success/error notifications
- Modal dialog with proper keyboard navigation

### Component Dependencies
- Uses `ConfigExporter` for serialization
- Uses `CodeGenerator` for code generation
- Uses `useToast` composable for notifications
- Integrates with `uiStore` for modal state

## Preset Creation Workflow

Presets provide high-quality default layouts for atlases. The export system is used to create presets:

### Process
1. **Manual Adjustment** - User adjusts territory positions, projections, and scales in composite-custom mode
2. **Export Configuration** - User exports via Export Configuration dialog (JSON format)
3. **Save as Preset** - Exported JSON is saved to `configs/presets/{atlas-id}-{variant}.json`
4. **Validate** - Preset is validated against `configs/presets/preset.schema.json`
5. **Configure Atlas** - Atlas config references preset via `defaultPreset` field
6. **Auto-Load** - Preset loads automatically when atlas is selected

### Preset Format
Presets use the ExportedCompositeConfig format:
- Same structure as exported configurations
- Validated by CompositeImportService
- Loaded by PresetLoader service
- Applied to stores on atlas initialization

### Benefits
- Consistent default layouts across sessions
- Professional starting points for users
- Sharable and version-controlled
- No code changes required

See `configs/presets/README.md` for detailed preset creation instructions.

## Testing

### Test Coverage
- ✅ 15 tests for config export (config-exporter.spec.ts)
- ✅ 25 tests for code generation (code-generator.spec.ts)
- ✅ 10 tests for preset loading (preset-loader.spec.ts)
- Tests validate:
  - Configuration serialization
  - D3 JS/TS code generation
  - Observable Plot code generation
  - Projection name mapping
  - Number formatting and rounding
  - Stream multiplexing logic
  - Preset loading and conversion

### Known Limitations
- No validation of generated code syntax (future: AST parsing)
- No runtime testing of generated projections (future: headless browser tests)

## Usage Example

Generated code can be used in Observable notebooks, standalone HTML, or Node.js:

```javascript
// In Observable Plot
Plot.plot({
  projection: createCompositeProjection,
  marks: [
    Plot.geo(world, {stroke: "currentColor"})
  ]
})

// In D3
const svg = d3.select("svg")
const projection = createCompositeProjection(960, 500)
const path = d3.geoPath(projection)
svg.selectAll("path")
  .data(features)
  .join("path")
  .attr("d", path)
```

## Import System

### CompositeImportService
Re-imports exported JSON configurations back into Atlas composer with full type safety.

**Features**:
- ✅ Schema validation with detailed error messages
- ✅ Version compatibility checking (currently v1.0)
- ✅ Atlas compatibility warnings (allows cross-atlas import with warnings)
- ✅ Complete parameter restoration (projection + scale + translation)
- ✅ Type-safe store integration

**Import Process**:
1. **Parse JSON** - `importFromJSON(jsonString)`
2. **Check Version** - Automatically migrate if needed
3. **Validate Structure** - Check required fields, data types
4. **Check Compatibility** - Atlas ID validation
5. **Return Result** - `{ config?, errors[], warnings[], migrated?, fromVersion? }`

**Application Process**:
6. **Apply to Stores** - `applyToStores(config, stores)`
   - Sets territory projection via CompositeProjection service
   - Applies scale multiplier to territory store
   - Applies translation offset to territory store
   - Maintains state consistency

**Type Safety Improvements**:
- Replaced all `any` types with proper store types
- Uses `ReturnType<typeof useConfigStore>` pattern
- Proper CompositeProjection API usage (`updateTerritoryProjection`)
- Store methods: `setTerritoryProjection`, `setTerritoryScale`, `setTerritoryTranslation`

## Version Management System

### ConfigMigrator Service
File: `src/services/export/config-migrator.ts`

Handles automatic migration of exported configurations between schema versions.

**Current Version**: `1.0`

**Architecture**:
- **Plugin-based chain** - Migrations execute sequentially (v1.0 → v1.1 → v1.2)
- **Pure functions** - No side effects, detailed logging
- **Automatic integration** - Import service calls migrator transparently
- **Type-safe** - `AnyVersionConfig` union type for all supported versions

**Core API**:
```typescript
// Check if config needs migration
ConfigMigrator.needsMigration(config: AnyVersionConfig): boolean

// Check if migration is possible
ConfigMigrator.canMigrate(config: AnyVersionConfig): boolean

// Perform migration to current version
ConfigMigrator.migrateToCurrentVersion(config: AnyVersionConfig): MigrationResult

// Migration result type
interface MigrationResult {
  success: boolean
  config?: ExportedCompositeConfig  // Current version
  messages: string[]                 // Info messages
  errors: string[]                   // Critical errors
  warnings: string[]                 // Non-critical issues
}
```

**Migration Flow**:
1. **Version Detection** - Parse `config.version` field
2. **Support Check** - Verify version is in `SUPPORTED_VERSIONS`
3. **Chain Execution** - Apply migrations sequentially
4. **Validation** - Verify result matches current schema
5. **Result Return** - Success/failure with detailed messages

**Automatic Integration**:
The import service automatically detects and migrates old configurations:
```typescript
// In CompositeImportService.importFromJSON()
if (ConfigMigrator.needsMigration(parsedConfig)) {
  const migrationResult = ConfigMigrator.migrateToCurrentVersion(parsedConfig)
  if (migrationResult.success) {
    config = migrationResult.config!
    warnings.push(`Configuration migrated from v${fromVersion} to v${config.version}`)
  }
}
```

**Adding New Versions**:
When the export schema changes, add a migration function:
```typescript
// In config-migrator.ts
function migrateV1ToV2(config: ExportedCompositeConfigV1): ExportedCompositeConfigV2 {
  // Transform config structure
  // Add new required fields with defaults
  // Update version field
  return migratedConfig
}

// Update performMigrationChain()
if (fromVersion === '1.0' && toVersion === '2.0') {
  config = migrateV1ToV2(config)
  currentVersion = '2.0'
}
```

**Version Type System**:
File: `src/types/export-config.ts`
```typescript
export type ConfigVersion = '1.0' // Add '1.1' | '1.2' as needed

export interface BaseExportedConfig {
  version: ConfigVersion
  metadata: ExportMetadata
  territories: TerritoryConfig[]
}

export type ExportedCompositeConfigV1 = BaseExportedConfig & {
  version: '1.0'
  // v1.0 specific fields
}

// Union type for all versions
export type AnyVersionConfig = ExportedCompositeConfigV1 // | ExportedCompositeConfigV2
```

### ImportModal Component
File: `src/components/ui/ImportModal.vue`

**Features**:
- Drag-and-drop file upload
- File picker fallback
- JSON validation with error display
- Configuration preview (atlas, territories, parameters)
- Inline alert notifications for errors/warnings
- Apply button to commit changes

**User Flow**:
1. Open modal from map view
2. Drop JSON file or click to browse
3. View validation results (errors prevent import)
4. Review configuration details
5. Click "Import" to apply
6. Modal closes, map updates

### UI Feedback System

**Toast Notifications** (in UIStore):
- Success messages (green) for successful operations
- Error messages (red) for failures
- Auto-dismiss after 3 seconds (configurable)
- Manual dismiss option
- Bilingual support (EN/FR)

**Toast API**:
```typescript
// In ui.ts store
showToast(message: string, type: 'info' | 'success' | 'error', duration = 3000): string
dismissToast(id: string): void
clearAllToasts(): void
```

**Integration Points**:
- ✅ Export dialog: Copy success/error, download success/error
- ⏸️ Import modal: Deferred (uses inline alerts currently)

**Translations** (in i18n/locales/):
```json
{
  "export": {
    "copySuccess": "Configuration copied to clipboard successfully!",
    "copyError": "Failed to copy to clipboard. Please try again.",
    "downloadSuccess": "File downloaded successfully!",
    "downloadError": "Failed to download file. Please try again."
  }
}
```

## NPM Package: @atlas-composer/projection-loader

### Overview
Standalone package for loading exported composite projection configurations.
Published at `packages/projection-loader/` with **zero runtime dependencies**.

### Package Architecture
- **ESM-only** build with tree-shaking support
- **Plugin architecture** - users register projection factories at runtime
- **Peer dependencies** - d3-geo, d3-geo-projection (user's choice of version)
- **TypeScript support** - Full type definitions included

### Build Configuration
- Built with **tsup** (fast TypeScript bundler)
- Output: ESM + Type declarations (.d.ts)
- Source maps included for debugging
- Bundle size: ~8KB (ESM), ~8KB (types)

### Exports
```typescript
// Main loader function
loadCompositeProjection(config: ExportedCompositeConfig, options: LoaderOptions): ProjectionLike

// Plugin registration
registerProjection(id: string, factory: ProjectionFactory): void
clearProjections(): void

// Optional D3 helpers (separate entry point)
import { createD3Projections } from '@atlas-composer/projection-loader/d3-helpers'
```

### Usage Pattern
Generated code follows this pattern:
```typescript
import { geoConicConformal } from 'd3-geo'
import { loadCompositeProjection, registerProjection } from '@atlas-composer/projection-loader'

export function createFranceProjection() {
  // Register projection factories
  registerProjection('conic-conformal', () => geoConicConformal())
  
  // Embedded JSON configuration
  const config = { /* ExportedCompositeConfig */ }
  
  // Load composite projection
  return loadCompositeProjection(config, { width: 800, height: 600 })
}
```

### Plugin Architecture Benefits
1. **Zero dependencies** - Package doesn't bundle D3
2. **Version flexibility** - Users choose their D3 version
3. **Tree-shaking** - Only projections used are included
4. **Custom projections** - Users can register custom projection functions

### Files in Package
- `src/index.ts` - Main exports (loader + registration)
- `src/standalone-projection-loader.ts` - Core loader implementation
- `src/d3-projection-helpers.ts` - Optional D3 projection factories
- `__tests__/standalone-projection-loader.spec.ts` - Test suite (19 tests)
- `examples/` - Usage examples (node-basic, tree-shakeable, custom-projection, etc.)
- `README.md` - Usage documentation with examples
- `package.json` - Package metadata, exports, peer deps
- `tsconfig.json` - TypeScript configuration
- `tsup.config.ts` - Build configuration

### Architecture: Zero Dependencies
The loader has NO dependencies on d3-geo or d3-geo-projection. Instead, users register projection factories before loading configurations. This approach provides:
- No version conflicts
- Smaller bundle size (user includes only needed projections)
- Tree-shakeable imports
- Support for custom projection implementations
- Future-proof design

### API

#### Registration (Required First Step)
```typescript
import * as d3 from 'd3-geo'
import { 
  registerProjection, 
  registerProjections,
  loadCompositeProjection 
} from './standalone-projection-loader'

// Option 1: Register projections individually
registerProjection('mercator', () => d3.geoMercator())
registerProjection('albers', () => d3.geoAlbers())

// Option 2: Bulk registration using helper
import { d3ProjectionFactories } from './d3-projection-helpers'
registerProjections(d3ProjectionFactories)

// Now load configuration
const projection = loadCompositeProjection(config, { width: 800, height: 600 })
```

#### Loading Projections
```typescript
import { loadFromJSON, validateConfig } from './standalone-projection-loader'

// Load from JSON string
const projection = loadFromJSON(jsonString, { width: 800, height: 600 })

// Or parse first, then load
const config = JSON.parse(jsonString)
validateConfig(config)  // throws if invalid
const projection = loadCompositeProjection(config, { 
  width: 800, 
  height: 600,
  debug: true  // log territory selection
})

// Use with D3
const path = d3.geoPath(projection)
```

#### Registry Management
```typescript
import { 
  getRegisteredProjections,
  isProjectionRegistered,
  unregisterProjection,
  clearProjections 
} from './standalone-projection-loader'

// Check what's registered
const projections = getRegisteredProjections()  // ['mercator', 'albers', ...]

// Check if specific projection is registered
if (!isProjectionRegistered('mercator')) {
  registerProjection('mercator', () => d3.geoMercator())
}

// Cleanup
unregisterProjection('mercator')
clearProjections()  // remove all
```

### Features
- **Zero dependencies** - no d3-geo, no d3-geo-projection
- Plugin architecture with runtime registration
- No Atlas composer dependencies
- Works in browser, Node.js, Observable notebooks
- D3 stream multiplexing for geometry routing
- Geographic bounds-based territory selection
- Supports 14+ standard D3 projections + custom projections
- Type-safe with TypeScript definitions
- Tree-shakeable - import only needed projections

### Type Definitions
Self-contained types without external dependencies:
- `ProjectionLike` - D3-compatible projection interface with getter/setter pattern
- `ProjectionFactory` - Factory function type `() => ProjectionLike`
- `StreamLike` - D3 stream protocol interface
- `LoaderOptions` - Configuration options (width, height, debug, etc.)

### D3 Projection Helpers (Optional Companion)
`d3-projection-helpers.ts` provides ready-to-use D3 mappings:
```typescript
import { 
  d3ProjectionFactories,    // All projections
  mercator,                  // Individual (tree-shakeable)
  albers,
  registerAllD3Projections 
} from './d3-projection-helpers'

// Use bulk registration
registerProjections(d3ProjectionFactories)

// Or tree-shakeable individual imports
registerProjection('mercator', mercator)
registerProjection('albers', albers)
```

### Use Cases
- Embed Atlas composer projections in custom D3 visualizations
- Server-side rendering with Node.js
- Observable notebooks and interactive documents
- Static site generation
- Sharing projections with users who don't have Atlas composer
- Custom projection implementations for specialized use cases

### NPM Package (Workspace Package)
Location: `packages/projection-loader/`

**Package Details**:
- Name: `@atlas-composer/projection-loader`
- Version: 1.0.0
- Dependencies: 0 (zero runtime dependencies)
- peerDependencies: d3-geo, d3-geo-projection (optional)
- devDependencies: TypeScript, D3 libs, vitest
- Bundle size: ~8KB ESM (vs 100KB with bundled dependencies)
- Exports: ESM with TypeScript definitions
- Tests: 19 tests, 100% passing
- Examples: 5 usage examples (node-basic, tree-shakeable, custom-projection, browser-d3, france-example)

**Build Integration**:
- Built separately: `pnpm --filter @atlas-composer/projection-loader build`
- Integrated in main build: `pnpm build` runs `build:loader` first
- Independent test suite: `pnpm --filter @atlas-composer/projection-loader test`

**Ready for Publishing**:
Build system needed (Rollup/esbuild) to generate .js/.cjs files.
See PUBLISHING.md for complete publishing guide.

User controls D3 version and includes only needed projections.

## Testing
- CompositeExportService: 15 tests covering export, validation, file creation
- CompositeImportService: 13 tests covering import, validation, store integration
- CodeGenerator: 28 tests covering all formats, code generation, and import validation
  - Includes 3 tests validating generated imports match projection-loader package exports
- Standalone Loader: 19 tests covering loading, validation, projection functionality
Total: 75 tests for export/import system

## Future Enhancements
- Additional export formats (Leaflet, Mapbox GL JS adapters)
- Code minification option for generated code
- Browser preview of exported projection
- Batch export for multiple configurations
- CLI export/import tools (currently deferred due to module resolution issues)
