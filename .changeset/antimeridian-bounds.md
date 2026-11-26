---
'@atlas-composer/projection-core': minor
'@atlas-composer/projection-loader': minor
'@atlas-composer/specification': minor
---

Read the bounds of a territory whose `minLon` exceeds `maxLon` as crossing the antimeridian, as `geoBounds` of d3-geo writes them: `isPointInBounds` reads such bounds as holding the longitudes from `minLon` to 180 and from −180 to `maxLon`, so that the composite projection and its inverse place the points of such a territory on both sides of the antimeridian. The specification describes these bounds. projection-loader 3.5.0 is the first version that reads them; an earlier loader reads them as empty and returns `null` for the points of the territory.
