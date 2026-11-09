# d3-composite-projections to Atlas Composer mapping

`d3-composite-projections` writes each composite as a JavaScript function that sets the parameters of one d3 projection per territory. Atlas Composer reads the same parameters from a composite preset in `configs/presets/<atlas>/`. This document gives the conversion of each value.

`packages/specification/schemas/` defines the format of a composite preset, and `packages/specification/__tests__/fixtures/valid/minimal.json` is a complete file in this format. `configs/presets/usa/usa-pseudo-d3cp.json` applies the conversions below to `albersUsa`, and takes `US-PR`, `US-GU` and `US-AS` from `albersUsaTerritories`. `configs/presets/france/france-pseudo-d3cp.json` copies the projections, `rotate`, `center`, `parallels` and multipliers of `conicConformalFrance`, with offsets adjusted by hand: the territories of the right column share an x offset of 320.

[docs/architecture.md](architecture.md) gives the order in which the values of a preset combine with the other levels of parameters.

## Parameters

In the source of a composite, `k` is the scale of the main projection and `[x, y]` is the translation of the composite.

- `k` becomes `referenceScale`, at the root of the file. It is the default scale of the composite: 2700 for `conicConformalFrance` and 1070 for `albersUsa`.
- The d3 constructor becomes `projection.id` and `projection.family`, according to the list in the next section.
- `.center([lon, lat])` becomes `projection.parameters.center`, with the same values.
- `.rotate([λ, φ])` becomes `projection.parameters.rotate`, with the same values. A third value γ is optional.
- `.parallels([p1, p2])` becomes `projection.parameters.parallels`, with the same values.
- `.scale(_ * m)` becomes `projection.parameters.scaleMultiplier`, with the value `m`.
- `.translate([x + a * k, y + b * k])` becomes `layout.translateOffset`, in pixels at the reference scale.
- `.clipExtent(...)` becomes `layout.pixelClipExtent`, in pixels at the reference scale and relative to the translation of the territory.

## Projection identifiers

`PROJECTION_CATALOG`, in `packages/specification/src/catalog.ts`, holds the identifier, the family and the aliases of each projection of the format.

- `conicConformal()` is `conic-conformal`, of family `CONIC`.
- `conicEqualArea()` is `conic-equal-area`, of family `CONIC`.
- `conicEquidistant()` is `conic-equidistant`, of family `CONIC`.
- `albers()` is `conic-equal-area`, of family `CONIC`, and `albers` is an alias of this identifier. d3 sets the parameters of `geoAlbers` in its constructor, so the preset writes them: `rotate` is `[96, 0]`, `center` is `[-0.6, 38.7]` and `parallels` is `[29.5, 45.5]`.
- `mercator()` is `mercator`, of family `CYLINDRICAL`.
- `transverseMercator()` is `transverse-mercator`, of family `CYLINDRICAL`.
- `equirectangular()` is `equirectangular`, of family `CYLINDRICAL`.
- `stereographic()` is `stereographic`, of family `AZIMUTHAL`.

## Scale

The scale of a territory is the product of the reference scale and its multiplier.

```typescript
territoryScale = referenceScale * scaleMultiplier

// French Guiana in conicConformalFrance: guyane.scale(_ * 0.6)
// 2700 * 0.6 = 1620
```

`ProjectionLoader` multiplies `referenceScale` by the smaller of the two ratios between the requested size and `canvasDimensions`.

## Translation

The offset is the coefficient of `k` multiplied by the reference scale.

```typescript
// d3-composite-projections
guyane.translate([x - 0.12 * k, y + 0.0575 * k])

// preset, with referenceScale 2700
translateOffset = [-0.12 * 2700, 0.0575 * 2700] // [-324, 155.25]
```

## Clip extent

`d3-composite-projections` gives the clip extent relative to the translation of the composite. `calculateClipExtentFromPixelOffset`, in `packages/projection-core/src/bounds/clip-extent.ts`, adds `pixelClipExtent` to the translation of the territory, so each coefficient of the conversion is the difference with the coefficient of the translation. The function adds the epsilon of the d3 source.

```typescript
// d3-composite-projections
guyane
  .translate([x - 0.12 * k, y + 0.0575 * k])
  .clipExtent([
    [x - 0.14 * k + epsilon, y + 0.029 * k + epsilon],
    [x - 0.0996 * k - epsilon, y + 0.0864 * k - epsilon],
  ])

// preset, with referenceScale 2700
pixelClipExtent = [
  (-0.14 + 0.12) * 2700,      // -54
  (0.029 - 0.0575) * 2700,    // -76.95
  (-0.0996 + 0.12) * 2700,    // 55.08
  (0.0864 - 0.0575) * 2700,   // 78.03
]
```
