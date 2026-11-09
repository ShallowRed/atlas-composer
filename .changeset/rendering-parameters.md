---
'@atlas-composer/projection-core': minor
'@atlas-composer/projection-loader': minor
'@atlas-composer/specification': minor
---

`applyRenderingParameters` of `@atlas-composer/projection-core` applies `clipAngle`, `precision` and the clip extent of a sub-projection.

A territory without `pixelClipExtent` is clipped at its `bounds`, in the loader as in the application. A territory with neither is not clipped. The format stays 1.1, so a file 1.1 without `pixelClipExtent` is drawn differently by this version of the loader and by the previous ones.
