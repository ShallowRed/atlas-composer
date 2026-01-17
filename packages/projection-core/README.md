# @atlas-composer/projection-core

Core utilities for composite map projections. Zero-dependency pure functions for stream handling, bounds checking, and projection composition.

## Overview

This package provides the foundational building blocks used by both:
- `@atlas-composer/projection-loader` - Standalone loader for exported configurations
- Atlas Composer application - Interactive projection composer

## Features

- **Zero dependencies** - Pure TypeScript functions with no runtime dependencies
- **D3-compatible** - Works with any D3-geo compatible projection
- **Tree-shakeable** - Import only what you need
- **Type-safe** - Full TypeScript support with exported interfaces

## Installation

```bash
pnpm add @atlas-composer/projection-core
```

## API

### Types

```typescript
import type {
  GeoBounds,
  ProjectionLike,
  StreamLike,
  SubProjectionEntry,
} from '@atlas-composer/projection-core'
```

### Stream Utilities

```typescript
import {
  createPointCaptureStream,
  createStreamMultiplexer,
} from '@atlas-composer/projection-core'

// Create a point capture stream for projection routing
const { pointStream, getCapturedPoint, resetCapture } = createPointCaptureStream()

// Create a stream that fans out to multiple projections
const multiplex = createStreamMultiplexer(projections)
```

### Bounds Utilities

```typescript
import {
  boundsFromArray,
  boundsToArray,
  calculateClipExtentFromBounds,
  calculateClipExtentFromPixelOffset,
  isPointInBounds,
} from '@atlas-composer/projection-core'

// Check if a geographic point is within bounds
const inBounds = isPointInBounds(lon, lat, bounds)

// Calculate clip extent from geographic bounds
const clipExtent = calculateClipExtentFromBounds(projection, bounds)
```

### Invert Utilities

```typescript
import { invertWithBoundsValidation } from '@atlas-composer/projection-core'

// Invert screen coordinates with territory bounds validation
const result = invertWithBoundsValidation([x, y], entries, { tolerance: 0.01 })
```

### Composite Builder

```typescript
import { buildCompositeProjection } from '@atlas-composer/projection-core'

// Build a composite projection from sub-projection entries
const composite = buildCompositeProjection({
  entries: [
    { id: 'usa', name: 'Continental USA', projection: usaProj, bounds: usaBounds },
    { id: 'alaska', name: 'Alaska', projection: alaskaProj, bounds: alaskaBounds },
  ],
})

// Use like any D3 projection
const path = d3.geoPath(composite)
```

## License

MIT
