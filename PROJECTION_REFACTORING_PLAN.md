# Projection System Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring plan to improve projection declaration, management, and assignment across the Atlas Composer application using industry-standard design patterns.

## Current Problems

### 1. **Scattered Configuration**
- Projection definitions in `projection-service.ts` (hardcoded array)
- Projection creation in switch statement
- Duplicate logic in `CompositeProjection`
- No single source of truth

### 2. **Hardcoded Categories**
- Categories like "Recommandées pour la France" are hardcoded
- Not internationalized
- Not atlas-aware
- Manual maintenance required

### 3. **Weak Type Safety**
- Projection names are strings
- No compile-time validation
- Easy to mistype projection names
- Schema validation disconnected from code

### 4. **No Context Awareness**
- Projections don't know which territories they suit
- No filtering by geographic region
- No scale recommendations
- Manual selection required

### 5. **Duplication**
- Projection creation logic duplicated:
  - `ProjectionService.getProjection()`
  - `CompositeProjection.updateTerritoryProjection()`
- Parameter application inconsistent

## Proposed Architecture

### Design Patterns Used

1. **Registry Pattern** - Centralized projection definitions
2. **Strategy Pattern** - Pluggable projection implementations
3. **Factory Pattern** - Consistent projection creation
4. **Builder Pattern** - Fluent projection configuration

### Directory Structure

```
src/projections/
├── types.ts                    # Type definitions
├── registry.ts                 # Central projection registry (singleton)
├── factory.ts                  # Projection factory
├── definitions/
│   ├── index.ts               # Re-exports all definitions
│   ├── composite.ts           # Composite projections (France, Portugal, EU)
│   ├── conic.ts               # Conic projections
│   ├── azimuthal.ts           # Azimuthal projections
│   ├── cylindrical.ts         # Cylindrical projections
│   ├── world.ts               # World projections
│   └── artistic.ts            # Artistic/historical projections
├── strategies/
│   ├── base-strategy.ts       # Base projection strategy
│   ├── d3-builtin-strategy.ts # D3 built-in projections
│   ├── d3-extended-strategy.ts # D3-geo-projection projections
│   └── composite-strategy.ts   # D3-composite-projections
└── recommender.ts             # Smart projection recommendations
```

## Implementation Phases

### Phase 1: Core Infrastructure ⭐⭐⭐ (High Priority)

**Objective**: Create type-safe, metadata-rich projection definitions

#### 1.1 Create Type Definitions (`types.ts`)

Create comprehensive TypeScript interfaces and enums for projection metadata. See full type definitions in the codebase documentation.

**Key Types**:
- `ProjectionDefinition` - Complete projection metadata
- `ProjectionCapabilities` - What the projection preserves/distorts
- `ProjectionSuitability` - Geographic context scoring
- `ProjectionCategory` & `ProjectionFamily` - Classification enums
- `ProjectionStrategy` - Implementation strategy (D3 builtin, extended, composite)
- `ProjectionFilterContext` - Context for filtering projections
- `ProjectionRecommendation` - Recommendation with score

#### 1.2 Create Projection Definitions

**Critical Projections (Required for Core Functionality)**:

🎯 **COMPOSITE PROJECTIONS** - The primary goal of this project
1. `conic-conformal-france` (D3_COMPOSITE) - Main composite for France
2. `conic-conformal-portugal` (D3_COMPOSITE) - Composite for Portugal
3. `conic-conformal-europe` (D3_COMPOSITE) - Composite for EU

🔧 **SUPPORTING PROJECTIONS** - Required for custom composite mode and territory controls
4. `conic-conformal` (D3_BUILTIN) - Individual territory projection
5. `albers` (D3_BUILTIN) - Individual territory projection
6. `mercator` (D3_BUILTIN) - Common for overseas territories

**Example Definition Structure**:
```typescript
{
  id: 'conic-conformal-france',
  name: 'projections.conicConformalFrance.name',
  category: ProjectionCategory.COMPOSITE,
  strategy: ProjectionStrategy.D3_COMPOSITE,
  capabilities: {
    preserves: ['angle'],
    supportsComposite: false, // Composite projections are already composite
    supportsSplit: false,
    supportsUnified: true
  },
  suitability: {
    excellent: [{ territoryType: 'mainland', region: 'europe' }],
    recommendedForAtlases: ['france']
  },
}
```

