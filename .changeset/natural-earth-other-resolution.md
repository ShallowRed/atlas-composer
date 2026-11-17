---
'@atlas-composer/preset-library': minor
---

`buildTerritories` builds an atlas with extraction rules at another resolution than 50m, such as 10m, when `createNaturalEarthSource` receives the features of the 50m topology in its third argument. Each polygon goes to the territory of the 50m polygon that contains it or is nearest, and `leftOutPolygons` lists the polygons that Natural Earth draws at this resolution only, far from their territory.
