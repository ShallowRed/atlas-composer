---
'@atlas-composer/preset-library': minor
'@atlas-composer/cli': patch
---

Give the Aleutian Islands of the `usa` atlas their bounds across the antimeridian, `[[172.49, 51.37], [-159.36, 63.73]]`. At 10m, the territory `US-ALEU` takes one more polygon, the island whose centroid is at [−178.96, 51.36], which `atlas-composer territories usa --resolution 10m` writes from this version on. projection-loader 3.4.x or older, reading a composite exported with `US-ALEU` from this version on, returns `null` for its points, draws it cut at the antimeridian when it has a `pixelClipExtent`, and leaves it out without one.
