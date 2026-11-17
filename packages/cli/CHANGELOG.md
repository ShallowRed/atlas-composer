# @atlas-composer/cli

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
