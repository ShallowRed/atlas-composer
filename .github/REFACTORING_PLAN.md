# Refactoring Plan: Region-Agnostic Architecture

## 🎯 Objective
Transform the codebase from France-centric to a fully generic, region-agnostic architecture that supports multiple geographic regions (France, Portugal, EU, Spain, etc.) with clean separation of concerns.

## 📋 Current Issues

### Critical Problems
1. **Hard-coded France dependencies** in core files:
   - `config.ts` imports `ALL_TERRITORIES`, `OVERSEAS_TERRITORIES` from `france-territories.ts`
   - `Cartographer.ts` imports `DEFAULT_COMPOSITE_PROJECTION_CONFIG` from France
   - `GeoProjectionService.ts` imports `FRANCE_PROJECTION_PARAMS`

2. **Mixed concerns in territory files**:
   - Pure data (TerritoryConfig arrays)
   - UI logic (territory modes, groups)
   - Utility functions (lookups, naming)
   - Code generation mappings
   - Projection parameters

3. **Service configuration issues**:
   - Services initialized with France defaults
   - No clean way to switch regions dynamically
   - Services don't react to region changes

4. **Store anti-patterns**:
   - Direct imports of France-specific data
   - Should be region-agnostic but isn't

## 🏗️ Architecture Vision

### New Directory Structure
```
src/
├── data/
│   └── territories/
│       ├── france.data.ts          # Pure territory data only
│       ├── portugal.data.ts        # Pure territory data only
│       ├── eu.data.ts              # Pure territory data only
│       └── spain.data.ts           # Future expansion
│
├── config/
│   └── regions/
│       ├── france.config.ts        # France: modes, groups, params
│       ├── portugal.config.ts      # Portugal: modes, groups, params
│       ├── eu.config.ts            # EU: modes, groups, params
│       ├── index.ts                # Central region registry
│       └── types.ts                # Region config types
│
├── services/
│   ├── TerritoryService.ts         # Generic territory operations
│   ├── RegionService.ts            # Region-aware operations
│   ├── CartographerFactory.ts      # Factory for region-specific instances
│   ├── GeoDataService.ts           # ✅ Minor tweaks needed
│   ├── GeoProjectionService.ts     # ⚠️ Make region-aware
│   └── CustomCompositeProjection.ts # ✅ Already good
│
├── stores/
│   ├── config.ts                   # ⚠️ Remove France imports
│   └── geoData.ts                  # ⚠️ Make region-agnostic
│
└── constants/
    ├── regions.ts                  # ⚠️ Will be restructured
    └── territories/                # ⚠️ Will be deprecated/moved
```

## 📝 Implementation Phases

### Phase 1: Extract Pure Data Layer ✅ COMPLETED
**Goal:** Separate pure territory data from logic

**Tasks:**
- [x] Create `src/data/territories/` directory
- [x] Create `france.data.ts` with only:
  - `MAINLAND_FRANCE: TerritoryConfig`
  - `OVERSEAS_TERRITORIES: TerritoryConfig[]`
  - `ALL_TERRITORIES: TerritoryConfig[]` (computed)
- [x] Create `portugal.data.ts` with same structure
- [x] Create `eu.data.ts` with same structure
- [x] No functions, no UI logic, no modes - ONLY data

**Files created:**
- ✅ `src/data/territories/france.data.ts`
- ✅ `src/data/territories/portugal.data.ts`
- ✅ `src/data/territories/eu.data.ts`
- ✅ `src/data/territories/index.ts` (barrel export)

### Phase 2: Create Region Configuration Layer ✅ COMPLETED
**Goal:** Centralize region-specific configuration

**Tasks:**
- [x] Create `src/config/regions/` directory
- [x] Create `types.ts` with configuration interfaces:
  - `ProjectionParams`
  - `TerritoryModeDefinition`
  - `TerritoryGroupDefinition`
  - `CompositeProjectionDefaults`
- [x] Create `france.config.ts` with:
  - `FRANCE_PROJECTION_PARAMS`
  - `FRANCE_TERRITORY_MODES`
  - `FRANCE_TERRITORY_GROUPS`
  - `FRANCE_DEFAULT_COMPOSITE_CONFIG`
  - `FRANCE_REGION_CONFIG: RegionConfig`
