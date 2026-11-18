---
'@atlas-composer/projection-core': patch
'@atlas-composer/projection-loader': patch
---

The inverse of a composite projection returns the point of the sub-projection drawn at the pixel: it tries the sub-projections from the last one drawn to the first, and skips one whose clip extent leaves out the pixel. In `japan-standard`, the pixel of Naha inverts to [127.68, 26.21], where the inverse returned a point of the sea in the sub-projection of the mainland, [137.25, 31.23].
