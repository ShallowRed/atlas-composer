# @atlas-composer/specification

## 2.3.0

### Minor Changes

- a8073c0: Read the bounds of a territory whose `minLon` exceeds `maxLon` as crossing the antimeridian, as `geoBounds` of d3-geo writes them: `isPointInBounds` reads such bounds as holding the longitudes from `minLon` to 180 and from −180 to `maxLon`, so that the composite projection and its inverse place the points of such a territory on both sides of the antimeridian. The specification describes these bounds. projection-loader 3.5.0 is the first version that reads them; an earlier loader reads them as empty and returns `null` for the points of the territory.
- eb5a7a8: Place a `mercator` or an `equirectangular` of a composite by its `center: [λ, φ]` with its cut on the meridian λ + 180, opposite its center, when its `rotate` is missing or has all its values at zero, and it has no `clipAngle`: `placeCylindrical` of `@atlas-composer/projection-core` gives `rotate([-λ, 0, 0])` and `center([0, φ])`, and the loader applies them. Each point keeps its image on the side of the center, and a point beyond the cut moves by a turn of the world, so that a territory whose bounds cross the antimeridian is drawn in one piece. For these territories, the PROJ pipeline of `describeComposite` and of `atlas-composer describe` becomes `+proj=merc +lon_0=λ`.
  
  projection-loader draws a file exported before this version differently in two cases, both for a `mercator` or an `equirectangular` placed by its center. Without `pixelClipExtent`, with bounds that reach more than 180° from λ on one side, the frame drawn from the corners of the bounds is inverted and the territory is left out. With a `pixelClipExtent`, the part of a geometry beyond the meridian λ + 180 moves by a turn of the world. The Aleutian Islands of an export from atlas-composer, with their former bounds `[[-178.19, 51.37], [179.78, 63.73]]`, are such a case: to draw them in one piece, write their bounds across the antimeridian, `[[172.49, 51.37], [-159.36, 63.73]]`, in the file.

## 2.2.0

### Minor Changes

- 01afabd: Add the JSON Schema of the neutral description, exported as `@atlas-composer/specification/schemas/neutral-composite`, and its type `NeutralComposite`: one PROJ pipeline and one clip ring per territory of a composite projection.

## 2.1.0

### Minor Changes

- b74a0d3: `applyRenderingParameters` of `@atlas-composer/projection-core` applies `clipAngle`, `precision` and the clip extent of a sub-projection.

  A territory without `pixelClipExtent` is clipped at its `bounds`, in the loader as in the application. A territory with neither is not clipped. The format stays 1.1, so a file 1.1 without `pixelClipExtent` is drawn differently by this version of the loader and by the previous ones.

## 2.0.0

### Major Changes

- 489ca0e: The package describes format 1.1, and the build generates `validateConfig` and the types from the JSON Schema.

  `validateConfig` applies the schema, so it refuses configurations that 1.0.1 accepted: an unknown property, a territory `code` or an `atlasId` outside its pattern, a family outside the list, a `version` whose major is not 1. `isCompositeProjectionConfig` applies the whole schema; 1.0.1 checked the type of five fields. Each error keeps a `path` such as `territories[0].code`, and two territories with the same code are still refused. The warnings on `bounds` are removed, and `warnings` is empty.

  Format 1.1 adds the family `POLYHEDRAL` and the parameter `precision`, a positive number, and makes `pixelClipExtent` optional: a territory without it is not clipped. `exportDate` follows an ISO 8601 pattern.

  The package exports `PROJECTION_CATALOG` and `resolveProjectionAlias`, which resolves `albers` to `conic-equal-area` and `natural-earth-1` to `natural-earth`, and the constants `PROJECTION_FAMILIES`, `PROJECTION_PARAMETER_KEYS`, `DEFAULT_REFERENCE_SCALE` and `DEFAULT_SCALE_MULTIPLIER`. `SPECIFICATION_VERSION` is `"1.1"`, and `MIN_SUPPORTED_VERSION` is removed: `validateVersion` accepts every version of major 1.

  The types follow the schema: `ProjectionParameters` has `precision` and neither `focusLongitude` nor `focusLatitude`, which the schema refused; `bounds` and `pixelClipExtent` are optional; `territories` has at least one item.

## 1.0.1

### Patch Changes

- Add npm publishing infrastructure and configuration
