---
'@atlas-composer/preset-library': minor
---

`buildTerritories` gives a polygon of another resolution than 50m without counterpart at 50m to the first territory without `polygonIndices` whose bounds contain it. At 50m and 110m, it leaves out of the collection a territory without `polygonIndices` that has no polygon, and lists its code in `emptyTerritories`, so that an atlas can hold islands that Natural Earth draws at 10m only.