**Nice-to-Have Projections (Defer to Later)**:
- Azimuthal: `azimuthal-equal-area`, `azimuthal-equidistant`, `orthographic`, `stereographic`, `gnomonic`
- Cylindrical: `transverse-mercator`, `equirectangular`, `miller`
- World: `equal-earth`, `mollweide`, `sinusoidal`
- Compromise: `robinson`, `winkel3`
- Artistic: `aitoff`, `hammer`, `bertin1953`, `polyhedral-waterman`

#### 1.3 Create Projection Registry (`registry.ts`)

Singleton class that manages all projection definitions with methods for:
- `get(id)` - Retrieve by ID or alias
- `filter(context)` - Filter by atlas, view mode, territory
- `recommend(context)` - Score and rank projections
- `isValid(id)` - Validation

Key implementation details in codebase documentation.

#### 1.4 Create Projection Factory (`factory.ts`)

Factory class with strategy pattern implementation:
- `create(options)` - Main creation method
- `createById(id, options)` - Convenience wrapper
- `createD3Builtin()` - Handle D3 core projections
- `createD3Extended()` - Handle d3-geo-projection
- `createD3Composite()` - Handle d3-composite-projections

Maps projection IDs to D3 functions and applies parameters.

### Phase 2: Integration with Existing Code ⭐⭐

**Objective**: Replace existing projection management with the new registry system

#### 2.1 Refactor `ProjectionService`

Simplify `ProjectionService` to use `ProjectionFactory`:
- Replace switch statement with `ProjectionFactory.createById()`
- Add `getAvailableProjections(context)` method
- Add `getRecommendations(context)` method
- Keep backward compatibility

#### 2.2 Update Config Store

Replace `PROJECTION_OPTIONS` array with registry-based filtering:
- Use `projectionRegistry.filter(context)` to get available projections
- Filter by current atlas and view mode
- Group by category using i18n
- Maintain backward compatibility

### Phase 3: Atlas-Specific Projection Configuration ⭐

**Objective**: Allow atlases to declare projection preferences

#### 3.1 Extend Atlas Config Schema

Add `projectionPreferences` object to schema with:
- `recommended`: Array of recommended projection IDs
- `default.mainland`: Default projection for mainland
- `default.overseas`: Default projection for overseas territories
- `prohibited`: Array of unsuitable projection IDs

#### 3.2 Example Usage in france.json

```json
{
  "projectionPreferences": {
    "recommended": ["conic-conformal", "albers", "conic-equal-area"],
    "default": { "mainland": "conic-conformal", "overseas": "mercator" },
    "prohibited": ["gnomonic", "polyhedral-waterman"]
  }
}
```

### Phase 4: Enhanced UI Features ⭐

**Objective**: Leverage projection metadata for better UX

#### 4.1 Smart Projection Selector

- Show projection suitability indicators (⭐⭐⭐ excellent, ⭐⭐ good, ⭐ usable)
- Display projection properties (preserves area/angle)
- Show preview thumbnails
- Filter by territory type

#### 4.2 Projection Recommendations

- "Recommended for this territory" badge
- Explanation of why a projection is recommended
- Quick-switch to recommended projection

#### 4.3 Validation Warnings

- Warn when using unsuitable projections
- Suggest better alternatives
- Prevent invalid combinations

## Migration Strategy

### Step 1: Create New System (Non-Breaking)
- Implement all Phase 1 files
- Keep existing code working
- Add tests for new system

### Step 2: Parallel Operation
- Both old and new systems active
- New system validates against old
- Fix any discrepancies

### Step 3: Gradual Migration
- Migrate `ProjectionService` first
- Then `CompositeProjection`
- Then UI components
- Finally remove old code

### Step 4: Cleanup
- Remove old projection arrays
- Update documentation
- Add migration guide

## Benefits Summary

### For Developers
✅ **Type Safety**: Compile-time validation of projection names
✅ **Single Source of Truth**: All projection info in one place
✅ **Easy Extension**: Add projections without touching multiple files
✅ **Better Testing**: Isolated, testable components
✅ **No Duplication**: Unified projection creation logic

