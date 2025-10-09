# Atlas Pattern System - Refactoring Plan

## 🔍 Current State Analysis

### 1. **Pattern Types**
Currently defined in the codebase:
- `'traditional'`: 1 mainland + N overseas (France, Portugal, USA)
- `'multi-mainland'`: N member-states + M overseas (EU)

### 2. **Territory Roles**
Currently defined in schema:
- `'mainland'`: Single mainland territory (FR, PT-CONT)
- `'member-state'`: Equal territories in multi-mainland (EU countries: AT, BE, DE...)
- `'overseas'`: Remote territories (FR-GP, PT-20, etc.)
- `'embedded'`: Enclaves (defined but not actively used)

### 3. **Current Issues**

#### A. **Conceptual Confusion**
- **Pattern vs Role**: Pattern is inferred from role count, not explicit
- **Role overloading**: `'mainland'` and `'member-state'` are treated identically in code but conceptually different
- **Embedded role**: Defined but never used in practice
- **Missing world pattern**: No clear way to represent "all countries equally" (world map)

#### B. **Code Duplication & Complexity**
Located in **15+ files** with pattern checks:
```typescript
// Scattered throughout codebase:
pattern === 'traditional'
config.type === 'traditional'
t.role === 'mainland' || t.role === 'member-state'
```

#### C. **Mainland Code Filtering Bug** (Just Fixed)
- `createTerritoryModes()` was filtering mainland code from modes
- Works for traditional (FR is separate) but breaks multi-mainland (AT was excluded)
- Required `isTraditionalPattern` parameter to fix

#### D. **Limited Extensibility**
- Hard to add new patterns (world, regional unions, etc.)
- Territory modes tied to pattern assumptions
- Split view only works for traditional pattern

---

## 🎯 Proposed Solution: 3-Tier Domain Model

### **Core Concept: Separate Concerns**

```
ATLAS PATTERN (how territories relate)
    ↓
TERRITORY ROLE (what each territory is)
    ↓
VIEW CAPABILITY (what UI features are available)
```

---

## 📐 New Domain Model

### **Tier 1: Atlas Pattern** (Structural)

Defines the **structural relationship** between territories:

```typescript
type AtlasPattern
  = | 'single-focus' // 1 primary + N secondary (France, Portugal, USA)
    | 'equal-members' // N equal territories (EU, World, ASEAN)
    | 'hierarchical' // Parent + children (Future: USA states, China provinces)
```

**Rationale:**
- `'single-focus'`: Replaces `'traditional'` - clearer name
- `'equal-members'`: Replaces `'multi-mainland'` - applies to world too!
- `'hierarchical'`: Future-proofing for nested atlases

### **Tier 2: Territory Role** (Semantic)

Defines **what type of territory** this is:

```typescript
type TerritoryRole
  = | 'primary' // Main/mainland territory (FR, PT-CONT, USA-CONT)
    | 'secondary' // Remote territories (FR-GP, PT-20, US-HI)
    | 'member' // Equal member (AT, BE, DE in EU; all countries in World)
    | 'embedded' // Enclave/exclave (Future: Vatican, Kaliningrad)
```

**Rationale:**
- `'primary'` replaces `'mainland'` - more generic
- `'secondary'` replaces `'overseas'` - less colonial
- `'member'` replaces `'member-state'` - works for non-state unions
- `'embedded'` stays but gets actual use cases

### **Tier 3: View Capabilities** (UI)

Defines **what UI features** are available:

```typescript
interface ViewCapabilities {
  supportsSplitView: boolean // Can show primary vs secondary separately
  supportsTerritorySelector: boolean // Can filter territories by mode
  supportsCompositeProjection: boolean // Has D3 composite projection
  defaultViewMode: ViewMode
}
```

**Derived from pattern + config:**
```typescript
// single-focus → supports split view (mainland vs overseas)
// equal-members → no split view (all equal)
// World → no split, has territory selector (continents, regions)
```

---

## 🔧 Implementation Plan

### **Phase 1: Core Type Refactoring** ⭐ (Do First)

**Goal:** Replace pattern types, update type definitions

1. **Update Type Definitions** (`src/types/atlas.ts`, `types/atlas-config.ts`)
   ```typescript
   // OLD
   pattern: 'traditional' | 'multi-mainland'
   role: 'mainland' | 'overseas' | 'member-state' | 'embedded'

   // NEW
   pattern: 'single-focus' | 'equal-members' | 'hierarchical'
   role: 'primary' | 'secondary' | 'member' | 'embedded'
   ```

2. **Update Config Schema** (`configs/schema.json`)
   - Update `role` enum
   - Add documentation for new values
   - Keep backward compatibility via validation

