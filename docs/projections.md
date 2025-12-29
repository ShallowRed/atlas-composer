# Projection System Quick Reference

## Core Features

- **Type Safety**: Full TypeScript support
- **Metadata-Rich**: Capabilities, suitability scores, recommendations
- **Smart Recommendations**: Context-aware scoring (atlas, view mode, geography)
- **20+ Projections**: D3 builtin, extended, and composite projections
- **Extensible**: Simple definition files for new projections

## Architecture

```
src/core/projections/
├── types.ts           # TypeScript types
├── registry.ts        # Singleton projection registry with recommendation engine
├── factory.ts         # Projection factory
├── parameters.ts      # Parameter configuration and defaults
└── definitions/       # Projection definitions by category
    ├── composite.ts   # France, Portugal, EU composites
    ├── conic.ts       # Conic projections
    ├── azimuthal.ts   # Azimuthal projections
    ├── cylindrical.ts # Cylindrical projections
    ├── compromise.ts  # Compromise projections
    ├── world.ts       # World projections
    └── artistic.ts    # Artistic/historical projections
```

## Projection Definition Structure

```typescript
{
  // Identification
  id: string                    // 'mercator', 'conic-conformal'
  name: string                  // 'Mercator', 'Lambert Conformal Conic'
  aliases?: string[]            // Alternative names

  // Classification
  category: 'RECOMMENDED' | 'STANDARD' | 'SPECIALIZED' | 'ARTISTIC'
  family: 'conic' | 'azimuthal' | 'cylindrical' | 'world' | 'composite'
  strategy: 'D3_BUILTIN' | 'D3_EXTENDED' | 'D3_COMPOSITE'

  // Technical
  d3Name: string                // D3 function name
  defaultParameters?: object    // Default projection parameters

  // Context awareness
  capabilities: {
    preservesArea?: boolean
    preservesAngles?: boolean
    preservesDistance?: boolean
    preservesDirection?: boolean
    supportsSplit?: boolean
    supportsGraticule?: boolean
    supportsClipping?: boolean      // D3 clipExtent support
    supportsCompositeClipping?: boolean  // Territory-specific clipExtent for composite projections
  }

  suitability: {
    polar?: number              // 0-100 for Arctic/Antarctic
    midLatitude?: number        // 0-100 for temperate zones (30-60°)
    equatorial?: number         // 0-100 for tropical zones (±30°)
    global?: number             // 0-100 for world maps
    regional?: number           // 0-100 for country/region maps
    france?: number             // Atlas-specific scores
    portugal?: number
    europe?: number
  }

  recommendedForAtlases?: string[]  // ['france', 'portugal']

  // Documentation
  description: string
  useCases?: string[]
}
```

## Projection Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `RECOMMENDED` | Best for common use cases | Mercator, Conic Conformal, Albers |
| `STANDARD` | General-purpose projections | Equirectangular, Stereographic |
| `SPECIALIZED` | Specific purposes | Gnomonic (navigation), Orthographic (globe view) |
| `ARTISTIC` | Creative/historical | Waterman Butterfly, Baker Dinomic |

## Projection Families

- `conic` - Best for mid-latitudes (30-60°): Conic Conformal, Albers, Conic Equal Area
- `azimuthal` - Best for polar regions (60°+): Stereographic, Azimuthal Equal Area, Orthographic
- `cylindrical` - Best for equatorial (±30°): Mercator, Equirectangular
- `world` - Best for global maps: Natural Earth, Robinson, Mollweide
- `composite` - Multi-projection layouts: France, Portugal, Spain, USA, EU, Netherlands, Japan, Ecuador, Chile, Malaysia, Equatorial Guinea, United Kingdom, Denmark

## Composite Projection ClipExtent

Composite projections support territory-specific clipExtent for precise content clipping.

**ClipExtent Format**:
- Pixel coordinates: `[x1, y1, x2, y2]` relative to territory position
- Managed through pixelClipExtent parameter in parameter registry
- Applied as territory-centered bounding box during CompositeProjection.build()
- Includes epsilon padding for precise clipping boundaries

