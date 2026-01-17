# @atlas-composer/preset-library

> Curated collection of composite map projection presets for Atlas Composer

Ready-to-use composite projection configurations for countries with geographically scattered territories (France, Portugal, USA, etc.). Works with `@atlas-composer/projection-loader`.

## Features

- **Ready-to-use Presets** - Pre-configured composite projections for common atlases
- **Catalog API** - List, filter, and discover available presets
- **TypeScript Support** - Full type definitions included
- **Tree-shakeable** - Import only the presets you need

## Installation

```bash
npm install @atlas-composer/preset-library @atlas-composer/projection-loader d3-geo
# or
pnpm add @atlas-composer/preset-library @atlas-composer/projection-loader d3-geo
```

## Quick Start

```typescript
import { getPreset, listPresets } from '@atlas-composer/preset-library'
import { loadCompositeProjection, registerProjection } from '@atlas-composer/projection-loader'
import * as d3 from 'd3-geo'

// Register projections
registerProjection('mercator', () => d3.geoMercator())
registerProjection('conic-conformal', () => d3.geoConicConformal())

// Load a preset
const config = await getPreset('france-standard')
if (config) {
  const projection = loadCompositeProjection(config, { width: 800, height: 600 })
  const path = d3.geoPath(projection)
  // Use with D3...
}
```

## Available Presets

### Composite Presets (Ready to Use)

These are the curated composite projection configurations that work directly with `@atlas-composer/projection-loader`:

| Preset ID | Atlas | Description |
|-----------|-------|-------------|
| `france-standard` | France | Standard layout with overseas territories |
| `france-proportional` | France | D3CP-style proportional layout |
| `france-pseudo-d3cp` | France | Mimics d3-composite-projections |
| `portugal-standard` | Portugal | Standard with Azores and Madeira |
| `usa-pseudo-d3cp` | USA | Custom D3CP-style layout |

### View Mode Presets (Atlas Composer App)

These presets are designed for the Atlas Composer web application and are not directly loadable:

| Type | Description |
|------|-------------|
| `built-in-composite` | References d3-composite-projections library functions |
| `split` | Territories displayed in separate viewports |
| `unified` | All territories in a single world projection |

Use `listPresets({ includeViewModes: true })` to include these in listings.

## API Reference

### Listing Presets

```typescript
import { getDefaultPreset, getPresetsForAtlas, listPresets } from '@atlas-composer/preset-library'

// List composite presets (default - excludes view modes)
const composites = listPresets()

// Filter by atlas
const france = listPresets({ atlasId: 'france' })

// Include view mode presets
const allFrance = listPresets({ atlasId: 'france', includeViewModes: true })

// Filter by type (explicitly includes that type)
const unified = listPresets({ type: 'unified' })

// Filter by region
const european = listPresets({ region: 'europe' })

// Filter by tags
const d3cpStyle = listPresets({ tags: ['d3cp-style'] })

// Get composite presets for an atlas
const usaPresets = getPresetsForAtlas('usa')

// Get default composite preset for an atlas
const defaultFrance = getDefaultPreset('france')
```

### View Mode Presets

```typescript
import { isViewModeType, listViewModePresets } from '@atlas-composer/preset-library'

// List all view mode presets
const viewModes = listViewModePresets()

// Check if a type is a view mode
isViewModeType('unified') // true
isViewModeType('composite-custom') // false
```

### Loading Presets

```typescript
import { getPreset, getPresetMetadata, getPresetPath } from '@atlas-composer/preset-library'

// Load preset configuration (async)
const config = await getPreset('france-standard')

// Get metadata only (sync)
const metadata = getPresetMetadata('france-standard')
// { id, name, description, atlasId, type, region, tags }

// Get file path for direct loading
const path = getPresetPath('france-standard')
// 'france/france-customcomposite-nsp.json'
```

### Discovery

```typescript
import { listAtlases, listRegions, listTypes } from '@atlas-composer/preset-library'

// Available atlases
listAtlases() // ['europe', 'france', 'portugal', 'usa', 'world']

// Available regions
listRegions() // ['france', 'portugal', 'usa', 'europe', 'world']

// Available preset types
listTypes() // ['composite-custom', 'built-in-composite', 'split', 'unified']
```

## Preset Types

| Type | Description | Loadable |
|------|-------------|----------|
| `composite-custom` | Custom composite projection with full configuration | Yes |
| `built-in-composite` | Uses d3-composite-projections library functions | No* |
| `split` | Territories displayed in separate viewports | No* |
| `unified` | All territories in a single world projection | No* |

*These types require Atlas Composer app or d3-composite-projections library

## Direct JSON Import

For bundlers that support JSON imports:

```typescript
// Import specific preset directly
import franceConfig from '@atlas-composer/preset-library/france/france-customcomposite-nsp.json'

// Use with projection-loader
const projection = loadCompositeProjection(franceConfig, { width: 800, height: 600 })
```

## Contributing New Presets

1. Create your preset using Atlas Composer app
2. Export the configuration as JSON
3. Add to `packages/preset-library/presets/<region>/`
4. Add metadata to `src/catalog.ts`
5. Submit a pull request

## Related Packages

| Package | Description |
|---------|-------------|
| [@atlas-composer/projection-loader](../projection-loader) | Load and use configurations |
| [@atlas-composer/specification](../specification) | Type definitions and schemas |

## License

MIT