3. **Update Loader** (`src/core/atlases/loader.ts`)
   ```typescript
   // OLD logic
   if (allMainlands.length === 1) return { type: 'traditional', ... }
   else return { type: 'multi-mainland', ... }

   // NEW logic
   function inferPattern(territories, config): AtlasPattern {
     // If config explicitly sets pattern, use it
     if (config.pattern) return config.pattern

     // Otherwise infer from roles
     const primaries = territories.filter(t => t.role === 'primary')
     const members = territories.filter(t => t.role === 'member')

     if (primaries.length === 1 && members.length === 0) {
       return 'single-focus'
     }
     if (members.length > 0 && primaries.length === 0) {
       return 'equal-members'
     }
     throw new Error(`Cannot infer pattern for ${config.id}`)
   }
   ```

4. **Add Pattern-to-Role Mapping Utility**
   ```typescript
   // src/core/atlases/utils.ts
   export function getPrimaryRoleForPattern(pattern: AtlasPattern): TerritoryRole[] {
     switch (pattern) {
       case 'single-focus': return ['primary']
       case 'equal-members': return ['member']
       case 'hierarchical': return ['primary'] // Future
     }
   }

   export function getSecondaryRoleForPattern(pattern: AtlasPattern): TerritoryRole[] {
     switch (pattern) {
       case 'single-focus': return ['secondary']
       case 'equal-members': return [] // No secondary
       case 'hierarchical': return ['member'] // Future
     }
   }
   ```

**Files to update:** (~8 files)
- `src/types/atlas.ts`
- `src/types/composite.ts`
- `types/atlas-config.ts`
- `configs/schema.json`
- `src/core/atlases/loader.ts`
- `src/core/atlases/utils.ts` (new functions)

---

### **Phase 2: Update All Pattern Checks** (Mechanical)

**Goal:** Replace all `=== 'traditional'` with pattern utilities

1. **Create Utility Functions**
   ```typescript
   // src/core/atlases/utils.ts
   export function supportsSplitView(pattern: AtlasPattern): boolean {
     return pattern === 'single-focus'
   }

   export function shouldFilterMainlandFromModes(pattern: AtlasPattern): boolean {
     return pattern === 'single-focus' // Only single-focus has separate mainland
   }
   ```

2. **Update All Pattern Checks** (15+ locations)
   ```typescript
   // BEFORE
   if (configStore.currentAtlasConfig.pattern === 'traditional') { ... }

   // AFTER
   if (supportsSplitView(configStore.currentAtlasConfig.pattern)) { ... }
   ```

**Files to update:** (~12 files)
- `src/views/MapView.vue`
- `src/components/TerritoryControls.vue`
- `src/stores/geoData.ts`
- `src/services/composite-projection.ts`
- `src/components/MapRenderer.vue`
- Others found via grep

---

### **Phase 3: Update Existing Configs** (Data Migration)

**Goal:** Update all JSON configs to use new terminology

1. **France, Portugal, USA** (`configs/*.json`)
   ```json
   // BEFORE
   { "role": "mainland", "code": "FR", ... }
   { "role": "overseas", "code": "FR-GP", ... }

   // AFTER
   { "role": "primary", "code": "FR", ... }
   { "role": "secondary", "code": "FR-GP", ... }
   ```

2. **EU Config** (`configs/eu.json`)
   ```json
   // BEFORE
   { "role": "member-state", "code": "AT", ... }

   // AFTER
   { "role": "member", "code": "AT", ... }
   ```

**Files to update:** (4 configs)
- `configs/france.json`
- `configs/portugal.json`
- `configs/usa.json`
- `configs/eu.json`

---

### **Phase 4: Implement World Atlas** ⭐ (New Feature)

**Goal:** Add world map support using new pattern system

1. **Complete World Config** (`configs/world.json`)
   ```json
   {
     "id": "world",
     "pattern": "equal-members",
     "territories": "all", // Special: load all countries
     "modes": [
       {
         "id": "all-countries",
         "label": "All Countries",
         "territories": ["*"]
       },
       {
         "id": "without-antarctica",
         "label": "Without Antarctica",
         "territories": ["*"],
         "exclude": ["010"]
       },
       {
         "id": "africa",
         "label": "Africa",
         "territories": ["012", "024", "072", ...] // African country IDs
       },
       {
         "id": "europe",
         "label": "Europe",
         "territories": ["040", "056", "100", ...] // European country IDs
       }
       // ... more continent/region modes
     ]
   }
   ```

