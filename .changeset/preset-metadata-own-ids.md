---
'@atlas-composer/preset-library': patch
---

`getPresetMetadata` returns `undefined` for an id that names a member of `Object.prototype`, such as `constructor`.
