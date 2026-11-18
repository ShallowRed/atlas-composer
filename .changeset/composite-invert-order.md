---
'@atlas-composer/projection-core': minor
'@atlas-composer/projection-loader': patch
---

The inverse of a composite projection takes the pixel in the last sub-projection whose clip extent contains it, the one drawn at that pixel, and returns its inverse when the bounds of its territory contain it, or `null`. A sub-projection without clip extent contains every pixel. `inExtent(extent, point)` of `@atlas-composer/projection-core` tells whether a clip extent contains a pixel.