- [x] Similar for Portugal and EU
- [x] Create `index.ts` aggregating all configs
- [ ] Update `src/constants/regions.ts` to use new structure (defer to Phase 4)

**Files created:**
- ✅ `src/config/regions/types.ts`
- ✅ `src/config/regions/france.config.ts`
- ✅ `src/config/regions/portugal.config.ts`
- ✅ `src/config/regions/eu.config.ts`
- ✅ `src/config/regions/index.ts`

**Files to modify later:**
- `src/constants/regions.ts` (will update in Phase 4)

### Phase 3: Create Service Layer ✅ COMPLETED
**Goal:** Add generic and region-aware service abstractions

**Tasks:**
- [x] Create `TerritoryService.ts` with static methods:
  - `getTerritoryByCode(territories, code)`
  - `getTerritoriesByRegion(territories, region)`
  - `getTerritoriesForMode(territories, mode, modeConfig)`
  - `calculateDefaultTranslations(territories)`
  - `extractTerritoryCodes(territories)`
  - Plus: groupByRegion, getUniqueRegions, etc.
- [x] Create `RegionService.ts` as region-aware facade:
  - Constructor takes `regionId: string`
  - `getTerritoriesForMode(mode: string)`
  - `getTerritoryGroups()`
  - `getProjectionParams()`
  - `getCompositeConfig()`
  - `getAllTerritories()`
  - `getOverseasTerritories()`
- [x] Create `CartographerFactory.ts`:
  - `create(regionId: string): Promise<Cartographer>`
  - Caching mechanism
  - `clearCache()`

**Files created:**
- ✅ `src/services/TerritoryService.ts`
- ✅ `src/services/RegionService.ts`
- ✅ `src/services/CartographerFactory.ts`

### Phase 4: Make Services Region-Aware ✅ COMPLETED
**Goal:** Remove hard-coded dependencies from services

**Tasks:**
- [x] Update `GeoProjectionService.ts`:
  - Add `private projectionParams: ProjectionParams | null`
  - Add `setProjectionParams(params: ProjectionParams): void`
  - Replace `FRANCE_PROJECTION_PARAMS` with dynamic `params`
  - Make all projection methods use region params
- [x] Update `Cartographer.ts`:
  - Remove default imports from France
  - Make `geoDataConfig` required in constructor
  - Make `compositeConfig` optional (null check for custom composite)
  - Services now initialized with region-specific config

**Files modified:**
- ✅ `src/services/GeoProjectionService.ts`
- ✅ `src/cartographer/Cartographer.ts`

### Phase 5: Refactor Store to be Region-Agnostic ✅
**Goal:** Remove France-specific imports from store

**Tasks completed:**
- ✅ Updated `src/stores/config.ts`:
  - Removed `import { ALL_TERRITORIES, OVERSEAS_TERRITORIES } from france-territories`
  - Added `import { RegionService } from '@/services/RegionService'`
  - Added `import { TerritoryService } from '@/services/TerritoryService'`
  - Created computed `regionService: () => new RegionService(selectedRegion.value)`
  - Created initialization functions for territory projections/translations/scales
  - Changed to refs initialized with these functions (to maintain mutability for setters)
  - Updated watcher to reinitialize refs when region changes
  - Preserved defaultCompositeConfig override logic

**Implementation notes:**
- Used ref + initialization functions pattern instead of computed because setter methods exist that mutate these properties
- Initialization functions use RegionService to get region-specific territories dynamically
- Watch block now reinitializes defaults before applying config overrides

**Files modified:**
- ✅ `src/stores/config.ts`

### Phase 6: Update Views and Components
**Goal:** Use new factory pattern and services

**Tasks:**
- [ ] Update `MapView.vue`:
  - Import `CartographerFactory`
  - Use factory to create cartographer instances
  - Handle region switching properly
- [ ] Update components using territory data:
  - `TerritoryControls.vue`
  - `MapRenderer.vue`
  - Check for direct territory imports

**Files to modify:**
- `src/views/MapView.vue`
- `src/components/TerritoryControls.vue`
- `src/components/MapRenderer.vue`

