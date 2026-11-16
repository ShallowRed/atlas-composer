---
'@atlas-composer/projection-loader': minor
---

`ProjectionLike` extends the `ProjectionLike` of `@atlas-composer/projection-core`, with the `fit` methods of d3: a projection factory returns a projection with `stream`, `scale` and `translate`, which the composite already called. A setter of a projection returns the `ProjectionLike` of `@atlas-composer/projection-core`, without the `fit` methods. `StreamLike` re-exports the type of `@atlas-composer/projection-core`.