### For Users
✅ **Better Recommendations**: Smart projection suggestions
✅ **Context Awareness**: Only see relevant projections
✅ **Clear Information**: Understand projection properties
✅ **Validation**: Prevent invalid configurations
✅ **Internationalization**: Proper i18n support

### For Maintainability
✅ **Clear Architecture**: Well-defined patterns
✅ **Easy Updates**: Change projections in one place
✅ **Scalable**: Easy to add new projections/atlases
✅ **Documented**: Rich metadata for each projection
✅ **Testable**: Unit tests for all components

## Implementation Checklist

### Phase 0: Preparation 🔧

- [x] **0.1** Review and approve this refactoring plan
- [ ] **0.2** Create feature branch: `git checkout -b feature/projection-refactoring`
- [ ] **0.3** Set up testing infrastructure for new projection system
- [ ] **0.4** Create backup/snapshot of current projection-related files

---

### Phase 1: Core Infrastructure ⭐⭐⭐ (High Priority)

#### Task 1.1: Type Definitions
- [x] **1.1.1** Create `src/projections/` directory
- [x] **1.1.2** Create `src/projections/types.ts` with:
  - [x] `GeographicContext` interface
  - [x] `ProjectionCapabilities` interface
  - [x] `ProjectionSuitability` interface
  - [x] `ProjectionParameters` interface
  - [x] `ProjectionDefinition` interface
  - [x] `ProjectionCategory` enum
  - [x] `ProjectionFamily` enum
  - [x] `ProjectionStrategy` enum
  - [x] `ProjectionFilterContext` interface
  - [x] `ProjectionRecommendation` interface
- [x] **1.1.3** Add JSDoc documentation to all type definitions
- [x] **1.1.4** Export all types from `types.ts`

#### Task 1.2: Core Projection Definitions
- [x] **1.2.1** Create `src/projections/definitions/` directory
- [x] **1.2.2** Create `src/projections/definitions/composite.ts` with:
  - [x] `conic-conformal-france` definition ⭐ CRITICAL
  - [x] `conic-conformal-portugal` definition ⭐ CRITICAL
  - [x] `conic-conformal-europe` definition ⭐ CRITICAL
  - [x] Export `COMPOSITE_PROJECTIONS` array
- [x] **1.2.3** Create `src/projections/definitions/conic.ts` with:
  - [x] `conic-conformal` definition (for custom composite mode)
  - [x] `albers` / `conic-equal-area` definition (for custom composite mode)
  - [x] Export `CONIC_PROJECTIONS` array
- [x] **1.2.4** Create `src/projections/definitions/cylindrical.ts` with:
  - [x] `mercator` definition (for overseas territories)
  - [x] Export `CYLINDRICAL_PROJECTIONS` array
- [x] **1.2.5** Create `src/projections/definitions/index.ts` to re-export all definitions
- [x] **1.2.6** Create placeholder files for additional projection categories:
  - [x] `azimuthal.ts` (empty array for now)
  - [x] `world.ts` (empty array for now)
  - [x] `compromise.ts` (empty array for now)
  - [x] `artistic.ts` (empty array for now)

#### Task 1.2-EXTRA: Additional Projections (Nice-to-Have, Defer)
- [ ] Add remaining conic projections (conic-equidistant)
- [ ] Add azimuthal projections (5 projections)
- [ ] Add remaining cylindrical projections (3 projections)
- [ ] Add world projections (3 projections)
- [ ] Add compromise projections (2 projections)
- [ ] Add artistic projections (4 projections)

#### Task 1.3: Projection Registry
- [x] **1.3.1** Create `src/projections/registry.ts`
- [x] **1.3.2** Implement `ProjectionRegistry` class with:
  - [x] Singleton pattern implementation
  - [x] Private `definitions` Map
  - [x] `registerAll()` private method
  - [x] `register()` method with alias support
  - [x] `get()` method for retrieval by ID/alias
  - [x] `getAll()` method (deduplicated)
  - [x] `getByCategory()` method
  - [x] `getByStrategy()` method
  - [x] `filter()` method with context support
  - [x] `recommend()` method with scoring
  - [x] `isValid()` validation method
  - [x] `getCategories()` method
- [x] **1.3.3** Add comprehensive JSDoc comments
- [x] **1.3.4** Export singleton instance `projectionRegistry`
- [ ] **1.3.5** Add unit tests for registry

