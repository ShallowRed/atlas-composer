# EU Atlas Architecture Analysis

## Executive Summary

**Problem**: EU atlas displays Austria as "the mainland" and composite projections clip incorrectly.

**Root Cause**: Application architecture assumes **"1 mainland + N overseas territories"** model (France/Portugal pattern), but EU needs **"N equal member states"** model.

**Impact**: Austria picked as "the" mainland (first alphabetically), affecting:
- Split view rendering (shows only Austria)
- Composite projection config (treats Austria special)
- Territory controls (Austria gets mainland recommendations)

---

## Full Pipeline Analysis

### Phase 1: JSON Configuration (`configs/eu.json`)

**Current Structure**:
```json
{
  "id": "eu",
  "name": "Union Européenne",
  "territories": [
    { "code": "AT", "name": "Austria", "role": "mainland", ... },
    { "code": "BE", "name": "Belgium", "role": "mainland", ... },
    { "code": "BG", "name": "Bulgaria", "role": "mainland", ... },
    // ... 24 more countries, all role="mainland"
  ],
  "modes": [],
  "projectionPreferences": { ... }
}
```

**Observation**:
- ✅ All 27 territories correctly marked as `role: "mainland"`
- ✅ No overseas territories (appropriate for EU)
- ✅ Empty `modes` array (no territory selection needed)
- ❌ Structure works for config, but loader interprets it incorrectly

---

### Phase 2: Backend Loader (`src/core/atlases/loader.ts`)

**Critical Function** (Line 110):
```typescript
function extractTerritories(config: any) {
  // 🔴 PROBLEM: Uses .find() - returns FIRST mainland only
  const mainlandTerritory = config.territories.find((t: any) => t.role === 'mainland')
  const overseasTerritories = config.territories.filter((t: any) => t.role === 'overseas')

  if (!mainlandTerritory) {
    throw new Error(`No mainland territory found in ${config.id}`)
  }

  const mainland = transformTerritory(mainlandTerritory) // ← Only Austria for EU
  const overseas = overseasTerritories.map(transformTerritory) // ← Empty array for EU
  const all = [mainland, ...overseas] // ← Austria + empty = [Austria]

  return { mainland, overseas, all }
}
```

**What Happens for EU**:
1. `.find()` on line 110 returns **Austria** (first mainland alphabetically)
2. `.filter()` returns **empty array** (no overseas territories)
3. `all` array contains **only Austria**
4. Other 26 countries **discarded**

**compositeProjectionConfig Creation** (Lines 211-214):
```typescript
compositeProjectionConfig: {
  mainland: territories.mainland,  // TerritoryConfig for Austria only
  overseasTerritories: territories.overseas,  // Empty array
}
```

**Result**: Composite projection receives config with:
- `mainland`: Austria configuration
- `overseasTerritories`: Empty array
- **Missing**: Belgium, Bulgaria, Croatia, Cyprus, etc. (26 countries)

---

### Phase 3: Store Layer (`src/stores/geoData.ts`)

**Load Logic** (Lines 118-150):
```typescript
// Detect if atlas has mainland/overseas split
const hasMainlandOverseasSplit
  = configStore.currentAtlasConfig.geoDataConfig.overseasTerritories.length > 0

if (hasMainlandOverseasSplit) {
  // France: load mainland and overseas separately
  const [mainland, overseas] = await Promise.all([
    service.getMainLandData(),
    service.getOverseasData(),
  ])
  mainlandData.value = mainland
  overseasTerritoriesData.value = overseas || []
}
else {
  // 🟢 EU path: load all countries as individual territories
  const allTerritoriesData = await service.getAllTerritories()

  const territories = allTerritoriesData.map((territoryData: any) => ({
    name: territoryData.territory.name,
    code: territoryData.territory.code,
    area: territoryData.territory.area,
    region: 'Europe',
    data: { type: 'FeatureCollection', features: [territoryData.feature] },
  }))

  mainlandData.value = null // ← No single mainland
  overseasTerritoriesData.value = territories // ← All 27 countries as "overseas"
}
```

**Observations**:
- ✅ Store correctly detects EU has no overseas split
- ✅ Loads all 27 territories via `getAllTerritories()`
- ⚠️ Stores them as `overseasTerritoriesData` (semantic mismatch)
- ⚠️ Sets `mainlandData = null` (but composite config still has Austria as mainland)
- **Inconsistency**: Store treats EU as "no mainland", but loader created Austria-centric composite config