2. **Update Loader to Handle `territories: "all"`**
   ```typescript
   // src/core/atlases/loader.ts
   function extractTerritories(config: JSONAtlasConfig) {
     // Special case: world atlas loads all countries
     if (config.territories === 'all' || config.territories === '*') {
       return loadAllCountriesAsMembers()
     }

     // Normal case: use territories array
     // ... existing logic
   }

   function loadAllCountriesAsMembers() {
     // Load from world-territories-50m.json
     // All get role: 'member'
     // Pattern: 'equal-members'
   }
   ```

3. **Territory Mode Exclusion Support**
   ```typescript
   // Update createTerritoryModes to handle exclude
   function createTerritoryModes(config, mainlandCode, pattern) {
     return Object.fromEntries(
       (config.modes || []).map((mode) => {
         let codes = mode.territories

         // Handle wildcard
         if (codes.includes('*')) {
           codes = getAllTerritoryCodes(config)
         }

         // Handle exclusions
         if (mode.exclude) {
           codes = codes.filter(c => !mode.exclude.includes(c))
         }

         // Filter mainland only for single-focus
         if (shouldFilterMainlandFromModes(pattern)) {
           codes = codes.filter(c => c !== mainlandCode)
         }

         return [mode.id, { label: mode.label, codes }]
       })
     )
   }
   ```

**Files to update:** (3 files)
- `configs/world.json` (complete)
- `src/core/atlases/loader.ts` (add wildcard support)
- `configs/schema.json` (document new patterns)

---

### **Phase 5: View Capabilities System** (Polish)

**Goal:** Make view capabilities explicit and derived

1. **Add View Capabilities to AtlasConfig**
   ```typescript
   // src/types/atlas.ts
   interface AtlasConfig {
     // ... existing fields
     viewCapabilities: ViewCapabilities
   }

   interface ViewCapabilities {
     supportsSplitView: boolean
     supportsTerritorySelector: boolean
     supportsCompositeProjection: boolean
     supportsCustomComposite: boolean
   }
   ```

2. **Derive Capabilities in Loader**
   ```typescript
   function deriveViewCapabilities(
     pattern: AtlasPattern,
     config: JSONAtlasConfig
   ): ViewCapabilities {
     return {
       supportsSplitView: pattern === 'single-focus',
       supportsTerritorySelector: config.modes && config.modes.length > 0,
       supportsCompositeProjection: !!config.compositeProjections?.length,
       supportsCustomComposite: pattern === 'single-focus' || pattern === 'equal-members',
     }
   }
   ```

3. **Update UI Components**
   ```vue
   <!-- MapView.vue -->
   <div v-if="config.viewCapabilities.supportsSplitView">
     <!-- Split view UI -->
   </div>

   <!-- TerritoryControls.vue -->
   <select v-if="config.viewCapabilities.supportsTerritorySelector">
     <!-- Territory mode selector -->
   </select>
   ```

**Files to update:** (5 files)
- `src/types/atlas.ts`
- `src/core/atlases/loader.ts`
- `src/views/MapView.vue`
- `src/components/TerritoryControls.vue`
- `src/components/ui/ProjectionSelector.vue`

---

## 📊 Migration Summary

### Changes by Scope

| Scope | Files Changed | Risk Level | Test Coverage Needed |
|-------|--------------|------------|---------------------|
| Type Definitions | 4 files | Low | Type checking |
| Pattern Logic | 8 files | Medium | Unit tests + E2E |
| Config Files | 4 files | Low | Validation script |
| New Feature (World) | 3 files | Medium | Manual testing |
| UI Components | 5 files | Medium | E2E tests |
| **TOTAL** | **~20 files** | **Medium** | **High priority** |

### Backward Compatibility

**Breaking Changes:**
- Config file format (role names)
- Pattern type names in code
- CompositeProjectionConfig type names

**Migration Path:**
1. Phase 1-2: Update code (no config changes yet)
2. Test with OLD configs
3. Phase 3: Update configs in one commit
4. Phase 4-5: Add new features

**Rollback Strategy:**
- Keep old type names as deprecated aliases initially
- Run validation script on all configs before commit
- Feature flag for world atlas

---

## 🎬 Recommended Execution Order

### ⭐ **Quick Win Path** (If you want world atlas ASAP)
1. **Phase 1** - Core types (2-3 hours)
2. **Phase 2** - Update checks (1-2 hours)
3. **Phase 4** - World atlas (2-3 hours)
4. **Phase 3** - Config migration (1 hour)
5. **Phase 5** - View capabilities (optional polish)

**Total: ~6-10 hours of focused work**

### 🏗️ **Careful Path** (If you want clean refactor first)
1. **Phase 1** - Core types
2. **Phase 2** - Update checks
3. **Phase 3** - Config migration
4. **TEST THOROUGHLY** - Ensure France, Portugal, EU, USA all work
5. **Phase 4** - World atlas
6. **Phase 5** - View capabilities

**Total: ~8-12 hours with testing**

