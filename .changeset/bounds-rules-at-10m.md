---
'@atlas-composer/preset-library': minor
---

`buildTerritories` gives a polygon of another resolution than 50m without counterpart at 50m to the first territory cut by its bounds whose bounds contain it, and leaves out of a build at 50m or 110m such a territory without polygon, so that an atlas can hold islands that Natural Earth draws at 10m only.