---

### Phase 4: Composite Projection Service (`src/services/composite-projection.ts`)

**Initialization** (Lines 67-136):
```typescript
private initialize() {
  const { mainland, overseasTerritories } = this.config  // ← From loader
  const REFERENCE_SCALE = 2800

  // 🔴 Creates sub-projection for "mainland" (Austria for EU)
  const mainlandProjection = this.createProjectionByType(mainland.projectionType || 'conic-conformal')
    .center(mainland.center)
    .translate([0, 0])

  this.addSubProjection({
    territoryCode: mainland.code,  // ← "AT" (Austria)
    territoryName: mainland.name,  // ← "Austria"
    projection: mainlandProjection,
    baseScale: REFERENCE_SCALE,
    scaleMultiplier: 1.0,
    baseTranslate: [0, 0],
    clipExtent: null,
    translateOffset: mainland.offset,
    bounds: mainland.bounds,
  })

  // 🔴 Empty loop for EU (no overseas territories)
  overseasTerritories.forEach((territory) => {
    // Never executes for EU
  })
}
```

**Result**: CompositeProjection only knows about Austria:
- Creates 1 sub-projection for Austria
- Centers on Austria's coordinates
- Uses Austria's bounds for clipping
- **Missing**: All other 26 EU countries

---

### Phase 5: Rendering (`src/components/MapRenderer.vue` + `src/views/MapView.vue`)

**Split View** (MapView.vue lines 292-320):
```vue
<!-- Only shows if has mainland/overseas split -->
<div v-if="configStore.currentAtlasConfig.geoDataConfig.overseasTerritories.length > 0">
  <!-- Metropolitan France -->
  <MapRenderer
    :geo-data="geoDataStore.mainlandData"  <!-- ← null for EU, so nothing renders -->
    is-mainland
    :projection="getMainLandProjection()"
  />
  <!-- Overseas territories grid -->
</div>

<!-- EU path: no split view rendered (condition false) -->
```

**Composite View** (MapView.vue lines 410, 418):
```vue
<MapRenderer mode="composite" />
```

**MapRenderer Composite Logic** (lines 178-186):
```typescript
const compositeConfig = configStore.currentAtlasConfig.compositeProjectionConfig
const territoryCodes: string[] = []

if (compositeConfig) {
  // Add mainland code
  territoryCodes.push(compositeConfig.mainland.code) // ← Pushes "AT"
  // Add all overseas territory codes
  compositeConfig.overseasTerritories.forEach(t => territoryCodes.push(t.code)) // ← Empty for EU
}

// Result: territoryCodes = ["AT"] for EU
```

**Final Rendering**:
- Composite projection initialized with Austria only
- Attempts to render with Austria's center/bounds
- Other 26 countries not in projection config → clipped or positioned incorrectly
- **Result**: Weird clipping, Austria-centric view

---

## Architecture Assumptions

### Current Design Pattern

**"Mainland + Overseas" Model** (France/Portugal):
```
France:
  ├── Mainland: Metropolitan France (1 territory)
  └── Overseas: Guadeloupe, Martinique, Réunion, etc. (N territories)

Portugal:
  ├── Mainland: Continental Portugal (1 territory)
  └── Overseas: Azores, Madeira (N territories)
```

**Implementation**:
- Loader: `.find()` for mainland (1), `.filter()` for overseas (N)
- Store: Separate `mainlandData` and `overseasTerritoriesData`
- Composite: `mainland` object + `overseasTerritories` array
- Rendering: Split view shows mainland separately, grid for overseas

### Required Pattern for EU

**"Equal Member States" Model** (EU/Malaysia):
```
EU:
  └── Member States: AT, BE, BG, ..., SE (27 equal territories)
      ├── No single "mainland"
      ├── No hierarchy
      └── All treated equally

Malaysia (future):
  └── States: Johor, Kedah, Kelantan, ..., Sabah, Sarawak (13 equal states)
```

**Requirements**:
- Loader: Return **all** mainland territories, not just first
- Store: Treat all territories equally (no mainland/overseas distinction)
- Composite: Support **multiple** mainland territories in projection config
- Rendering: No split view, unified/composite only

