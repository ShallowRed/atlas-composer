# @atlas-composer/projection-loader

> Zero-dependency standalone loader for composite map projections with plugin architecture

A lightweight, framework-agnostic library for loading composite map projections exported from [Atlas composer](https://github.com/ShallowRed/atlas-composer). Features a plugin architecture that lets you register only the projections you need.

**✨ Latest**: Fully aligned with Atlas composer 2.0+ preset format including `pixelClipExtent` support.

## Features

- 🎯 **Zero Dependencies** - Bring your own projections (D3, Proj4, or custom)
- 📦 **Tree-Shakeable** - Only bundle what you use (~6KB vs 100KB)
- 🔌 **Plugin Architecture** - Register projections on-demand
- 🌐 **Framework Agnostic** - Works with D3, Observable Plot, React, Vue, Svelte
- 📘 **Full TypeScript Support** - Complete type definitions included
- ⚡ **Fast** - Optimized stream multiplexing for efficient rendering

## Installation

```bash
npm install @atlas-composer/projection-loader d3-geo d3-geo-projection
# or
pnpm add @atlas-composer/projection-loader d3-geo d3-geo-projection
# or
yarn add @atlas-composer/projection-loader d3-geo d3-geo-projection
```

## Quick Start

```typescript
import { loadCompositeProjection, registerProjection } from '@atlas-composer/projection-loader'
import * as d3 from 'd3-geo'

// 2. Load your exported configuration
import config from './france-composite.json'

// 1. Register projections (only what you need!)
registerProjection('mercator', () => d3.geoMercator())
registerProjection('conic-conformal', () => d3.geoConicConformal())

const projection = loadCompositeProjection(config, {
  width: 800,
  height: 600
})

// 3. Use with D3
const path = d3.geoPath(projection)

svg.selectAll('path')
  .data(features)
  .join('path')
  .attr('d', path)
  .attr('fill', 'lightgray')
  .attr('stroke', 'white')
```

## Usage with Helpers (Convenience)

For quick prototyping, use the optional helpers module:

```typescript
import { registerProjections } from '@atlas-composer/projection-loader'
import { d3ProjectionFactories } from '@atlas-composer/projection-loader/helpers'

// Register all standard D3 projections at once
registerProjections(d3ProjectionFactories)

// Now load your configuration
const projection = loadCompositeProjection(config, { width: 800, height: 600 })
```

## Tree-Shaking (Production)

For optimal bundle sizes, import only what you need:

```typescript
import { loadCompositeProjection, registerProjections } from '@atlas-composer/projection-loader'
import { geoConicConformal, geoMercator } from 'd3-geo'

// Only these two projections will be in your bundle
registerProjections({
  'mercator': () => geoMercator(),
  'conic-conformal': () => geoConicConformal()
})

const projection = loadCompositeProjection(config, { width: 800, height: 600 })
```

**Result**: ~6KB instead of ~100KB (94% reduction) 🎉

## Configuration Format

Supports the Atlas composer 2.0+ export format:

```json
{
  "version": "1.0",
  "metadata": {
    "atlasId": "france",
    "atlasName": "France",
    "exportDate": "2025-10-16T16:00:00.000Z",
    "createdWith": "atlas-composer"
  },
  "pattern": "single-focus",
  "referenceScale": 2700,
  "canvasDimensions": { "width": 960, "height": 500 },
  "territories": [
    {
      "code": "FR-MET",
      "name": "France Métropolitaine",
      "role": "primary",
      "projection": {
        "id": "conic-conformal",
        "family": "CONIC",
        "parameters": {
          "rotate": [-3, -46.2, 0],
          "parallels": [0, 60],
          "scaleMultiplier": 1
        }
      },
      "layout": {
        "translateOffset": [0, 0],
        "pixelClipExtent": [-268.92, -245.16, 260.99, 324]
      },
      "bounds": [[-6.5, 41], [10, 51.5]]
    }
  ]
}
```

### Key Features:
- **`pixelClipExtent`**: Direct pixel coordinates `[x1, y1, x2, y2]` relative to territory center
- **`scaleMultiplier`**: Scale factor applied to `referenceScale`
- **Nested projection structure**: `projection.id`, `projection.family`, `projection.parameters`

## Observable Plot Integration

```typescript
import { loadCompositeProjection, registerProjection } from '@atlas-composer/projection-loader'
import * as Plot from '@observablehq/plot'
import * as d3 from 'd3-geo'

// Register projections
registerProjection('mercator', () => d3.geoMercator())
registerProjection('conic-conformal', () => d3.geoConicConformal())

// Create projection factory for Plot
function createProjection({ width, height }) {
  return loadCompositeProjection(config, { width, height })
}

// Use with Plot
Plot.plot({
  width: 975,
  height: 610,
  projection: createProjection,
  marks: [
    Plot.geo(countries, { fill: 'lightgray', stroke: 'white' })
  ]
})
```

## Framework Examples

### React

```tsx
import { loadCompositeProjection, registerProjections } from '@atlas-composer/projection-loader'
import * as d3 from 'd3-geo'
import { useEffect, useRef } from 'react'

function MapComponent({ config }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    // Register projections once
    registerProjections({
      'mercator': () => d3.geoMercator(),
      'conic-conformal': () => d3.geoConicConformal()
    })

    // Create projection
    const projection = loadCompositeProjection(config, {
      width: 800,
      height: 600
    })

    // Render map
    const path = d3.geoPath(projection)
    const svg = d3.select(svgRef.current)

    svg.selectAll('path')
      .data(features)
      .join('path')
      .attr('d', path)
      .attr('fill', 'lightgray')
  }, [config])

  return <svg ref={svgRef} width={800} height={600} />
}
```

### Vue 3

```vue
<script setup lang="ts">
import { loadCompositeProjection, registerProjections } from '@atlas-composer/projection-loader'
import * as d3 from 'd3-geo'
import { onMounted, ref } from 'vue'

const props = defineProps<{ config: any }>()
const svgRef = ref<SVGSVGElement>()

onMounted(() => {
  registerProjections({
    'mercator': () => d3.geoMercator(),
    'conic-conformal': () => d3.geoConicConformal()
  })

  const projection = loadCompositeProjection(props.config, {
    width: 800,
    height: 600
  })

  const path = d3.geoPath(projection)
  const svg = d3.select(svgRef.value)

  svg.selectAll('path')
    .data(features)
    .join('path')
    .attr('d', path)
    .attr('fill', 'lightgray')
})
</script>

<template>
  <svg
    ref="svgRef"
    width="800"
    height="600"
  />
</template>
```

### Svelte

```svelte
<script lang="ts">
import * as d3 from 'd3-geo'
import { onMount } from 'svelte'
import { loadCompositeProjection, registerProjections } from '@atlas-composer/projection-loader'

export let config: any

let svgElement: SVGSVGElement

onMount(() => {
  registerProjections({
    'mercator': () => d3.geoMercator(),
    'conic-conformal': () => d3.geoConicConformal()
  })

  const projection = loadCompositeProjection(config, {
    width: 800,
    height: 600
  })

  const path = d3.geoPath(projection)
  const svg = d3.select(svgElement)

  svg.selectAll('path')
    .data(features)
    .join('path')
    .attr('d', path)
    .attr('fill', 'lightgray')
})
</script>

<svg bind:this={svgElement} width="800" height="600" />
```

## Custom Projections

You can register any projection factory, including custom implementations:

```typescript
import { registerProjection } from '@atlas-composer/projection-loader'

// Custom projection
registerProjection('my-custom', () => {
  // Return a D3-compatible projection
  return {
    // Implement projection interface
    (coordinates) => [x, y],
    scale: (s?) => s ? (scale = s, this) : scale,
    translate: (t?) => t ? (translate = t, this) : translate,
    // ... other D3 projection methods
  }
})

// Proj4 wrapper
import proj4 from 'proj4'

registerProjection('lambert93', () => {
  const projection = proj4('EPSG:2154')
  return {
    (coords) => projection.forward(coords),
    scale: () => 1,
    translate: () => [0, 0]
  }
})
```

## API Reference

### Core Functions

#### `registerProjection(id: string, factory: ProjectionFactory): void`

Register a projection factory with a given ID.

```typescript
registerProjection('mercator', () => d3.geoMercator())
```

#### `registerProjections(factories: Record<string, ProjectionFactory>): void`

Register multiple projections at once.

```typescript
registerProjections({
  mercator: () => d3.geoMercator(),
  albers: () => d3.geoAlbers()
})
```

#### `loadCompositeProjection(config: ExportedConfig, options: LoaderOptions): ProjectionLike`

Load a composite projection from an exported configuration.

```typescript
const projection = loadCompositeProjection(config, {
  width: 800,
  height: 600,
  enableClipping: true, // optional, default: true
  debug: false // optional, default: false
})
```

#### `loadFromJSON(jsonString: string, options: LoaderOptions): ProjectionLike`

Load a composite projection from a JSON string.

```typescript
const jsonString = fs.readFileSync('config.json', 'utf-8')
const projection = loadFromJSON(jsonString, { width: 800, height: 600 })
```

### Utility Functions

#### `getRegisteredProjections(): string[]`

Get list of registered projection IDs.

#### `isProjectionRegistered(id: string): boolean`

Check if a projection is registered.

#### `unregisterProjection(id: string): boolean`

Remove a projection from the registry.

#### `clearProjections(): void`

Clear all registered projections.

#### `validateConfig(config: any): boolean`

Validate a configuration object. Throws descriptive errors if invalid.

## TypeScript Types

Exported configurations follow this structure:

```typescript
interface ExportedConfig {
  version: '1.0'
  metadata: {
    atlasId: string
    atlasName: string
    exportDate?: string
    createdWith?: string
    notes?: string
  }
  pattern: 'single-focus' | 'equal-members'
  referenceScale: number
  canvasDimensions?: { width: number, height: number }
  territories: Territory[]
}

interface Territory {
  code: string
  name: string
  role: 'primary' | 'secondary' | 'member'
  projection: {
    id: string
    family: string
    parameters: ProjectionParameters
  }
  layout: Layout
  bounds: [[number, number], [number, number]]
}

interface ProjectionParameters {
  center?: [number, number]
  rotate?: [number, number, number]
  scaleMultiplier?: number
  parallels?: [number, number]
  clipAngle?: number
  precision?: number
}

interface Layout {
  translateOffset?: [number, number]
  pixelClipExtent?: [number, number, number, number] | null
}
```

## Bundle Size

| Approach | Bundle Size | Savings |
|----------|-------------|---------|
| All D3 projections | ~100KB | - |
| With projection-loader | ~6KB | **94%** 🎉 |

## TypeScript Support

Full TypeScript definitions are included. No need for `@types/*` packages.

```typescript
import type {
  ExportedConfig,
  LoaderOptions,
  ProjectionFactory,
  ProjectionLike,
  Territory
} from '@atlas-composer/projection-loader'
```

## Browser Support

Works in all modern browsers that support ES2020+. For older browsers, transpile with your build tool.

## Contributing

Contributions are welcome! This package is part of the [Atlas composer](https://github.com/ShallowRed/atlas-composer) monorepo.

## License

MIT © 2025 Lucas Poulain

## Related

- [Atlas composer](https://github.com/ShallowRed/atlas-composer) - Create custom composite projections
- [D3.js](https://d3js.org/) - Data visualization library
- [Observable Plot](https://observablehq.com/plot/) - High-level plotting library