### Phase 7: Deprecate Old Files
**Goal:** Remove or mark old structure as deprecated

**Tasks:**
- [ ] Add deprecation notices to:
  - `src/constants/territories/france-territories.ts`
  - `src/constants/territories/portugal-territories.ts`
  - `src/constants/territories/eu-territories.ts`
- [ ] Create migration guide
- [ ] Update documentation
- [ ] Eventually delete old files after confirming all works

### Phase 8: Testing and Documentation
**Goal:** Ensure everything works and is documented

**Tasks:**
- [ ] Test region switching
- [ ] Test all view modes per region
- [ ] Test territory mode filtering
- [ ] Update README with new architecture
- [ ] Create "Adding a New Region" guide
- [ ] Document service APIs

## 🎯 Key Principles

### Separation of Concerns
- **Data layer**: Pure territory definitions, no logic
- **Config layer**: Region-specific settings and defaults
- **Service layer**: Generic operations and region-aware facades
- **Store layer**: UI state management, region-agnostic
- **View layer**: Presentation only

### Single Responsibility
- Each file has ONE clear purpose
- TerritoryConfig = geographic data only
- RegionConfig = presentation and defaults
- Services = operations and transformations
- Store = reactive state

### Dependency Direction
```
Views/Components
      ↓
   Stores
      ↓
   Services (RegionService, CartographerFactory)
      ↓
   Services (TerritoryService, GeoDataService, etc.)
      ↓
  Config Layer (region configs)
      ↓
  Data Layer (pure territory data)
```

### No Hard-coded Region Names
- Avoid: `if (region === 'france')`
- Use: Region config properties and service methods
- Make everything data-driven

## 📊 Success Metrics

### Code Quality
- [ ] Zero hard-coded France references in generic files
- [ ] All services are region-agnostic
- [ ] Store has no direct territory imports
- [ ] Clear separation of data/config/logic

### Maintainability
- [ ] Adding a new region requires only 2 new files (data + config)
- [ ] No changes to services needed for new regions
- [ ] No changes to store needed for new regions
- [ ] No changes to views needed for new regions

### Type Safety
- [ ] All region configs are type-checked
- [ ] Territory operations are type-safe
- [ ] Service methods have proper types

## 🚨 Breaking Changes to Watch

### Phase 5 (Store Refactor) - CRITICAL
- `territoryProjections` changes from ref to computed
- `territoryTranslations` changes from ref to computed
- `territoryScales` changes from ref to computed
- Components reading these need to handle reactivity

### Phase 4 (Service Changes)
- `Cartographer` constructor signature changes
- `GeoProjectionService` requires region setup

### Phase 6 (View Updates)
- MapView must use CartographerFactory
- May need to handle async cartographer creation

## 📝 Current Status

**Status:** Phase 4 Complete - Services Now Region-Agnostic! 🎉
**Next Step:** Phase 5 - Refactor Store
**Completed Phases:** 4/8 (50%)
**Estimated Time Remaining:** 8-12 hours

## 🔍 Files Requiring Changes

### High Priority (Core Issues)
- ✅ `src/stores/config.ts` - Lines 5, 52-76 (France imports)
- ✅ `src/cartographer/Cartographer.ts` - Line 4 (France import)
- ✅ `src/services/GeoProjectionService.ts` - Line 4 (France import)
- ✅ `src/constants/territories/france-territories.ts` - Split into data + config

### Medium Priority (Architecture)
- `src/views/MapView.vue` - Use factory pattern
- `src/stores/geoData.ts` - Check for dependencies
- `src/components/TerritoryControls.vue` - Use services
- `src/components/MapRenderer.vue` - Use services

### Low Priority (Cleanup)
- `src/utils/territory-utils.ts` - May become obsolete
- `src/constants/regions.ts` - Update to use new config structure
- Documentation files
- Test files

## 💡 Notes

- Keep all changes backward-compatible until Phase 7
- Run tests after each phase
- Commit after each phase completion
- Update this file as we progress
- Mark tasks with ✅ when complete
- Add blockers or issues as discovered

---
**Last Updated:** 2025-10-08
**Current Phase:** Planning Complete
**Next Action:** Begin Phase 1
