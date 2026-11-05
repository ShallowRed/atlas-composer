---
"@atlas-composer/projection-loader": patch
---

The type declarations include the types of `@atlas-composer/specification`, so a project that installs the loader alone compiles with `skipLibCheck: false`. `naturalEarth1` comes from `d3-geo`, and the `d3-geo-projection` peer dependency is removed. `load()` accepts every configuration version of major 1.