#### Task 1.4: Projection Factory
- [x] **1.4.1** Create `src/projections/factory.ts`
- [x] **1.4.2** Define `ProjectionFactoryOptions` interface
- [x] **1.4.3** Implement `ProjectionFactory` class with:
  - [x] `create()` static method (main entry point)
  - [x] `createById()` convenience method
  - [x] `createD3Builtin()` private method
  - [x] `createD3Extended()` private method
  - [x] `createD3Composite()` private method
- [x] **1.4.4** Map all projection IDs to D3 functions in each strategy method
- [x] **1.4.5** Handle projection parameters (center, rotate, parallels, scale)
- [x] **1.4.6** Add error handling for unknown projections
- [ ] **1.4.7** Add unit tests for factory

#### Task 1.5: Internationalization
- [x] **1.5.1** Add projection names to `src/i18n/locales/en.json`
- [x] **1.5.2** Add projection names to `src/i18n/locales/fr.json`
- [x] **1.5.3** Add projection descriptions to both locale files
- [x] **1.5.4** Add category translations to both locale files

#### Task 1.6: Testing Phase 1
- [ ] **1.6.1** Create `src/projections/__tests__/` directory
- [ ] **1.6.2** Write unit tests for `registry.ts`
- [ ] **1.6.3** Write unit tests for `factory.ts`
- [ ] **1.6.4** Write integration tests (registry + factory)
- [ ] **1.6.5** Verify all tests pass
- [ ] **1.6.6** Check code coverage (aim for >80%)

---

### Phase 2: Integration with Existing Code ⭐⭐

#### Task 2.1: Refactor ProjectionService
- [x] **2.1.1** Backup current `src/services/projection-service.ts`
- [ ] **2.1.2** Remove `PROJECTION_OPTIONS` array export (deferred - keep for backward compatibility)
- [x] **2.1.3** Keep `ProjectionOption` interface for backward compatibility
- [ ] **2.1.4** Simplify `getProjection()` to use `ProjectionFactory.createById()` (deferred - keep old logic)
- [x] **2.1.5** Add `getAvailableProjections(context)` method
- [x] **2.1.6** Add `getRecommendations(context)` method
- [x] **2.1.7** Add `createProjection()` method (new factory-based method)
- [x] **2.1.8** Add `isValidProjection()` validation method
- [x] **2.1.9** Import new projection system types and classes

#### Task 2.2: Update CompositeProjection
- [ ] **2.2.1** Backup current `src/services/composite-projection.ts`
- [ ] **2.2.2** Replace projection creation switch in `updateTerritoryProjection()` with factory
- [ ] **2.2.3** Use `ProjectionFactory.createById()` for all projection instances
- [ ] **2.2.4** Remove duplicate projection creation logic
- [ ] **2.2.5** Add validation using `projectionRegistry.isValid()`
- [ ] **2.2.6** Test composite projection updates with new factory

#### Task 2.3: Update Config Store
- [ ] **2.3.1** Import `projectionRegistry` in `src/stores/config.ts`
- [ ] **2.3.2** Update `projectionGroups` computed property to use registry
- [ ] **2.3.3** Add projection filtering by atlas context
- [ ] **2.3.4** Update projection initialization logic
- [ ] **2.3.5** Add projection validation in setters
- [ ] **2.3.6** Keep backward compatibility with existing projection strings

#### Task 2.4: Update MapRenderer
- [ ] **2.4.1** Verify `MapRenderer.vue` works with refactored services
- [ ] **2.4.2** Update projection prop validation if needed
- [ ] **2.4.3** Test all view modes (split, composite-custom, composite-existing, unified)

#### Task 2.5: Update Cartographer Service
- [ ] **2.5.1** Verify `cartographer-service.ts` works with new ProjectionService
- [ ] **2.5.2** Test simple render mode
- [ ] **2.5.3** Test composite render modes
- [ ] **2.5.4** Verify projection parameter passing

#### Task 2.6: Testing Phase 2
- [ ] **2.6.1** Run all existing unit tests
- [ ] **2.6.2** Run all integration tests
- [ ] **2.6.3** Manual testing: Load each atlas (France, Portugal, EU)
- [ ] **2.6.4** Manual testing: Switch between view modes
- [ ] **2.6.5** Manual testing: Change projections in each mode
- [ ] **2.6.6** Manual testing: Verify territory controls work
- [ ] **2.6.7** Fix any bugs discovered during testing

