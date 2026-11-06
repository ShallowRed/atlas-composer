# @atlas-composer/specification

> The data contract of the Atlas Composer ecosystem.

This package defines the composite projection configuration, format 1.1, that the editor exports, the loader reads and the presets follow. The JSON Schema of `schemas/` is the definition of the format: the build generates the validation code and the TypeScript types from it.

## Contents

- The JSON Schemas, draft-07, exported as `@atlas-composer/specification/schemas/composite-projection` and `@atlas-composer/specification/schemas/definitions`.
- `validateConfig`, which applies the schema, and the types `CompositeProjectionConfig`, `TerritoryConfig` and the others of the schema.
- `PROJECTION_CATALOG`, the projection identifiers with their family and aliases, and `resolveProjectionAlias`.
- The values of the format: `SPECIFICATION_VERSION`, `PROJECTION_FAMILIES`, `PROJECTION_PARAMETER_KEYS`, `DEFAULT_REFERENCE_SCALE` and `DEFAULT_SCALE_MULTIPLIER`.

## Usage

```typescript
import { validateConfig } from '@atlas-composer/specification'

const { valid, errors } = validateConfig(JSON.parse(json))
if (!valid) {
  for (const { path, message } of errors)
    console.error(`${path}: ${message}`)
}
```

Each error has a `path` such as `territories[0].code`, the message of the schema and a `code`: `MISSING_FIELD`, `INVALID_TYPE`, `VERSION_UNSUPPORTED` or `INVALID_VALUE`. `isCompositeProjectionConfig(value)` narrows a value that `validateConfig` accepts.

## Format

A configuration declares a `version` of major 1, such as `"1.1"`. Beyond the schema, `validateConfig` refuses two territories with the same `code`, a rule that JSON Schema cannot express.

A territory without `pixelClipExtent` is not clipped. A territory without `bounds` is drawn, and the composite projection of `@atlas-composer/projection-loader` returns `null` for its points.

The scale of a territory is `referenceScale` × `scaleMultiplier`, and `scaleMultiplier` defaults to `DEFAULT_SCALE_MULTIPLIER`. The schema accepts the parameters `scale`, `distance` and `tilt`, which the loader ignores.

`resolveProjectionAlias` gives the catalog identifier of an alias: `albers` is `conic-equal-area`, and `natural-earth-1` is `natural-earth`.
