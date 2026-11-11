---
'@atlas-composer/preset-library': minor
---

Add `buildTerritories`, which builds one feature per territory of an atlas from a Natural Earth topology of `world-atlas` 2.0.2, through the extraction rules of the atlas, or from features of the user that carry the code of a territory. `createNaturalEarthSource` builds the first kind of source, `TerritoryBuildError` names the codes, indices and resolutions that the build refuses, and `rewindToRfc7946` orients a planar geometry as RFC 7946 asks.