---

### Phase 3: Atlas-Specific Configuration ⭐

#### Task 3.1: Schema Updates
- [ ] **3.1.1** Backup `configs/schema.json`
- [ ] **3.1.2** Add `projectionPreferences` object to schema
- [ ] **3.1.3** Add `projectionPreferences.recommended` array
- [ ] **3.1.4** Add `projectionPreferences.default` object with mainland/overseas
- [ ] **3.1.5** Add `projectionPreferences.prohibited` array
- [ ] **3.1.6** Add descriptions and examples to schema
- [ ] **3.1.7** Validate schema with JSON Schema validator

#### Task 3.2: Update Atlas Configs
- [ ] **3.2.1** Update `configs/france.json` with projection preferences
  - [ ] Add recommended projections for France
  - [ ] Set default mainland projection
  - [ ] Set default overseas projection
  - [ ] Add any prohibited projections
- [ ] **3.2.2** Update `configs/portugal.json` with projection preferences
  - [ ] Add recommended projections for Portugal
  - [ ] Set default projections
- [ ] **3.2.3** Update `configs/eu.json` with projection preferences (if exists)
  - [ ] Add recommended projections for EU
  - [ ] Set default projections
- [ ] **3.2.4** Validate all configs against updated schema

#### Task 3.3: Update Config Loader
- [ ] **3.3.1** Update `src/core/atlases/loader.ts` to read projection preferences
- [ ] **3.3.2** Add projection preferences to `AtlasSpecificConfig` interface
- [ ] **3.3.3** Transform projection preferences in `loadAtlasConfig()`
- [ ] **3.3.4** Update TypeScript types in `src/types/territory.d.ts`
- [ ] **3.3.5** Test config loading with new preferences

#### Task 3.4: Update Atlas Service
- [ ] **3.4.1** Add `getProjectionPreferences()` method to `AtlasService`
- [ ] **3.4.2** Add `getRecommendedProjections()` method
- [ ] **3.4.3** Add `getDefaultProjection(territoryType)` method
- [ ] **3.4.4** Add `isProjectionProhibited(projectionId)` method
- [ ] **3.4.5** Update registry filtering to respect atlas preferences

#### Task 3.5: Testing Phase 3
- [ ] **3.5.1** Test config loading with projection preferences
- [ ] **3.5.2** Test atlas service methods
- [ ] **3.5.3** Verify recommended projections display correctly
- [ ] **3.5.4** Verify prohibited projections are filtered out
- [ ] **3.5.5** Test default projection initialization

---

### Phase 4: Enhanced UI Features ⭐

#### Task 4.1: Smart Projection Selector
- [ ] **4.1.1** Update projection selector in `MapView.vue`
- [ ] **4.1.2** Add suitability indicators (★★★ excellent, ★★ good, ★ usable)
- [ ] **4.1.3** Display projection properties (preserves area/angle)
- [ ] **4.1.4** Add "Recommended" badge for suitable projections
- [ ] **4.1.5** Group projections by category with better UI
- [ ] **4.1.6** Add search/filter functionality

#### Task 4.2: Territory Controls Enhancement
- [ ] **4.2.1** Update `TerritoryControls.vue` projection selectors
- [ ] **4.2.2** Show recommendations for each territory type
- [ ] **4.2.3** Add projection preview/description on hover
- [ ] **4.2.4** Filter projections by territory context
- [ ] **4.2.5** Add "Use Recommended" quick action button

#### Task 4.3: Projection Information Display
- [ ] **4.3.1** Create `ProjectionInfo.vue` component
- [ ] **4.3.2** Display projection name, description, properties
- [ ] **4.3.3** Show preservation characteristics (area/angle/distance)
- [ ] **4.3.4** Show suitability score and reason
- [ ] **4.3.5** Add projection metadata (creator, year, etc.)
- [ ] **4.3.6** Integrate into UI where appropriate

#### Task 4.4: Validation & Warnings
- [ ] **4.4.1** Add projection validation on selection
- [ ] **4.4.2** Show warning toast for poor projections
- [ ] **4.4.3** Suggest better alternatives in warnings
- [ ] **4.4.4** Add confirmation dialog for prohibited projections
- [ ] **4.4.5** Update `ToastNotification.vue` if needed