**Implementation**:
- Parameter store provides pixelClipExtent values for each territory
- CompositeProjection reads pixelClipExtent from getParametersForTerritory method
- Automatically detects legacy normalized coordinates vs new pixel coordinates
- Composition borders automatically follow clipExtent regions when available
- Supports runtime updates through parameter store changes

**Coordinate System**:
- Pixel-based coordinates relative to territory translate position
- Converted to D3 clipExtent format `[[x1, y1], [x2, y2]]` internally
- Legacy normalized coordinate support maintained for backward compatibility
- Final clipExtent applied with epsilon padding for precise boundaries

## Recommendation System

The recommendation engine evaluates projections based on geographic context matching.

### Context Matching
Suitability levels (excellent, good, usable, avoid) contain `GeographicContext` objects with criteria:
- `territoryType`: mainland, overseas, island, archipelago, peninsula
- `region`: europe, africa, asia, oceania, americas, polar, world
- `scale`: local, regional, continental, global
- `latitudeRange`: { min, max } for latitude-based matching

The registry matches these criteria against territory properties to determine suitability.

### Recommendation Levels
- **excellent** (ri-star-fill): Atlas recommended list OR matches excellent suitability
- **good** (ri-star-line): Matches good suitability criteria
- **usable** (ri-star-half-line): Matches usable suitability OR default level
- **not-recommended**: Atlas prohibited list OR matches avoid criteria

### Filter Context

```typescript
interface ProjectionFilterContext {
  atlasId?: string              // 'france' | 'portugal' | 'spain' | 'europe'
  viewMode?: ViewMode           // 'composite' | 'split' | 'individual'
  territory?: {                 // Territory being configured
    id: string
    type: 'mainland' | 'overseas' | 'island' | 'archipelago' | 'peninsula'
    region?: string
  }
  category?: ProjectionCategory
  family?: ProjectionFamily
  capabilities?: {
    preservesArea?: boolean
    preservesAngles?: boolean
  }
  limit?: number                // Max results
}
```

## Quick Selection Guide

### By Latitude

- **60°+ (Polar)**: `azimuthal-equal-area`, `stereographic`
- **30°-60° (Mid-latitude)**: `conic-conformal`, `albers`, `conic-equal-area`
- **±30° (Equatorial)**: `mercator`, `equirectangular`
- **Global**: `natural-earth`, `robinson`, `mollweide`

### By Use Case

- **Country/Regional Maps**: `conic-conformal`, `albers`
- **Navigation**: `mercator`, `gnomonic`
- **Area Comparison**: `albers`, `azimuthal-equal-area`, `mollweide`
- **Globe View**: `orthographic`, `perspective`
- **Creative/Artistic**: `waterman-butterfly`, `baker-dinomic`

### By Atlas

- **France**: `conic-conformal-france` (composite), `conic-conformal`, `albers`
- **Portugal**: `conic-conformal-portugal` (composite), `conic-conformal`, `mercator`
- **Spain**: `conic-conformal-spain` (composite), `conic-conformal`, `albers`
- **USA**: `albers-usa` (composite), `albers-usa-territories` (composite), `albers`, `conic-conformal`
- **EU**: `conic-conformal-europe` (composite), `conic-conformal`, `albers`
- **Netherlands**: `conic-conformal-netherlands` (composite), `conic-conformal`, `mercator`
- **Japan**: `conic-equidistant-japan` (composite), `conic-conformal`, `conic-equal-area`
- **Ecuador**: `mercator-ecuador` (composite), `mercator`, `equirectangular`
- **Chile**: `transverse-mercator-chile` (composite), `transverse-mercator`, `mercator`
- **Malaysia**: `mercator-malaysia` (composite), `mercator`, `equirectangular`
- **Equatorial Guinea**: `mercator-equatorial-guinea` (composite), `mercator`, `equirectangular`
- **United Kingdom**: `albers-uk` (composite), `albers`, `conic-conformal`
- **Denmark**: `transverse-mercator-denmark` (composite), `transverse-mercator`, `conic-conformal`

## Capabilities Reference

| Capability | Preserves | Best For |
|------------|-----------|----------|
| `preservesArea` | Area/size | Statistical maps, choropleth |
| `preservesAngles` | Angles/shapes | Navigation, city maps |
| `preservesDistance` | Distance from center | Distance measurement |
| `preservesDirection` | Direction from center | Navigation, polar maps |

