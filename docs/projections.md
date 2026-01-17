# Projection System

## Overview

- **20+ Projections**: D3 builtin, extended, and composite
- **Type Safety**: Full TypeScript support
- **Smart Recommendations**: Context-aware scoring (atlas, view mode)
- **Extensible**: Simple definition files

## Architecture

```
src/core/projections/
├── types.ts           # TypeScript types
├── registry.ts        # Singleton registry with recommendation engine
├── factory.ts         # Projection factory
├── parameters.ts      # Parameter configuration
└── definitions/       # Projection definitions (composite, conic, azimuthal, cylindrical, world)
```

## Projection Definition

```typescript
{
  id: 'conic-conformal',
  name: 'Lambert Conformal Conic',
  category: 'RECOMMENDED',           // RECOMMENDED | STANDARD | SPECIALIZED | ARTISTIC
  family: 'conic',                   // conic | azimuthal | cylindrical | world | composite
  strategy: 'D3_BUILTIN',            // D3_BUILTIN | D3_EXTENDED | D3_COMPOSITE
  d3Name: 'geoConicConformal',
  capabilities: { preservesAngles: true, supportsClipping: true },
  recommendedForAtlases: ['france']
}
```

## Projection Families

| Family | Best For | Examples |
|--------|----------|----------|
| **conic** | Mid-latitudes (30-60) | Conic Conformal, Albers |
| **azimuthal** | Polar regions (60+) | Stereographic, Azimuthal Equal Area |
| **cylindrical** | Equatorial (±30) | Mercator, Equirectangular |
| **world** | Global maps | Natural Earth, Robinson |
| **composite** | Multi-territory | France, USA, Portugal composites |

## Recommendation Levels

| Level | Score | Icon | Meaning |
|-------|-------|------|---------|
| excellent | >= 80 | ri-star-fill | Atlas recommended |
| good | >= 60 | ri-star-line | Good compatibility |
| usable | >= 40 | ri-star-half-line | Default level |
| not-recommended | < 40 | - | Atlas prohibited |

## Canonical Positioning

Store uses canonical format; conversion to D3 methods at render time:

```typescript
{ focusLongitude: number, focusLatitude: number, rotateGamma?: number }
```

**D3 Conversion**:
- CYLINDRICAL: `projection.center([focusLon, focusLat])`
- CONIC/AZIMUTHAL: `projection.rotate([-focusLon, -focusLat, gamma])`

## Composite Projection ClipExtent

Each territory has fixed `pixelClipExtent` [x1, y1, x2, y2] relative to translate position.

**Constraint**: clipExtent is in screen coordinates and DOES NOT MOVE. Content can move outside clip region when parameters change.

## Parameter Relevance by Family

| Family | rotateLon | rotateLat | centerLon | centerLat | parallels |
|--------|-----------|-----------|-----------|-----------|-----------|
| cylindrical | Y | Y | - | - | - |
| conic | Y | - | Y | Y | Y |
| azimuthal | Y | Y | - | - | - |
| pseudocylindrical | Y | Y | - | - | - |

## Fitting Modes

| Mode | Domain | Scale | Use Case |
|------|--------|-------|----------|
| **AUTO** | Fits to data | Calculated | Exploring, comparing |
| **MANUAL** | Disabled | User-controlled | Presentations, exports |

## Parameter Management

**Inheritance Priority**: Territory override > Global default > Atlas default

**Validation**: Family-based relevance, range validation, real-time feedback

## Interactive Panning

- **Supported**: Azimuthal, Cylindrical, Pseudocylindrical, Polyhedral families
- **Scaling**: 0.5 degrees per pixel
- **Latitude Lock**: Default locked, unlockable via toggle

## Adding New Projection

1. Add definition to `definitions/{family}.ts`
2. Export from `definitions/index.ts`
3. Registry auto-discovers on load

## Related Docs

- [atlases.md](atlases.md) - Atlas configuration
- [presets.md](presets.md) - Preset system
- [d3-to-atlas-parameter-mapping.md](d3-to-atlas-parameter-mapping.md) - D3 parameter details