#### Task 4.5: UI Polish
- [ ] **4.5.1** Update styles for new projection UI components
- [ ] **4.5.2** Add icons for projection categories
- [ ] **4.5.3** Improve responsive design for projection selector
- [ ] **4.5.4** Add loading states for projection recommendations
- [ ] **4.5.5** Add animations/transitions for better UX

#### Task 4.6: Testing Phase 4
- [ ] **4.6.1** Test projection selector in all view modes
- [ ] **4.6.2** Test territory-specific recommendations
- [ ] **4.6.3** Test validation warnings
- [ ] **4.6.4** Test UI on different screen sizes
- [ ] **4.6.5** Cross-browser testing (Chrome, Firefox, Safari)
- [ ] **4.6.6** Accessibility testing (keyboard navigation, screen readers)

---

### Phase 5: Documentation & Cleanup 📚

#### Task 5.1: Code Documentation
- [ ] **5.1.1** Add/update JSDoc comments for all new code
- [ ] **5.1.2** Document projection registry usage patterns
- [ ] **5.1.3** Document factory patterns and extension points
- [ ] **5.1.4** Add inline comments for complex logic

#### Task 5.2: User Documentation
- [ ] **5.2.1** Update `README.md` with new projection system
- [ ] **5.2.2** Create `docs/PROJECTIONS.md` guide
- [ ] **5.2.3** Document how to add new projections
- [ ] **5.2.4** Document atlas projection configuration
- [ ] **5.2.5** Add examples and best practices

#### Task 5.3: Migration Guide
- [ ] **5.3.1** Create `docs/PROJECTION_MIGRATION.md`
- [ ] **5.3.2** Document breaking changes (if any)
- [ ] **5.3.3** Provide migration examples
- [ ] **5.3.4** Document deprecation timeline

#### Task 5.4: Code Cleanup
- [ ] **5.4.1** Remove old `PROJECTION_OPTIONS` export (if fully replaced)
- [ ] **5.4.2** Remove duplicate projection creation logic
- [ ] **5.4.3** Clean up unused imports
- [ ] **5.4.4** Remove commented-out code
- [ ] **5.4.5** Run linter and fix all issues
- [ ] **5.4.6** Run formatter on all modified files

#### Task 5.5: Final Testing
- [ ] **5.5.1** Run complete test suite
- [ ] **5.5.2** Run E2E tests (if available)
- [ ] **5.5.3** Performance testing (load time, projection switching)
- [ ] **5.5.4** Memory leak testing
- [ ] **5.5.5** Full manual testing cycle (all atlases, all modes)

#### Task 5.6: Prepare for Merge
- [ ] **5.6.1** Rebase on latest `develop` branch
- [ ] **5.6.2** Resolve any merge conflicts
- [ ] **5.6.3** Squash/organize commits logically
- [ ] **5.6.4** Write comprehensive PR description
- [ ] **5.6.5** Tag reviewers
- [ ] **5.6.6** Create demo video/screenshots for PR

---

## Summary

### Milestone Tracking

- [ ] **Milestone 1**: Phase 1 Complete (Core Infrastructure Ready)
- [ ] **Milestone 2**: Phase 2 Complete (Integration Complete, Backward Compatible)
- [ ] **Milestone 3**: Phase 3 Complete (Atlas Configuration Supported)
- [ ] **Milestone 4**: Phase 4 Complete (Enhanced UI Live)
- [ ] **Milestone 5**: Phase 5 Complete (Ready for Production)

### Progress Tracking

**Overall Progress**: 52/154 tasks complete (33.8%)

**Current Phase**: Phase 1 - Core Infrastructure (Almost Complete)

**Critical Path**:
1. ⭐ Composite projections (france, portugal, europe) - Project core functionality
2. Supporting projections (conic-conformal, albers, mercator) - For custom composite mode
3. Registry & Factory infrastructure - Unified projection management
4. Integration with existing services - Backward compatibility

**Next Steps**:
1. ✅ Review and approve plan
2. Create feature branch
3. Begin Phase 1 implementation with composite projections
4. Test composite projection functionality first

---

**Status**: 📋 Ready for Implementation
**Last Updated**: 2025-10-08