## Projection Parameters

### Unified Parameter Interface

Uses single `ProjectionParameters` interface across all systems:

```typescript
interface ProjectionParameters {
  // Canonical positioning (projection-agnostic)
  focusLongitude?: number           // Geographic focus longitude (-180 to 180)
  focusLatitude?: number            // Geographic focus latitude (-90 to 90)
  rotateGamma?: number              // Third rotation axis (roll/tilt)
  
  // Legacy positioning (deprecated, converted to canonical on load)
  center?: [number, number]         // [DEPRECATED] Use focusLongitude/focusLatitude
  rotate?: [number, number, number?] // [DEPRECATED] Use focusLongitude/focusLatitude
  
  // Other parameters
  parallels?: [number, number]      // Standard parallels [south, north] for conic
  scale?: number                    // Current scale value
  clipAngle?: number                // Clipping angle for azimuthal (degrees)
  precision?: number                // Precision for adaptive sampling
  
  // Optional metadata fields
  family?: ProjectionFamilyType     // Projection family for validation
  projectionId?: string             // Projection ID from registry
  baseScale?: number                // Base scale before user adjustments
  scaleMultiplier?: number          // User's scale multiplier
  [key: string]: any                // Index signature for dynamic access
}
```

### Canonical Positioning System

The positioning system uses a **canonical format** that stores geographic focus point
independently of projection family. Conversion to D3 methods happens at render time.

**Canonical Format**:
```typescript
interface CanonicalPositioning {
  focusLongitude: number  // -180 to 180
  focusLatitude: number   // -90 to 90
  rotateGamma?: number    // -180 to 180 (optional third axis)
}
```

**D3 Method Conversion at Render Time**:
- CYLINDRICAL: `projection.center([focusLon, focusLat])`
- CONIC/AZIMUTHAL: `projection.rotate([-focusLon, -focusLat, gamma])`

**Benefits**:
- Store always has same format regardless of projection family
- UI displays consistent values when switching projections
- No desynchronization between store, UI, and projection
- Legacy presets with `center`/`rotate` are normalized at entry points (parameter manager, composite projection)
- Internal code assumes canonical format after normalization

**Module Structure**:
```
src/core/positioning/
├── index.ts        # Module exports
├── converters.ts   # Pure conversion functions
└── applicator.ts   # Apply canonical to D3 projections
```

## Composite Projection Positioning - Fundamental Concepts

### D3 Projection Coordinate Systems

D3 projections operate through three coordinate systems:

1. **Geographic** (lon, lat in degrees) - the raw input
2. **Projected** (x, y from mathematical projection) - after projection math
3. **Screen** (pixels) - after scale + translate transformations

### Key D3 Methods and Their Effects

| Method | What It Does | When Applied |
|--------|--------------|--------------|
| `rotate([λ, φ, γ])` | Rotates the GLOBE before projection | Before projection |
| `center([lon, lat])` | Places this geo point at translate position | During projection |
| `scale(k)` | Multiplies projected coordinates | After projection |
| `translate([x, y])` | Adds offset to final screen position | After scaling |
| `clipExtent([[x0,y0],[x1,y1]])` | Clips to FIXED screen rectangle | After everything |

### The Composite Projection Constraint

In composite mode, each territory has a **fixed pixelClipExtent** (visual slot):

```
┌─────────────────────────────────────────┐
│                Canvas                    │
│   ┌─────────────┐                       │
│   │   FR-MET    │ ← pixelClipExtent:    │
│   │  (France)   │   fixed screen box    │
│   └─────────────┘                       │
│        ┌───┐ ┌───┐                      │
│        │GLP│ │MTQ│ ← other territories  │
│        └───┘ └───┘                      │
└─────────────────────────────────────────┘
```

**Critical constraint**: `clipExtent` is in screen coordinates and DOES NOT MOVE.

When projection parameters change:
- Geographic content moves to different screen positions
- But clipExtent stays exactly where it was
- Content can move OUTSIDE the clip region → **disappears!**

### Family-Specific Positioning Strategies

Different projection families require different approaches due to their mathematical properties
and the fixed clipExtent constraint in composite mode.

