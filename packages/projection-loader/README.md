# @atlas-composer/projection-loader

> Zero-dependency standalone loader for composite map projections with plugin architecture

A lightweight, framework-agnostic library for loading composite map projections exported from [Atlas Composer](https://github.com/ShallowRed/atlas-composer). Features a plugin architecture that lets you register only the projections you need, achieving **94% smaller bundle sizes** compared to including all D3 projections.

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
import * as d3 from 'd3-geo'
import { registerProjection, loadCompositeProjection } from '@atlas-composer/projection-loader'

// 1. Register projections (only what you need!)
registerProjection('mercator', () => d3.geoMercator())
registerProjection('conic-conformal', () => d3.geoConicConformal())

// 2. Load your exported configuration
import config from './france-composite.json'

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
import { geoMercator, geoConicConformal } from 'd3-geo'
import { registerProjections, loadCompositeProjection } from '@atlas-composer/projection-loader'

// Only these two projections will be in your bundle
registerProjections({
  'mercator': () => geoMercator(),
  'conic-conformal': () => geoConicConformal()
})

const projection = loadCompositeProjection(config, { width: 800, height: 600 })
```

**Result**: ~6KB instead of ~100KB (94% reduction) 🎉

## Observable Plot Integration

```typescript
import * as Plot from '@observablehq/plot'
import * as d3 from 'd3-geo'
import { registerProjection, loadCompositeProjection } from '@atlas-composer/projection-loader'

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
import * as d3 from 'd3-geo'
import { useEffect, useRef } from 'react'
import { loadCompositeProjection, registerProjections } from '@atlas-composer/projection-loader'

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
import * as d3 from 'd3-geo'
import { onMounted, ref } from 'vue'
import { loadCompositeProjection, registerProjections } from '@atlas-composer/projection-loader'

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
  <svg ref="svgRef" width="800" height="600" />
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
  'mercator': () => d3.geoMercator(),
  'albers': () => d3.geoAlbers()
})
```

#### `loadCompositeProjection(config: ExportedConfig, options: LoaderOptions): ProjectionLike`

Load a composite projection from an exported configuration.

```typescript
const projection = loadCompositeProjection(config, {
  width: 800,
  height: 600,
  enableClipping: true,  // optional, default: true
  debug: false           // optional, default: false
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

## Configuration Format

Exported configurations follow this structure:

```typescript
interface ExportedConfig {
  version: '1.0'
  metadata: {
    atlasId: string
    atlasName: string
  }
  pattern: 'single-focus' | 'equal-members'
  referenceScale: number
  territories: Territory[]
}

interface Territory {
  code: string
  name: string
  role: 'primary' | 'secondary' | 'member'
  projectionId: string
  projectionFamily: string
  parameters: {
    center?: [number, number]
    rotate?: [number, number, number]
    parallels?: [number, number]
    scale: number
    baseScale: number
    scaleMultiplier: number
  }
  layout: {
    translateOffset: [number, number]
    clipExtent: [[number, number], [number, number]] | null
  }
  bounds: [[number, number], [number, number]]
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

Contributions are welcome! This package is part of the [Atlas Composer](https://github.com/ShallowRed/atlas-composer) monorepo.

## License

MIT © Atlas Composer Contributors

## Related

- [Atlas Composer](https://github.com/ShallowRed/atlas-composer) - Create custom composite projections
- [D3.js](https://d3js.org/) - Data visualization library
- [Observable Plot](https://observablehq.com/plot/) - High-level plotting library
