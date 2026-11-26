---
'@atlas-composer/projection-core': minor
'@atlas-composer/projection-loader': minor
'@atlas-composer/specification': minor
'@atlas-composer/cli': patch
---

Place a `mercator` or an `equirectangular` of a composite by its `center: [λ, φ]` with its cut on the meridian λ + 180, opposite its center, when its `rotate` is missing or has all its values at zero, and it has no `clipAngle`: `placeCylindrical` of `@atlas-composer/projection-core` gives `rotate([-λ, 0, 0])` and `center([0, φ])`, and the loader applies them. Each point keeps its image on the side of the center, and a point beyond the cut moves by a turn of the world, so that a territory whose bounds cross the antimeridian is drawn in one piece. For these territories, the PROJ pipeline of `describeComposite` and of `atlas-composer describe` becomes `+proj=merc +lon_0=λ`.

projection-loader draws a file exported before this version differently in two cases, both for a `mercator` or an `equirectangular` placed by its center. Without `pixelClipExtent`, with bounds that reach more than 180° from λ on one side, the frame drawn from the corners of the bounds is inverted and the territory is left out. With a `pixelClipExtent`, the part of a geometry beyond the meridian λ + 180 moves by a turn of the world. The Aleutian Islands of an export from atlas-composer, with their former bounds `[[-178.19, 51.37], [179.78, 63.73]]`, are such a case: to draw them in one piece, write their bounds across the antimeridian, `[[172.49, 51.37], [-159.36, 63.73]]`, in the file.
