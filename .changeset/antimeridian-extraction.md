---
'@atlas-composer/preset-library': minor
---

Fit a polygon in the bounds of a territory whose `minLon` exceeds `maxLon` as bounds that cross the antimeridian: `buildTerritories` gives a territory without `polygonIndices` each polygon whose outer ring has every vertex in its bounds, within 0.1 degree, by the rule of `isPointInBounds` of `@atlas-composer/projection-core`. The atlas schema describes these bounds. The atlases of the library keep their territories.
