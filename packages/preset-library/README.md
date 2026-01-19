# @atlas-composer/preset-library

> A curated collection of composite map presets.

This package provides ready-to-use configurations for common composite maps (like France with its territories, the USA, etc.). It is designed to work with `@atlas-composer/projection-loader`.

## Usage

```bash
npm install @atlas-composer/preset-library @atlas-composer/projection-loader
```

```typescript
import { getPreset } from '@atlas-composer/preset-library'
import { loadCompositeProjection, registerProjection } from '@atlas-composer/projection-loader'
import * as d3 from 'd3-geo'

// ... register D3 projections ...

// 1. Fetch a standard preset
const config = await getPreset('france-standard')

// 2. Load it into a usable projection
if (config) {
  const projection = loadCompositeProjection(config, { width: 800, height: 600 })
  // ... render with D3
}
```

## Available presets

- **France**: `france-standard` (Composite), `france-unify` (Unified)
- **USA**: `usa-albers` (Composite)
- **Europe**: `europe-lambert` (Composite)
- And more...

See the catalog source or the Atlas Composer app for a visual preview.
