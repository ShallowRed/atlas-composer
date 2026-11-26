# @atlas-composer/cli

## 0.3.0

### Minor Changes

- ccc88cf: `territories` and `compose` name on the standard error the territories without polygon at the chosen resolution, such as the islands of the Brazil atlas, which Natural Earth draws at 10m only.

### Patch Changes

- 5cf46d5: Give the Aleutian Islands of the `usa` atlas their bounds across the antimeridian, `[[172.49, 51.37], [-159.36, 63.73]]`. At 10m, the territory `US-ALEU` takes one more polygon, the island whose centroid is at [−178.96, 51.36], which `atlas-composer territories usa --resolution 10m` writes from this version on. projection-loader 3.4.x or older, reading a composite exported with `US-ALEU` from this version on, returns `null` for its points, draws it cut at the antimeridian when it has a `pixelClipExtent`, and leaves it out without one.
- eb5a7a8: Place a `mercator` or an `equirectangular` of a composite by its `center: [λ, φ]` with its cut on the meridian λ + 180, opposite its center, when its `rotate` is missing or has all its values at zero, and it has no `clipAngle`: `placeCylindrical` of `@atlas-composer/projection-core` gives `rotate([-λ, 0, 0])` and `center([0, φ])`, and the loader applies them. Each point keeps its image on the side of the center, and a point beyond the cut moves by a turn of the world, so that a territory whose bounds cross the antimeridian is drawn in one piece. For these territories, the PROJ pipeline of `describeComposite` and of `atlas-composer describe` becomes `+proj=merc +lon_0=λ`.
  
  projection-loader draws a file exported before this version differently in two cases, both for a `mercator` or an `equirectangular` placed by its center. Without `pixelClipExtent`, with bounds that reach more than 180° from λ on one side, the frame drawn from the corners of the bounds is inverted and the territory is left out. With a `pixelClipExtent`, the part of a geometry beyond the meridian λ + 180 moves by a turn of the world. The Aleutian Islands of an export from atlas-composer, with their former bounds `[[-178.19, 51.37], [179.78, 63.73]]`, are such a case: to draw them in one piece, write their bounds across the antimeridian, `[[172.49, 51.37], [-159.36, 63.73]]`, in the file.
- Updated dependencies [5cf46d5]
- Updated dependencies [a8073c0]
- Updated dependencies [294a247]
- Updated dependencies [07ece2c]
- Updated dependencies [c47a1a5]
- Updated dependencies [f52f9f1]
- Updated dependencies [eb5a7a8]
- Updated dependencies [62c45dd]
- Updated dependencies [a9deaba]
- Updated dependencies [6b4294c]
- Updated dependencies [3226e0c]
  - @atlas-composer/preset-library@2.8.0
  - @atlas-composer/projection-loader@3.5.0

## 0.2.0

### Minor Changes

- db67e18: `compose` reads Natural Earth at the resolution of `--resolution`, `50m` by default, and `territories` builds an atlas with extraction rules at `10m` and `110m` too: each polygon goes to the territory of the `50m` polygon that contains it or is nearest.

### Patch Changes

- Updated dependencies [aa6c9de]
- Updated dependencies [a6e806a]
  - @atlas-composer/preset-library@2.6.0

## 0.1.0

### Minor Changes

- 7878dae: Add the `atlas-composer` command: `territories <atlas>` writes the territories of an atlas as GeoJSON from Natural Earth or from a file of features, `compose <preset|file.json> --out <file>` writes the territories placed in a composite projection, in longitudes and latitudes to display in EPSG:3857, and `describe <preset|file.json>` writes the PROJ pipeline and the frame of each territory of a composite projection.

### Patch Changes

- Updated dependencies [a1f4979]
- Updated dependencies [b07cdd2]
- Updated dependencies [61c0ec6]
- Updated dependencies [c034b79]
- Updated dependencies [2ba4f8c]
  - @atlas-composer/preset-library@2.2.0
  - @atlas-composer/projection-loader@3.2.0
