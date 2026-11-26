# @atlas-composer/projection-core

> Low-level projection and stream utilities.

This package contains the mathematical core and stream manipulation logic used by `@atlas-composer/projection-loader` and the main application. It provides pure, zero-dependency tools for building complex map projections.

## Core Functions

- **Stream Multiplexing**: Splits a D3 geo stream into multiple branches (for creating composite views).
- **Bounds Calculation**: Utilities for measuring projected geometry.
- `placeCylindrical` gives the `center` and `rotate` of a sub-projection in a composite: a `mercator` or an `equirectangular` placed by its center has its cut on the meridian opposite this center. `CENTER_PLACED_CYLINDRICAL_IDS` lists these projections.
- `isPointInBounds` tells whether a point is in a geographic box; a box whose `minLon` exceeds `maxLon` crosses the antimeridian.
- `applyRenderingParameters` applies `clipAngle`, `precision` and the clip extent of a sub-projection.
- **Coordinate Transformation**: Helpers for managing complex projection pipelines.

> **Note:** Most users should use `@atlas-composer/projection-loader` instead of this package directly.

## Acknowledgments

This package is derived from [d3-geo](https://github.com/d3/d3-geo) by [Mike Bostock](https://github.com/mbostock) (ISC License), with inspiration from [d3-composite-projections](https://github.com/rveciana/d3-composite-projections) by [Roger Veciana](https://github.com/rveciana). See [NOTICES.md](./NOTICES.md) for details.

## License

MIT © [ShallowRed](https://github.com/ShallowRed)