**CYLINDRICAL (Mercator, Equirectangular, Miller, etc.)**:
- **Use**: `projection.center([lon, lat])` directly
- **Why**: `center()` positions the specified geographic point at the translate position
         while keeping projected coordinates stable relative to clipExtent
- **Behavior**: Small center adjustments fine-tune which part appears in visual slot
- **Avoid**: `rotate()` would shift the entire world map, moving content outside clipExtent

**CONIC (Albers, Conic Conformal, Conic Equidistant, etc.)**:
- **Use**: `projection.rotate([-centerLon, -centerLat])` (center converted to rotate)
- **Why**: For conic projections, rotate's λ component sets the central meridian (standard practice)
         This is consistent with D3 conventions and d3-composite-projections
- **Also**: `parallels([p1, p2])` defines the cone configuration independently

**AZIMUTHAL (Orthographic, Stereographic, Gnomonic, etc.)**:
- **Use**: `projection.rotate([λ, φ, γ])` (rotate IS the viewpoint)
- **Why**: Azimuthal projections are radially symmetric around the center of projection
         `rotate()` controls which part of the globe faces the viewer
- **Behavior**: The rotate parameter IS the geographic center being viewed
- **Note**: `center()` is less meaningful for azimuthal projections

**PSEUDOCYLINDRICAL (Mollweide, Robinson, Sinusoidal, etc.)**:
- **Use**: `projection.rotate([λ, 0])` for central meridian
- **Why**: Similar to conic - rotate controls which meridian is vertical
- **Limitation**: Latitude rotation less useful (distorts projection symmetry)

### Implementation in CompositeProjection

The `applyPositioningParameters()` and `updateTerritoryParameters()` methods in
`composite-projection.ts` implement family-specific strategies:

```typescript
// CYLINDRICAL: Use center() directly
if (isCylindrical && params.center && projection.center) {
  projection.center(center)
}
// CONIC: Convert center to rotate (central meridian convention)
else if (isConic && params.center && projection.rotate) {
  projection.rotate([-center[0], -center[1]])
}
// AZIMUTHAL: rotate IS the viewpoint
else if (isAzimuthal && projection.rotate) {
  projection.rotate(rotate)  // or convert center to rotate as fallback
}
// OTHER: Use rotate if provided
else if (params.rotate && projection.rotate) {
  projection.rotate(params.rotate)
}
```

### Interactive Panning

MapRenderer.vue supports interactive mouse panning for projections with rotation support:
- **Supported families**: Azimuthal, Cylindrical, Pseudocylindrical, Polyhedral
- **Interaction**: Click and drag on the map to rotate the projection in both axes
- **Visual feedback**: Cursor changes to grab/grabbing during interaction
- **Scaling**: 0.5 degrees per pixel for smooth control
- **Range**: 
  - Longitude: Wraps between -180 and 180
  - Latitude: Clamped between -90 and 90 (prevents pole flipping)
- **Updates**: Changes flow through projectionStore.setCustomRotate which delegates to parameterStore.setGlobalParameter and trigger re-render via globalEffectiveParameters watcher
- **Latitude Lock**: Latitude rotation locked by default, unlockable via toggle in ProjectionParamsControls
  - When locked: Mouse panning only affects longitude rotation
  - When unlocked: Mouse panning affects both longitude and latitude rotation
  - Lock state stored in projectionStore.rotateLatitudeLocked

### Parameter Relevance by Family

Defined in `parameters.ts` - determines which parameters are applicable:

| Family | rotateLon | rotateLat | centerLon | centerLat | parallels |
|--------|-----------|-----------|-----------|-----------|-----------|
| `cylindrical` | Y | Y* | - | - | - |
| `pseudocylindrical` | Y | Y* | - | - | - |
| `conic` | Y | - | Y | Y | Y |
| `azimuthal` | Y | Y* | - | - | - |
| `polyhedral` | Y | Y* | - | - | - |
| `composite` | - | - | - | - | - |

*Y = Available but controlled by latitude lock (rotateLatitudeLocked in projectionStore)*

