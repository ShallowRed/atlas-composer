---
'@atlas-composer/projection-core': minor
'@atlas-composer/projection-loader': minor
---

`clipAngle` of `ProjectionLike` reads and sets `number | null`, as a d3 projection does, so that TypeScript 6 accepts a d3 projection as a `ProjectionLike`. An object written by hand that implements `ProjectionLike` declares the parameter of `clipAngle` as `number | null`.
