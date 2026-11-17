---
'@atlas-composer/cli': minor
---

`compose` reads Natural Earth at the resolution of `--resolution`, `50m` by default, and `territories` builds an atlas with extraction rules at `10m` and `110m` too: each polygon goes to the territory of the `50m` polygon that contains it or is nearest.
