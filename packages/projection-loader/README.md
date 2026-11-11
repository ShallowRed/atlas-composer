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

`@atlas-composer/projection-loader/helpers` exports `d3ProjectionFactories`, the factories of `d3-geo` under the projection identifiers of `@atlas-composer/specification`, to register them all with `loader.registerAll(d3ProjectionFactories)`. An alias of the catalog, such as `albers` for `conic-equal-area` or `natural-earth-1` for `natural-earth`, takes the factory registered under it, else the factory of its identifier. To build `albers` with `geoAlbers`, register it under the alias:

```typescript
import { albers } from '@atlas-composer/projection-loader/helpers'

loader.register('albers', albers)
```

## Validation

`load` and `loadFromJSON` validate the configuration with `validateConfig` of `@atlas-composer/specification`, and throw a `ConfigValidationError` for a configuration that the format refuses. Its `errors` list the path and the message of each error:

```typescript
import { ConfigValidationError } from '@atlas-composer/projection-loader'

try {
  loader.loadFromJSON(json, { width: 800, height: 600 })
}
catch (error) {
  if (error instanceof ConfigValidationError) {
    for (const { path, message } of error.errors)
      console.error(`${path}: ${message}`)
  }
}
```

The package also exports `validateConfig`, which returns `{ valid, errors, warnings }` without throwing.

## Projection parameters

The loader applies `center`, `rotate`, `parallels`, `clipAngle` and `precision` when the configuration gives them, and keeps the value of the d3 factory otherwise. The scale of a territory is `referenceScale` × `scaleMultiplier`, and `scaleMultiplier` defaults to `DEFAULT_SCALE_MULTIPLIER` of the specification, 1. The loader ignores `scale`, `distance` and `tilt`, which the format accepts.

A territory without `pixelClipExtent` is clipped at its `bounds`, and a territory with neither is not clipped. A territory without `bounds` is drawn, and the composite projection returns `null` for its points.

## API

### ProjectionLoader

- `new ProjectionLoader()` - Create a loader instance
- `loader.register(id, factory)` - Register a projection factory
- `loader.registerAll(factories)` - Register multiple projections from an object
- `loader.load(config, options)` - Load a composite projection from configuration
- `loader.loadFromJSON(jsonString, options)` - Load from a JSON string
- `loader.createSubProjections(config, { scale, translate })` - Build a `Map` from the code of each territory to its sub-projection, with its clipping
- `loader.isRegistered(id)` - Check if a projection is registered
- `loader.getRegistered()` - Get all registered projection IDs
- `loader.unregister(id)` - Remove a registered projection
- `loader.clear()` - Clear all registered projections

### CompositeProjectionLike

The projection returned by `loader.load()` supports dynamic scaling:

```typescript
const projection = loader.load(config, { width: 960, height: 500 })

// Get/set scale dynamically (recalculates all sub-projections)
projection.scale() // Get current scale
projection.scale(5000) // Set new scale

// Get/set translate dynamically
projection.translate() // Get current translate [x, y]
projection.translate([480, 250]) // Set new translate

// Fit to new dimensions (compatible with Observable Plot)
projection.fitSize([800, 600], {})

// Fit to extent with margins
projection.fitExtent([[20, 20], [780, 580]], {})

// Inversion works with dynamic scaling
projection.invert([400, 300]) // Returns [lon, lat] or null
```

This makes the projection fully compatible with Observable Plot's auto-sizing behavior.

### Sub-projections

`createSubProjections` returns the projection of each territory, to project a geometry through the projection of its own territory. A `scale` equal to `referenceScale` and a `translate` at the center of `canvasDimensions` place the territories as the configuration draws them:

```typescript
const { referenceScale, canvasDimensions: { width, height } } = config
const subProjections = loader.createSubProjections(config, {
  scale: referenceScale,
  translate: [width / 2, height / 2],
})

const path = geoPath(subProjections.get('FR-GP'))
```

## Acknowledgments

This package uses composite projection techniques derived from [d3-geo](https://github.com/d3/d3-geo) by [Mike Bostock](https://github.com/mbostock) (ISC License), with inspiration from [d3-composite-projections](https://github.com/rveciana/d3-composite-projections) by [Roger Veciana](https://github.com/rveciana). See [NOTICES.md](./NOTICES.md) for details.

## License

MIT © [ShallowRed](https://github.com/ShallowRed)
