# @atlas-composer/specification

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
