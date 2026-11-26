# @atlas-composer/projection-core

## 1.4.0

### Minor Changes

- a8073c0: Read the bounds of a territory whose `minLon` exceeds `maxLon` as crossing the antimeridian, as `geoBounds` of d3-geo writes them: `isPointInBounds` reads such bounds as holding the longitudes from `minLon` to 180 and from −180 to `maxLon`, so that the composite projection and its inverse place the points of such a territory on both sides of the antimeridian. The specification describes these bounds. projection-loader 3.5.0 is the first version that reads them; an earlier loader reads them as empty and returns `null` for the points of the territory.
- f52f9f1: The inverse of a composite projection takes the pixel in the last sub-projection whose clip extent contains it, the one drawn at that pixel, and returns its inverse when the bounds of its territory contain it, or `null`. A sub-projection without clip extent contains every pixel. `inExtent(extent, point)` of `@atlas-composer/projection-core` tells whether a clip extent contains a pixel.
- eb5a7a8: Place a `mercator` or an `equirectangular` of a composite by its `center: [λ, φ]` with its cut on the meridian λ + 180, opposite its center, when its `rotate` is missing or has all its values at zero, and it has no `clipAngle`: `placeCylindrical` of `@atlas-composer/projection-core` gives `rotate([-λ, 0, 0])` and `center([0, φ])`, and the loader applies them. Each point keeps its image on the side of the center, and a point beyond the cut moves by a turn of the world, so that a territory whose bounds cross the antimeridian is drawn in one piece. For these territories, the PROJ pipeline of `describeComposite` and of `atlas-composer describe` becomes `+proj=merc +lon_0=λ`.
  
  projection-loader draws a file exported before this version differently in two cases, both for a `mercator` or an `equirectangular` placed by its center. Without `pixelClipExtent`, with bounds that reach more than 180° from λ on one side, the frame drawn from the corners of the bounds is inverted and the territory is left out. With a `pixelClipExtent`, the part of a geometry beyond the meridian λ + 180 moves by a turn of the world. The Aleutian Islands of an export from atlas-composer, with their former bounds `[[-178.19, 51.37], [179.78, 63.73]]`, are such a case: to draw them in one piece, write their bounds across the antimeridian, `[[172.49, 51.37], [-159.36, 63.73]]`, in the file.

## 1.3.0

### Minor Changes

- 49f9750: `clipAngle` of `ProjectionLike` reads and sets `number | null`, as a d3 projection does, so that TypeScript 6 accepts a d3 projection as a `ProjectionLike`. An object written by hand that implements `ProjectionLike` declares the parameter of `clipAngle` as `number | null`.

## 1.2.0

### Minor Changes

- 9809865: `CompositeBuildInput` names the input of `buildCompositeProjection`. `CompositeProjectionConfig` stays as a deprecated alias of it, since `@atlas-composer/specification` gives this name to the format of the exported file.

## 1.1.0

### Minor Changes

- b74a0d3: `applyRenderingParameters` of `@atlas-composer/projection-core` applies `clipAngle`, `precision` and the clip extent of a sub-projection.

  A territory without `pixelClipExtent` is clipped at its `bounds`, in the loader as in the application. A territory with neither is not clipped. The format stays 1.1, so a file 1.1 without `pixelClipExtent` is drawn differently by this version of the loader and by the previous ones.

## 1.0.2

### Patch Changes

- 8ee3030: Add third-party license attribution for d3-geo and d3-composite-projections

  - Add NOTICES.md files to both packages with proper ISC and BSD-3-Clause license attribution
  - Add JSDoc comments attributing stream multiplexer and composite builder to d3-geo
  - Include NOTICES.md in published npm package files
  - Update README files with acknowledgments section

## 1.0.1

### Patch Changes

- Add npm publishing infrastructure and configuration
