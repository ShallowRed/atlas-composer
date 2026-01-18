# @atlas-composer/projection-loader

> A simple runtime engine for composite projections.

This package allows you to render composite projections exported from **Atlas Composer** in your own applications. It is lightweight, and works seamlessly with D3.js.

## Features

- **Zero runtime dependencies** (excluding your choice of projection library).
- **plugin architecture**: Only import the projection definitions you need.
- **Type-Safe**: Written in TypeScript with full type definitions.

## Usage

### 1. Install

```bash
npm install @atlas-composer/projection-loader d3-geo
```

### 2. Implementation

```typescript
import { loadCompositeProjection, registerProjection } from '@atlas-composer/projection-loader'
import * as d3 from 'd3-geo'
import config from './my-exported-config.json'

// 1. Register the projections required by your composite projection
registerProjection('mercator', () => d3.geoMercator())
registerProjection('conic-conformal', () => d3.geoConicConformal())

// 2. Load the composite projection
// The resulting object is a standard D3 stream-compatible projection
const projection = loadCompositeProjection(config, {
  width: 800,
  height: 600
})

// 3. Render using D3
const path = d3.geoPath(projection)

d3.select('svg')
  .selectAll('path')
  .data(geojson.features)
  .join('path')
  .attr('d', path)
```
