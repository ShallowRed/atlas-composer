# @atlas-composer/projection-loader

> A simple runtime engine for composite projections.

This package allows you to render composite projections exported from **Atlas Composer** in your own applications. It is lightweight, and works seamlessly with D3.js.

## Features

- **Zero runtime dependencies** (excluding your choice of projection library).
- **plugin architecture**: Only import the projection definitions you need.
- **Type-Safe**: Written in TypeScript with full type definitions.

## Installation

```bash
npm install @atlas-composer/projection-loader d3-geo
```

## Usage

```typescript
import { ProjectionLoader } from '@atlas-composer/projection-loader'
import * as d3 from 'd3-geo'
import config from './my-exported-config.json'

// Create a loader instance
const loader = new ProjectionLoader()

// Register the projections required by your composite projection
loader.register('mercator', () => d3.geoMercator())
loader.register('conic-conformal', () => d3.geoConicConformal())

// Load the composite projection
const projection = loader.load(config, {
  width: 800,
  height: 600
})

// Use with D3
const path = d3.geoPath(projection)

d3.select('svg')
  .selectAll('path')
  .data(geojson.features)
  .join('path')
  .attr('d', path)
```

## API

### ProjectionLoader

- `new ProjectionLoader()` - Create a loader instance
- `loader.register(id, factory)` - Register a projection factory
- `loader.registerAll(factories)` - Register multiple projections from an object
- `loader.load(config, options)` - Load a composite projection from configuration
- `loader.loadFromJSON(jsonString, options)` - Load from a JSON string
- `loader.isRegistered(id)` - Check if a projection is registered
- `loader.getRegistered()` - Get all registered projection IDs
- `loader.unregister(id)` - Remove a registered projection
- `loader.clear()` - Clear all registered projections

## 🙏 Acknowledgments

This package uses composite projection techniques derived from [d3-geo](https://github.com/d3/d3-geo) by [Mike Bostock](https://github.com/mbostock) (ISC License), with inspiration from [d3-composite-projections](https://github.com/rveciana/d3-composite-projections) by [Roger Veciana](https://github.com/rveciana). See [NOTICES.md](./NOTICES.md) for details.

## 📄 License

MIT © [ShallowRed](https://github.com/ShallowRed)