**Rules**:
- Conic: Uses `centerLongitude` + `centerLatitude` + `parallels` (rotation merged into center in UI)
- Azimuthal: Uses `rotate` for both axes (longitude/latitude) - rotation is preferred over center
- Cylindrical/Pseudocylindrical: Uses `rotate` for both axes (longitude/latitude)
- Polyhedral: Uses `rotate` for both axes (longitude/latitude) to change viewpoint
- Composite: Parameters managed per sub-projection

**Parameter Application Details**:
- Azimuthal: Rotation values negated (`[-lon, -lat]`) for intuitive slider behavior (D3 rotates globe, not view)
- Conic AUTO mode: Uses `rotate([-centerLon, -centerLat])` because domain fitting overrides `center()`
- Conic MANUAL mode: Uses `center([centerLon, centerLat])` directly (no domain fitting)
- Cylindrical/Pseudocylindrical: Uses `rotate([lon, lat])` without negation
- Scale: Only applied in MANUAL mode (AUTO mode calculates automatically)

### Unified Parameter Management

Parameter system uses centralized `ProjectionParameterManager` with inheritance and validation:

**Parameter Store Architecture**:
- `parameterStore` (Pinia): Reactive parameter management with global and territory-specific parameters
- `ProjectionParameterManager`: Core parameter logic with inheritance, validation, and constraints
- `ParameterRegistry`: Centralized parameter definitions with family-specific constraints and validation rules
- Config store delegates parameter operations to parameter store for unified handling

**Parameter Inheritance Priority**:
1. Territory-specific overrides (highest priority)
2. Global parameter defaults 
3. Atlas parameter defaults (lowest priority)

**Dynamic Projection Family Detection**:
- Parameter validation uses actual selected projection family per territory
- Prevents validation errors when switching between projection types
- Supports all projection families: CONIC, AZIMUTHAL, CYLINDRICAL, PSEUDOCYLINDRICAL, POLYHEDRAL

**Parameter Validation System**:
- Family-based parameter relevance checking through `ParameterRegistry`
- Range validation for scalar parameters (scale: 1-100000, precision: 0.01-10)
- Array validation for coordinate parameters (center, rotate, parallels, translate)
- Real-time validation feedback with error and warning messages
- Constraint checking prevents invalid parameter combinations

**UI Components**:
- TerritoryParameterControls: Territory-specific parameter editing interface
- Parameter groups: Position (center/rotate), Projection-specific (parallels), View (scale/clipAngle), Advanced (precision/translate)
- Parameter inheritance indicators show override status
- Reset controls for clearing territory-specific overrides

## Projection Fitting Modes

Two fitting modes control how projections display data:

**AUTO Mode** (default):
- Uses Observable Plot's domain fitting (`domain: data`)
- Map automatically fits to data extent using `projection.fitExtent()`
- Parameters control positioning within the fitted view
- Scale calculated automatically
- Best for exploring territories and comparing regions

**MANUAL Mode**:
- Domain fitting disabled (`domain: undefined`)
- Parameters control absolute positioning
- Scale slider appears for zoom control (range: 100-5000, step: 50, default: 1000)
- Full manual control over view
- Best for creating specific views, presentations, screenshots

**Mode Toggle**: ProjectionParamsControls.vue provides "Manual Control" toggle using ToggleControl component

**Technical Note**: For conic projections with AUTO mode, `rotate()` must be used instead of `center()` because `fitExtent()` recalculates center, scale, and translate. In MANUAL mode, `center()` works directly since no automatic fitting occurs.

## Adding New Projection

1. Add definition to appropriate file in `definitions/`:

```typescript
export const myProjection: ProjectionDefinition = {
  id: 'my-projection',
  name: 'My Projection',
  category: 'STANDARD',
  family: 'conic',
  strategy: 'D3_BUILTIN',
  d3Name: 'geoConicConformal',
  
  capabilities: {
    preservesAngles: true,
    supportsSplit: true
  },
  
  suitability: {
    midLatitude: 85,
    regional: 90
  },
  
  description: 'Description of projection'
}
```

2. Export from `definitions/index.ts`
3. Registry auto-discovers on load
4. Run tests: `pnpm test src/projections/__tests__/`

## Related Docs

- `add-new-atlas.md` - Guide for configuring projections in atlas configs
- `atlases.md` - Atlas system architecture
- `scripts.md` - CLI tools reference
