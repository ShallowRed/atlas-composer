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

### France

| Preset ID | Type | Description |
|-----------|------|-------------|
| `france-standard` | composite-custom | Standard layout with overseas territories |
| `france-proportional` | composite-custom | D3CP-style proportional layout |
| `france-pseudo-d3cp` | composite-custom | Mimics d3-composite-projections |
| `france-builtin-d3cp` | built-in-composite | Uses d3-composite-projections library |
| `france-split` | split | Territories displayed separately |
| `france-unified` | unified | Single world projection |

### Portugal

| Preset ID | Type | Description |
|-----------|------|-------------|
| `portugal-standard` | composite-custom | Standard with Azores and Madeira |
| `portugal-builtin` | built-in-composite | Uses d3-composite-projections |
| `portugal-split` | split | Territories separately |
| `portugal-unified` | unified | Single projection |

### USA

| Preset ID | Type | Description |
|-----------|------|-------------|
| `usa-albers` | built-in-composite | Albers projection (D3 built-in) |
| `usa-pseudo-d3cp` | composite-custom | Custom D3CP-style layout |
| `usa-builtin-d3cp` | built-in-composite | Uses d3-composite-projections |
| `usa-builtin-territories` | built-in-composite | Includes PR, Guam, etc. |
| `usa-split` | split | States displayed separately |
| `usa-unified` | unified | Single projection |

### Europe

| Preset ID | Type | Description |
|-----------|------|-------------|
| `europe-builtin` | built-in-composite | Uses d3-composite-projections |
| `europe-split` | split | Countries separately |
| `europe-unified` | unified | Single projection |

### World

| Preset ID | Type | Description |
|-----------|------|-------------|
| `world-unified` | unified | Natural Earth projection |

## API Reference

### Listing Presets

```typescript
import { getDefaultPreset, getPresetsForAtlas, listPresets } from '@atlas-composer/preset-library'

// List all presets
const all = listPresets()

// Filter by atlas
const france = listPresets({ atlasId: 'france' })

// Filter by type
const composites = listPresets({ type: 'composite-custom' })

// Filter by region
const european = listPresets({ region: 'europe' })

// Filter by tags
const d3cpStyle = listPresets({ tags: ['d3cp-style'] })

// Get all presets for an atlas
const usaPresets = getPresetsForAtlas('usa')

// Get default preset for an atlas
const defaultFrance = getDefaultPreset('france')
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