---

## ✅ Definition of Done

### Must Have
- [ ] All existing atlases (France, Portugal, EU, USA) render correctly
- [ ] Austria bug stays fixed
- [ ] Continental Europe mode filters overseas correctly
- [ ] World atlas loads and renders
- [ ] Territory modes work for world (continents, regions)
- [ ] No TypeScript errors
- [ ] Config validation script passes

### Should Have
- [ ] Unit tests for pattern utilities
- [ ] E2E test for world atlas
- [ ] Documentation updated
- [ ] Migration guide for future atlases

### Nice to Have
- [ ] View capabilities fully implemented
- [ ] Hierarchical pattern prepared (types only)
- [ ] Performance optimization for world rendering

---

## 🤔 Discussion Points

### 1. **Terminology Preferences**
Should we use:
- `'single-focus'` vs `'traditional'` vs `'primary-secondary'`?
- `'equal-members'` vs `'multi-mainland'` vs `'flat'`?
- `'primary'/'secondary'` vs `'mainland'/'overseas'` vs `'core'/'peripheral'`?

### 2. **World Atlas Territory Source**
Option A: Load from existing `world-territories-50m.json`
Option B: Generate from Natural Earth on-the-fly
Option C: Create new minimal world config

### 3. **Scope of Refactor**
Option A: Minimal - just rename types, add world
Option B: Moderate - add view capabilities system
Option C: Maximum - full domain model with hierarchical support

### 4. **Config Migration Strategy**
Option A: Big bang - update all configs at once
Option B: Gradual - support both old and new role names temporarily
Option C: Automated - write migration script

---

## 📝 Notes

- **Current bug fix is compatible** with this plan - no conflicts
- **World data already exists** (`world-territories-50m.json`) - just needs config
- **Schema already supports** most of this - minimal schema changes needed
- **No breaking changes to API** - all changes internal to atlas loading

---

## Questions for You

1. **Which execution path** do you prefer? Quick win or careful?
2. **Which terminology** do you like best?
3. **Should we support** hierarchical pattern now or later?
4. **Do you want** view capabilities system or keep it simple?
5. **Should world atlas** load all ~200 countries or just major ones?

Please review and let me know your thoughts! 🙏

---

## 🚧 IMPLEMENTATION PROGRESS

**Execution Path Chosen:** Careful Path (clean refactor first)
**Started:** 2025-10-09

### Phase 1: Core Type Refactoring ✅
- [x] Update `src/types/atlas.ts` - pattern type
- [x] Update `src/types/composite.ts` - pattern type
- [x] Update `types/atlas-config.ts` - role enum
- [x] Update `configs/schema.json` - role enum
- [x] Update `src/core/atlases/loader.ts` - extractTerritories logic
- [x] Add pattern utilities to `src/core/atlases/utils.ts`

### Phase 2: Update All Pattern Checks ✅
- [x] Create utility functions in utils.ts
- [x] Update MapView.vue
- [x] Update TerritoryControls.vue
- [x] Update geoData.ts
- [x] Update composite-projection.ts
- [x] Update MapRenderer.vue
- [x] Update loader.ts (GeoDataConfig)

### Phase 3: Config Migration ✅
- [x] Create migration script
- [x] Update france.json (13 territories)
- [x] Update portugal.json (3 territories)
- [x] Update usa.json (9 territories)
- [x] Update eu.json (49 territories)
- [x] Total: 74 territories migrated

### Phase 4: World Atlas ⏸️
- [ ] Complete world.json config
- [ ] Update loader for wildcard territories
- [ ] Add exclusion support
- [ ] Test world rendering

### Phase 4: World Atlas ⏸️
- [ ] Complete world.json config
- [ ] Update loader for wildcard territories
- [ ] Add exclusion support
- [ ] Test world rendering

### Phase 5: View Capabilities ⏸️
- [ ] Add ViewCapabilities interface
- [ ] Derive capabilities in loader
- [ ] Update UI components

---

## 📊 Summary So Far

**✅ Phases 1-3 Complete!**

- **Type System**: All pattern types renamed (`single-focus`, `equal-members`)
- **Role System**: All territory roles renamed (`primary`, `secondary`, `member`)
- **Code Updated**: 12 files across loader, stores, views, components
- **Configs Migrated**: 74 territories across 4 atlases (France, Portugal, USA, EU)
- **Utilities Added**: Pattern helper functions for consistent behavior
- **Tests Needed**: Manual testing to verify Austria fix still works + all views render

**Next Steps:**
1. Test the application thoroughly
2. Verify Austria appears in EU unified view
3. Verify "Continental Europe" mode filters correctly
4. Consider implementing World atlas (Phase 4) or View Capabilities (Phase 5)
