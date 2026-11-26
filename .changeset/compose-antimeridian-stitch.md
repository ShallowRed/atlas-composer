---
'@atlas-composer/cli': patch
---

`compose` joins the pieces of a territory that Natural Earth cuts at the antimeridian, through `geoStitch` of d3-geo-projection, before it places them in the composition: a territory placed by a projection that cuts elsewhere, such as the main islands of the `fiji` atlas, is written as polygons that GEOS reads as valid, with Vanua Levu and Taveuni in one piece each.