---

## Breaking Points Summary

| Layer | France/Portugal (Works) | EU (Broken) | Issue |
|-------|-------------------------|-------------|-------|
| **JSON Config** | 1 mainland + N overseas | 27 mainlands + 0 overseas | ✅ Valid |
| **Loader** | `.find()` returns the mainland | `.find()` returns Austria only | ❌ Loses 26 countries |
| **compositeProjectionConfig** | `{ mainland: FR, overseasTerritories: [...] }` | `{ mainland: AT, overseasTerritories: [] }` | ❌ Austria-centric |
| **Store** | Loads mainland + overseas | Loads all via `getAllTerritories()` | ⚠️ Workaround, inconsistent |
| **CompositeProjection** | Initializes 1 mainland + N overseas projections | Initializes Austria only | ❌ Missing 26 countries |
| **Rendering** | Split view + composite both work | Composite clips around Austria | ❌ Wrong center/bounds |

---

## Solution Requirements

### 1. Backward Compatibility
- ✅ France/Portugal configs must continue working unchanged
- ✅ Existing tests (170/170) must keep passing
- ✅ No breaking changes to config schema

### 2. Multi-Mainland Support
- ✅ Loader must extract **all** mainland territories (not just first)
- ✅ CompositeProjection must support **N mainlands + M overseas**
- ✅ Store must handle equal territories without hierarchy
- ✅ Rendering must work for unified/composite (no split view for multi-mainland)

### 3. Future Extensibility
- ✅ Support Malaysia use case (13 equal states)
- ✅ Enable "projection composite personnalisée" for multi-mainland atlases
- ✅ Clear semantic distinction between patterns

---

## Proposed Solution Approach

### Option A: New Role Type (Recommended)

**Concept**: Introduce `role: "member-state"` to distinguish multi-mainland pattern from traditional mainland/overseas.

**Changes**:

**1. Config Schema** (backward compatible):
```json
// France (unchanged)
{
  "territories": [
    { "code": "FR", "role": "mainland", ... },
    { "code": "GP", "role": "overseas", ... }
  ]
}

// EU (new role)
{
  "territories": [
    { "code": "AT", "role": "member-state", ... },
    { "code": "BE", "role": "member-state", ... }
  ]
}
```

**2. Loader** (`src/core/atlases/loader.ts`):
```typescript
function extractTerritories(config: any) {
  const allMainlands = config.territories.filter((t: any) =>
    t.role === 'mainland' || t.role === 'member-state'
  )
  const overseasTerritories = config.territories.filter((t: any) => t.role === 'overseas')

  // Traditional pattern: 1 mainland + N overseas
  if (allMainlands.length === 1) {
    const mainland = transformTerritory(allMainlands[0])
    const overseas = overseasTerritories.map(transformTerritory)
    const all = [mainland, ...overseas]
    return { type: 'traditional', mainland, overseas, all }
  }

  // Multi-mainland pattern: N mainlands + M overseas
  else if (allMainlands.length > 1) {
    const mainlands = allMainlands.map(transformTerritory)
    const overseas = overseasTerritories.map(transformTerritory)
    const all = [...mainlands, ...overseas]
    return { type: 'multi-mainland', mainlands, overseas, all }
  }

  else {
    throw new Error(`No mainland or member-state territories found in ${config.id}`)
  }
}
```

**3. CompositeProjectionConfig Type**:
```typescript
// Traditional (France/Portugal)
export interface TraditionalCompositeConfig {
  type: 'traditional'
  mainland: TerritoryConfig
  overseasTerritories: TerritoryConfig[]
}

// Multi-mainland (EU/Malaysia)
export interface MultiMainlandCompositeConfig {
  type: 'multi-mainland'
  mainlands: TerritoryConfig[]
  overseasTerritories: TerritoryConfig[]
}

export type CompositeProjectionConfig
  = | TraditionalCompositeConfig
    | MultiMainlandCompositeConfig
```

