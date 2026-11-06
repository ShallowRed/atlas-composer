---
"@atlas-composer/projection-loader": major
---

`load` and `loadFromJSON` validate the configuration against the schema of `@atlas-composer/specification` 2.0, and throw a `ConfigValidationError` for every configuration that the schema refuses. Its `errors` property lists the `path`, `message` and `code` of each error. The assertion `validateConfig` of the loader 2 is removed: the package exports `validateConfig` of the specification, which returns `{ valid, errors, warnings }` without throwing, and the types `ValidationError` and `ValidationResult`.

The loader applies the d3 parameters of the configuration as given. It reads neither `focusLongitude`, `focusLatitude` nor `family`, and it ignores `scale`, `distance` and `tilt`. A territory without `bounds` is loaded, and the composite projection returns `null` for its points.

An alias of the projection catalog takes the factory registered under it, else the factory of its identifier: `albers` is built by `geoConicEqualArea`, and `natural-earth-1` is an alias of `natural-earth`. The keys of `d3ProjectionFactories` are the identifiers of the catalog: the key `albers` is removed, and the key `natural-earth-1` is renamed `natural-earth`. The `./helpers` entry keeps its exports `albers`, created by `geoAlbers`, and `naturalEarth1`. To build `albers` with `geoAlbers`, as the loader 2 did:

```typescript
import { albers } from '@atlas-composer/projection-loader/helpers'

loader.register('albers', albers)
```