**4. CompositeProjection Service**:
```typescript
private initialize() {
  if (this.config.type === 'traditional') {
    this.initializeTraditional(this.config)
  } else {
    this.initializeMultiMainland(this.config)
  }
}

private initializeMultiMainland(config: MultiMainlandCompositeConfig) {
  const REFERENCE_SCALE = 2800

  // All mainlands get equal treatment
  config.mainlands.forEach((territory) => {
    const projection = this.createProjectionByType(territory.projectionType || 'conic-conformal')
      .center(territory.center)
      .translate([0, 0])
      .scale(REFERENCE_SCALE)

    this.addSubProjection({
      territoryCode: territory.code,
      territoryName: territory.name,
      projection,
      baseScale: REFERENCE_SCALE,
      scaleMultiplier: 1.0,
      baseTranslate: [0, 0],
      clipExtent: null,
      translateOffset: territory.offset,
      bounds: territory.bounds,
    })
  })

  // Overseas territories (if any)
  config.overseasTerritories.forEach((territory) => {
    // Same logic as before
  })
}
```

**Pros**:
- ✅ Explicit semantic distinction
- ✅ Future-proof (Malaysia, other multi-state regions)
- ✅ Backward compatible (France/Portugal use "mainland")
- ✅ Clear intent in config files

**Cons**:
- ⚠️ Requires updating EU config to use new role
- ⚠️ More complex type system

---

### Option B: Implicit Detection (Alternative)

**Concept**: Detect multi-mainland pattern automatically (multiple `role: "mainland"` entries).

**Changes**:

**1. Config Schema** (no changes):
```json
// EU (unchanged)
{
  "territories": [
    { "code": "AT", "role": "mainland", ... },
    { "code": "BE", "role": "mainland", ... }
  ]
}
```

**2. Loader** (same as Option A, but without role check):
```typescript
const allMainlands = config.territories.filter((t: any) => t.role === 'mainland')

if (allMainlands.length === 1) {
  return { type: 'traditional', ... }
} else if (allMainlands.length > 1) {
  return { type: 'multi-mainland', mainlands: allMainlands.map(transform), ... }
}
```

**Pros**:
- ✅ No config changes needed
- ✅ Simpler for users (just mark all as "mainland")
- ✅ Backward compatible

**Cons**:
- ⚠️ Less explicit (relies on count heuristic)
- ⚠️ Might confuse future developers (what's the intent?)
- ⚠️ Harder to add future patterns

---

## Recommendation

**Use Option A (New Role Type)**:

1. **Update configs/eu.json**: Change all `role: "mainland"` → `role: "member-state"`
2. **Update loader.ts**: Implement dual-pattern extraction
3. **Update composite-projection.ts**: Add multi-mainland initialization
4. **Update type definitions**: Add discriminated union for CompositeProjectionConfig
5. **Update stores/components**: Handle both config types

**Migration Path**:
- Phase 1: Implement Option A for EU
- Phase 2: Test with 170 existing tests (should pass)
- Phase 3: Manual testing with EU (27 countries should render)
- Phase 4: Document pattern for future atlases (Malaysia, etc.)

**Timeline**: 4-6 hours implementation + testing

---

## Next Steps

1. **Confirm approach** with user (Option A vs Option B)
2. **Implement changes** in order:
   - Type definitions
   - Loader extraction logic
   - CompositeProjection service
   - Store adaptations
   - Rendering adjustments
3. **Test thoroughly**:
   - Unit tests (170/170 passing)
   - Manual EU atlas test (all 27 countries)
   - Manual France/Portugal test (unchanged behavior)
4. **Document** new pattern in README and config schema

---

## Files to Modify

| File | Changes | Risk |
|------|---------|------|
| `configs/eu.json` | Change role to "member-state" | Low |
| `configs/schema.json` | Add "member-state" to role enum | Low |
| `src/core/atlases/loader.ts` | Dual-pattern extraction, createAtlasConfig | Medium |
| `src/services/composite-projection.ts` | Multi-mainland initialization | Medium |
| `src/types/territory.d.ts` | Add discriminated union types | Low |
| `src/stores/geoData.ts` | Handle multi-mainland config | Low |
| `src/components/MapRenderer.vue` | Support multi-mainland rendering | Low |
| Tests | May need updates for new types | Low |

**Total**: 7-8 files, ~200-300 lines of changes

---

*Analysis completed: 2024*
*Investigation: JSON → Loader → Store → CompositeProjection → Rendering*
*Conclusion: Architecture assumes single mainland; needs multi-mainland support*
