# Atlas Composer - Preset Systems Architecture Analysis

**Date:** October 20, 2025
**Analysis Scope:** Dual preset system architecture (composite-custom vs view-mode presets)
**Primary Goal:** Identify architectural patterns, duplication, and improvement opportunities while preserving export/import capabilities

---

## Executive Summary

Atlas Composer employs a **recently unified but functionally dual preset system** that serves two distinct use cases:

1. **Composite-Custom Presets** - Rich, exportable configurations for custom composite projections (atlas initialization)
2. **View-Mode Presets** - Lightweight projection configurations for unified, split, and built-in-composite modes (runtime switching)

The system underwent Phase 2 Unification (merged into single registry/loader) but retains **architectural separation** due to fundamentally different purposes:
- **Composite-custom** = Complete cartographic configuration (exportable, importable, round-trip capable)
- **View presets** = Simple projection settings (UI convenience, no export requirement)

### Key Finding
The dual system is **intentional and justified**, not accidental duplication. However, opportunities exist for:
- Clearer architectural boundaries (fix loading flow confusion)
- Better reusability of converters/validators
- Streamlined application logic

---

## 1. Architectural Analysis

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      UNIFIED PRESET SYSTEM                       │
│                     (Single Registry v2.0)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐         ┌──────────────────────────┐  │
│  │  Composite-Custom    │         │   View-Mode Presets      │  │
│  │     Presets          │         │  (unified/split/built-in)│  │
│  ├──────────────────────┤         ├──────────────────────────┤  │
│  │ • Full configuration │         │ • Projection ID + params │  │
│  │ • Per-territory data │         │ • Lightweight structure  │  │
│  │ • Layout properties  │         │ • No layout data         │  │
│  │ • Geographic bounds  │         │ • No export requirement  │  │
│  │ • Export/import      │         │ • UI convenience only    │  │
│  │ • Round-trip capable │         │ • Runtime switching      │  │
│  └──────────────────────┘         └──────────────────────────┘  │
│           │                                    │                  │
│           ├────────────────┬───────────────────┤                  │
│           ▼                ▼                   ▼                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │            Core Layer (src/core/presets/)                   │  │
│  │  • Types (discriminated union)                              │  │
│  │  • Validators (strategy pattern)                            │  │
│  │  • Converters (format transformations)                      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │          Service Layer (src/services/presets/)              │  │
│  │  • PresetLoader (unified loading for all types)             │  │
│  │  • PresetApplicationService (type-specific handlers)        │  │
│  │  • AtlasMetadataService (metadata extraction)               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│           ┌──────────────────┴───────────────────┐               │
│           ▼                                      ▼               │
│  ┌──────────────────┐                  ┌──────────────────────┐  │
│  │ Atlas Init Path  │                  │ View Preset API Path │  │
│  │ (AtlasCoordinator)│                 │ (ConfigStore)        │  │
│  └──────────────────┘                  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Patterns

#### Pattern A: Atlas Initialization (Composite-Custom)
```
App Startup / Atlas Change
  ↓
AtlasCoordinator.handleAtlasChange()
  ↓
PresetLoader.loadPreset(defaultPreset)
  → Registry lookup (type: 'composite-custom')
  → File load & validation
  → Returns LoadResult<CompositePreset>
  ↓
PresetLoader.convertToDefaults()
  → Extract projections map
  → Extract translations map
  → Extract scales map
  ↓
PresetLoader.extractTerritoryParameters()
  → Extract projection parameters
  → Extract layout properties
  → Return per-territory params
  ↓
Apply to Stores (parameterStore, configStore)
  ↓
CompositeProjection.initialize()
  → Read parameters via ProjectionParameterProvider
  → Apply to D3 projections
  ↓
First Render (preset applied)
```

#### Pattern B: View Preset Switching (Unified/Split/Built-in-Composite)
```
User Selects View Preset (dropdown)
  ↓
configStore.loadViewPreset(presetId)
  ↓
PresetLoader.loadPreset(presetId)
  → Registry lookup (type: 'unified'|'split'|'built-in-composite')
  → File load & validation
  → Returns LoadResult<UnifiedPreset|SplitPreset|CompositeExistingPreset>
  ↓
PresetApplicationService.applyPreset(preset)
  → Routes to type-specific handler
  → applyUnified() / applySplit() / applyCompositeExisting()
  ↓
Update Stores (parameterStore, configStore)
  ↓
Render Update (new projection applied)
```

### 1.3 Critical Architectural Issue: Mixed Loading Paths

**Problem Identified:**
Composite-custom presets can currently be loaded through BOTH paths:
- ✅ **Correct Path:** Atlas initialization (AtlasCoordinator) - Full parameter extraction
- ❌ **Incorrect Path:** View preset API (configStore.loadViewPreset) - Currently blocked with error

**Current State:**
- `PresetApplicationService.applyCompositeCustom()` returns error: "Composite-custom presets should be loaded through atlas initialization, not view preset API"
- `loadAvailableViewPresets()` in ConfigStore does NOT filter by type, so composite-custom presets appear in dropdown
- ViewPresetSelector UI correctly filters: `shouldShow` only displays for `['unified', 'split', 'built-in-composite']`

**Issue:**
Architectural confusion - loader accepts composite-custom but application layer rejects it. Creates maintainability risk.

---

## 2. Type System Analysis

### 2.1 Discriminated Union Structure

```typescript
// Excellent design - type-safe discrimination
export type PresetType = 'composite-custom' | 'unified' | 'split' | 'built-in-composite'

export type Preset
  = | CompositePreset // type: 'composite-custom'
    | UnifiedPreset // type: 'unified'
    | SplitPreset // type: 'split'
    | CompositeExistingPreset // type: 'built-in-composite'

// Each has:
// - BasePresetMetadata (id, name, description, atlasId)
// - type discriminator
// - config (type-specific)
```

**Strengths:**
- TypeScript discriminated union provides compile-time safety
- Single unified `Preset` type simplifies loader API
- `LoadResult<T>` generic pattern enables flexible return types
- Type narrowing works automatically: `if (preset.type === 'unified') { /* config is UnifiedViewConfig */ }`

**Observations:**
- Config types are NOT in a union (CompositeCustomConfig, UnifiedViewConfig, SplitViewConfig, CompositeExistingViewConfig)
- This is correct - they're fundamentally different structures
- Discriminated union is at Preset level, not Config level

### 2.2 Configuration Structure Comparison

| Aspect | Composite-Custom | View Presets (Unified/Split/Built-in) |
|--------|------------------|---------------------------------------|
| **Complexity** | High (200-600 lines JSON) | Low (20-60 lines JSON) |
| **Structure** | Full ExportedCompositeConfig | Simple projection configuration |
| **Metadata** | Rich (exportDate, createdWith, notes) | Minimal (id, name, description) |
| **Territories** | Array with full config per territory | Mainland + territories map (split only) |
| **Parameters** | Complete projection parameters | Basic parameters (center/rotate/parallels) |
| **Layout** | translateOffset, pixelClipExtent | None |
| **Bounds** | Geographic bounds per territory | None |
| **Inheritance** | Complete parameter hierarchy | Direct parameter setting |
| **Export** | Round-trip capable (JSON ↔ Store) | Not exportable |

**Key Insight:**
Composite-custom is a **data interchange format** (like GeoJSON or TopoJSON) designed for external use.
View presets are **application-specific shortcuts** with no external use case.

---

## 3. Validation & Conversion Analysis

### 3.1 Validator Architecture

```typescript
// Strategy Pattern - Routes by type
export function validatePreset(
  preset: any,
  presetType: PresetType,
  jsonText?: string
): ViewPresetValidationResult {
  switch (presetType) {
    case 'composite-custom':
      return validateCompositePreset(jsonText!, preset)
    case 'unified':
    case 'split':
    case 'built-in-composite':
      return validateViewPreset(preset)
  }
}
```

**Validation Depth Comparison:**

| Validation Type | Composite-Custom | View Presets |
|----------------|------------------|--------------|
| **Structural** | CompositeImportService (full schema) | Simple field checks |
| **Parameters** | Parameter registry integration | Parameter registry integration |
| **Required** | projectionId, translateOffset, parameters | projection.id, projection.parameters |
| **Family-aware** | Yes - checks relevance per family | Yes - checks relevance per family |
| **Territory-specific** | Per-territory validation | Mainland + territories validation |
| **Bounds** | Validates geographic bounds | No bounds |
| **Layout** | Validates layout properties | No layout |

**Code Reuse:**
- ✅ Both use `parameterRegistry.validateParameters()`
- ✅ Both use `projectionRegistry.get()` for projection lookup
- ✅ Both use shared validation utilities (`validateAtlasId`, `validateProjectionId`, `validateProjectionParameters`)
- ❌ Different validation entry points (structural differences justify this)

### 3.2 Converter Functions

```typescript
// Core converters (src/core/presets/converter.ts)
export function convertToDefaults(preset: ExportedCompositeConfig): TerritoryDefaults
export function extractTerritoryParameters(preset: ExportedCompositeConfig): Record<string, ProjectionParameters>
```

**Usage Pattern:**
- **Composite-custom:** Uses BOTH converters during atlas initialization
- **View presets:** Uses NEITHER converter (different application path)

**Observations:**
- Converters are composite-custom specific (accept ExportedCompositeConfig)
- No conversion needed for view presets (direct application)
- **This is not duplication - it's specialized functionality**

**convertToDefaults() breakdown:**
```typescript
// Extracts:
projections: { 'FR-MET': 'conic-conformal', 'FR-GP': 'mercator', ... }
translations: { 'FR-MET': {x: 0, y: 0}, 'FR-GP': {x: -324, y: -38}, ... }
scales: { 'FR-MET': 1, 'FR-GP': 1.4, ... }
```

**extractTerritoryParameters() breakdown:**
```typescript
// Extracts per territory:
{
  projectionId: 'conic-conformal',
  rotate: [-3, -46.2, 0],
  parallels: [0, 60],
  scaleMultiplier: 1,
  translateOffset: [0, 0],
  pixelClipExtent: [-268.92, -245.16, 260.99, 324],
  // ... all exportable parameters from registry
}
```

**Why separate functions?**
- `convertToDefaults()` → TerritoryStore initialization (projections, translations, scales)
- `extractTerritoryParameters()` → ParameterStore initialization (all parameters)
- Different destination stores, different formats required

---

## 4. Loading & Application Pattern Analysis

### 4.1 Loader Service (PresetLoader)

**Unified Design:**
```typescript
static async loadPreset(presetId: string): Promise<LoadResult<Preset>> {
  // 1. Registry lookup
  const registryEntry = registry.presets.find(p => p.id === presetId)

  // 2. Type-based routing
  if (registryEntry.type === 'composite-custom') {
    // Composite validation path
    const validation = validateCompositePreset(jsonText, fileResult.data)
    return { success, data: CompositePreset, errors, warnings }
  } else {
    // View preset validation path
    const validation = validateViewPreset(fileResult.data)
    return { success, data: UnifiedPreset|SplitPreset|CompositeExistingPreset, errors, warnings }
  }
}
```

**Strengths:**
- ✅ Single entry point for all types
- ✅ Discriminated union return type
- ✅ Consistent error handling
- ✅ Type-aware validation routing
- ✅ Cached registry access

**Weakness:**
- ⚠️ No filtering in `listPresets()` - caller must filter
- ⚠️ Loads composite-custom through general API (should be restricted?)

### 4.2 Application Service (PresetApplicationService)

**Strategy Pattern:**
```typescript
static applyPreset(preset: Preset): ApplicationResult {
  switch (preset.type) {
    case 'composite-custom':
      return this.applyCompositeCustom(preset.config)  // Currently returns error!
    case 'unified':
      return this.applyUnified(preset.config)
    case 'split':
      return this.applySplit(preset.config)
    case 'built-in-composite':
      return this.applyCompositeExisting(preset.config)
  }
}
```

**Current Implementation:**

| Type | Handler | Store Updates | Complexity |
|------|---------|---------------|------------|
| `composite-custom` | **Returns error** | None | N/A (blocked) |
| `unified` | Sets projection ID + global params | parameterStore | Simple |
| `split` | Sets per-territory projections + params | parameterStore | Medium |
| `built-in-composite` | Sets composite projection ID | configStore | Simple |

**Issue Analysis:**
```typescript
private static applyCompositeCustom(_config: CompositeCustomConfig): ApplicationResult {
  // Current implementation returns error:
  return {
    success: false,
    errors: ['Composite-custom presets should be loaded through atlas initialization, not view preset API'],
    warnings: [],
  }
}
```

**Why this exists:**
The error message is **architectural documentation in code** - it enforces that composite-custom presets use the atlas initialization path, not the view preset path. However, this creates confusion:

1. **Loader accepts it** (PresetLoader.loadPreset returns CompositePreset)
2. **Application rejects it** (PresetApplicationService.applyCompositeCustom throws error)
3. **UI filters it** (ViewPresetSelector.shouldShow excludes composite-custom)
4. **Store doesn't filter it** (loadAvailableViewPresets doesn't check type)

---

## 5. Duplication Analysis

### 5.1 Actual Duplication (Minimal)

**None Found.** The system has excellent separation:

| Functionality | Composite-Custom | View Presets | Shared |
|---------------|------------------|--------------|--------|
| **Validation** | validateCompositePreset | validateViewPreset | Parameter registry, utilities |
| **Conversion** | convertToDefaults, extractTerritoryParameters | N/A (direct apply) | N/A |
| **Application** | AtlasCoordinator path | PresetApplicationService | Parameter store |
| **Storage** | Registry v2.0 | Registry v2.0 | ✅ Shared |
| **Loading** | PresetLoader | PresetLoader | ✅ Shared |

### 5.2 Perceived Duplication (Actually Specialization)

**Case 1: Two validation functions**
- `validateCompositePreset()` - Deep structural validation, CompositeImportService integration
- `validateViewPreset()` - Simple field validation, mode-specific checks
- **Verdict:** Not duplication - different complexity requirements

**Case 2: Two application paths**
- AtlasCoordinator → convertToDefaults → extractTerritoryParameters → store updates
- PresetApplicationService → direct store updates
- **Verdict:** Not duplication - different data complexity and initialization requirements

**Case 3: Two loading contexts**
- Atlas initialization (app startup, atlas change)
- Runtime preset switching (user action)
- **Verdict:** Not duplication - different lifecycle events

### 5.3 Technical Debt Analysis

**Low Technical Debt Overall**

Recent Phase 2 Unification (merged registries, unified loader) eliminated most duplication.

**Remaining Concerns:**
1. **Architectural boundary leakage** - Composite-custom accessible through wrong API
2. **Inconsistent filtering** - Store doesn't filter, UI does, application service blocks
3. **Converter reuse potential** - Could view presets benefit from conversion layer?

---

## 6. Export/Import Integration Analysis

### 6.1 Export System (Composite-Custom Only)

```
User Action: Export Composite Configuration
  ↓
CompositeExportService.exportToJSON()
  → Uses ProjectionParameterProvider
  → Uses Parameter Registry for exportable parameters
  → Builds ExportedCompositeConfig
  ↓
JSON File / Code Generation
  → createCompositeProjection() function
  → D3.js/TypeScript/Observable Plot variants
  → Stream multiplexing implementation
  ↓
User Downloads / Copies to Clipboard
```

**Critical Requirements:**
- Must include ALL territory configurations
- Must include layout properties (translateOffset, pixelClipExtent)
- Must include geographic bounds for stream routing
- Must be round-trip capable (export → import → identical state)
- Must work in external applications (not just Atlas Composer)

**Why View Presets Can't Be Exported:**
- No layout data (territories would have wrong positions)
- No bounds data (stream routing would fail)
- No scale relationships (relative scaling would break)
- No reference scale (absolute scaling would be wrong)
- Incomplete for external use (missing critical cartographic data)

### 6.2 Import System

```typescript
CompositeImportService.importFromFile(file)
  ↓
Parse JSON → ExportedCompositeConfig
  ↓
Validate (CompositeImportService → validateCompositePreset)
  ↓
Apply to Stores:
  1. Global parameters (referenceScale, canvasDimensions) → configStore
  2. Per-territory projections → parameterStore
  3. Translations → parameterStore
  4. Scale multipliers → parameterStore
  5. Projection parameters → parameterStore
  6. Update CompositeProjection (critical!)
  ↓
Render with imported configuration
```

**Integration Points:**
- Import service uses same validators as preset loader
- Import applies similar store updates as atlas initialization
- **Key Difference:** Import updates existing state, initialization creates new state

### 6.3 Export/Import vs Preset Loading

| Aspect | Export/Import | Preset Loading |
|--------|---------------|----------------|
| **Trigger** | User action (manual) | Automatic (atlas init) |
| **Source** | File upload / generation | Registry-based file load |
| **Validation** | CompositeImportService | PresetLoader |
| **Format** | ExportedCompositeConfig | CompositeCustomConfig (extends Exported) |
| **Atlas Metadata** | None | Optional (atlasMetadata field) |
| **Application** | Direct store updates | Coordinator-orchestrated updates |
| **Use Case** | External interop, backup | Default configuration |

**Why separate?**
Export/Import handles **arbitrary external configurations** (no registry entry required).
Preset loading handles **registered default configurations** (must be in registry).

---

## 7. Reusability Opportunities

### 7.1 Converter Pattern Extension

**Current State:**
Converters only work with composite-custom presets:
```typescript
convertToDefaults(preset: ExportedCompositeConfig): TerritoryDefaults
extractTerritoryParameters(preset: ExportedCompositeConfig): Record<string, ProjectionParameters>
```

**Opportunity:**
Create adapter layer for view presets:
```typescript
// New unified interface
interface PresetConverter<TConfig> {
  toDefaults(config: TConfig): TerritoryDefaults | null
  toParameters(config: TConfig): Record<string, ProjectionParameters>
}

class CompositeConverter implements PresetConverter<CompositeCustomConfig> { ... }
class UnifiedConverter implements PresetConverter<UnifiedViewConfig> { ... }
class SplitConverter implements PresetConverter<SplitViewConfig> { ... }

// Application becomes uniform:
const converter = getConverter(preset.type)
const defaults = converter.toDefaults(preset.config)
const parameters = converter.toParameters(preset.config)
```

**Benefits:**
- Uniform application logic
- Easier to add new preset types
- Better testability (converter isolation)

**Trade-off:**
- Adds abstraction layer (complexity)
- View presets don't need territory defaults (would return null)
- May be over-engineering for current needs

**Recommendation:** **Not worth it yet.** Current pattern is clear and functional. Consider if adding 5+ more preset types.

### 7.2 Validation Harmonization

**Current State:**
Two validation entry points with different depths:
```typescript
validateCompositePreset(jsonText: string, rawPreset: CompositeCustomConfig): LoadResult<CompositeCustomConfig>
validateViewPreset(preset: ViewPreset): ViewPresetValidationResult
```

**Opportunity:**
Unified validator interface:
```typescript
interface PresetValidator<TConfig> {
  validate(config: TConfig, jsonText?: string): ValidationResult
}

class CompositeValidator implements PresetValidator<CompositeCustomConfig> { ... }
class ViewPresetValidator<T extends ViewPresetMode> implements PresetValidator<ViewConfig<T>> { ... }
```

**Benefits:**
- Uniform validation API
- Plugin architecture for new types
- Cleaner error aggregation

**Recommendation:** **Worth considering.** Would clean up PresetLoader.loadPreset() routing logic.

### 7.3 Application Handler Registry

**Current State:**
Switch statement in PresetApplicationService:
```typescript
switch (preset.type) {
  case 'composite-custom': return this.applyCompositeCustom(...)
  case 'unified': return this.applyUnified(...)
  case 'split': return this.applySplit(...)
  case 'built-in-composite': return this.applyCompositeExisting(...)
}
```

**Opportunity:**
Handler registry pattern:
```typescript
const handlers = new Map<PresetType, PresetApplicationHandler>([
  ['unified', new UnifiedHandler()],
  ['split', new SplitHandler()],
  ['built-in-composite', new BuiltInCompositeHandler()],
])

static applyPreset(preset: Preset): ApplicationResult {
  const handler = handlers.get(preset.type)
  if (!handler) throw new Error(`No handler for type: ${preset.type}`)
  return handler.apply(preset.config, { configStore, parameterStore })
}
```

**Benefits:**
- Extensible without modifying service
- Each handler fully isolated
- Easier to test handlers independently

**Recommendation:** **Low priority.** Current switch is simple and readable. Handler registry adds complexity for minimal benefit given only 3-4 types.

---

## 8. Critical Issue: Loading Path Confusion

### 8.1 Problem Statement

**Current Behavior:**
1. `PresetLoader.loadPreset()` can load composite-custom presets ✅
2. `PresetApplicationService.applyCompositeCustom()` rejects them ❌
3. `ViewPresetSelector` UI doesn't show composite-custom ✅
4. `configStore.loadAvailableViewPresets()` doesn't filter by type ❌

**Result:** Architectural inconsistency and potential runtime errors.

### 8.2 Root Cause

Composite-custom presets require **full initialization sequence** (converters, parameter extraction, coordinator orchestration).

View preset API provides **simple application** (direct parameter setting).

**These are incompatible approaches.**

### 8.3 Solution Options

**Option A: Filter at API Level (Recommended)**
```typescript
// In configStore.loadAvailableViewPresets()
async function loadAvailableViewPresets() {
  const presets = await PresetLoader.listPresets({
    atlasId: selectedAtlas.value,
    viewMode: viewMode.value as any,
  })
  // Filter out composite-custom (they use atlas initialization path)
  availableViewPresets.value = presets.filter(p => p.type !== 'composite-custom')
}
```

**Benefits:**
- ✅ Prevents error from ever occurring
- ✅ Clear separation of concerns
- ✅ Documents architectural boundary
- ✅ Minimal code change

**Option B: Implement Full Application**
```typescript
private static applyCompositeCustom(config: CompositeCustomConfig): ApplicationResult {
  // Call same logic as AtlasCoordinator
  const defaults = convertToDefaults(config)
  const parameters = extractTerritoryParameters(config)
  // Apply to stores...
  // But wait - this requires atlas context, coordinator state, etc.
  // Complexity explodes!
}
```

**Cons:**
- ❌ Duplicates AtlasCoordinator logic
- ❌ Breaks separation of initialization vs runtime switching
- ❌ Harder to maintain
- ❌ Doesn't match composite-custom's intended use case

**Option C: Create Unified Application Path**
Merge atlas initialization and view preset application into single path.

**Cons:**
- ❌ Massive refactoring
- ❌ Conflates different concerns
- ❌ Breaks clear mental model
- ❌ High risk, low benefit

**Recommendation: Option A** - Filter at API level (simplest, clearest, safest).

---

## 9. Architectural Patterns & Best Practices

### 9.1 Patterns Used Successfully

| Pattern | Location | Purpose |
|---------|----------|---------|
| **Discriminated Union** | Core types | Type-safe preset handling |
| **Strategy Pattern** | Validators, Application | Type-specific behavior |
| **Adapter Pattern** | Converters | Format transformation |
| **Service Layer** | Preset services | Business logic isolation |
| **Parameter Provider** | Projection params | Abstracted parameter source |
| **Registry Pattern** | Presets, Projections, Parameters | Centralized configuration |
| **Result Pattern** | LoadResult<T> | Consistent error handling |

### 9.2 Design Strengths

**1. Type Safety**
- Discriminated unions prevent runtime type errors
- Generic LoadResult<T> pattern maintains type flow
- Compile-time guarantees for preset type handling

**2. Separation of Concerns**
- Core layer (pure logic) independent of services
- Services coordinate stores (business logic)
- Stores manage state (reactivity)
- Components handle UI (presentation)

**3. Extensibility**
- Adding new preset type requires:
  1. Add to PresetType union
  2. Create Config type
  3. Add to Preset discriminated union
  4. Add validator case
  5. Add application handler
- No changes to loader, registry, or UI

**4. Parameter Registry Integration**
- Single source of truth for parameter constraints
- Validation at multiple levels (runtime, preset load, export)
- Exportable parameter tracking
- Family-specific constraint checking

### 9.3 Design Weaknesses

**1. Converter Asymmetry**
- Converters only exist for composite-custom
- View presets apply parameters directly
- Creates two different mental models for "how presets work"

**2. Application Path Duplication**
- Atlas initialization uses converters + coordinator
- View presets use direct application service
- Both update same stores, but different paths

**3. Unclear Boundaries**
- Composite-custom loadable through view preset API
- Error thrown at application layer, not load layer
- UI enforces filter, but API doesn't

---

## 10. Recommendations

### 10.1 Immediate Actions (High Priority)

**1. Fix Loading Path Confusion** ⚠️ **Critical**
```typescript
// src/stores/config.ts - loadAvailableViewPresets()
async function loadAvailableViewPresets() {
  // Only load presets for view modes that support them
  if (!['unified', 'split', 'built-in-composite'].includes(viewMode.value)) {
    availableViewPresets.value = []
    return
  }

  const presets = await PresetLoader.listPresets({
    atlasId: selectedAtlas.value,
    viewMode: viewMode.value as any,
  })

  // CRITICAL: Filter out composite-custom (atlas initialization path only)
  availableViewPresets.value = presets.filter(p => p.type !== 'composite-custom')
}
```

**2. Update PresetApplicationService Comment**
```typescript
/**
 * Apply composite-custom preset
 *
 * Note: This handler is defensive code only. Composite-custom presets
 * are loaded through AtlasCoordinator during atlas initialization, not
 * through the view preset API. This method exists to complete the
 * strategy pattern and provide clear error messaging if misused.
 *
 * Correct path: AtlasCoordinator.handleAtlasChange()
 * → PresetLoader.loadPreset()
 * → convertToDefaults() + extractTerritoryParameters()
 * → Apply to stores
 */
private static applyCompositeCustom(_config: CompositeCustomConfig): ApplicationResult {
  return {
    success: false,
    errors: ['Composite-custom presets should be loaded through atlas initialization, not view preset API'],
    warnings: [],
  }
}
```

**3. Update Documentation**
Add to `presets.llm.txt`:
```markdown
## Loading Paths

### Composite-Custom Presets
Loaded **only** through atlas initialization:
- Triggered by: App startup, atlas change
- Entry point: `AtlasCoordinator.handleAtlasChange()`
- Uses: `convertToDefaults()` + `extractTerritoryParameters()`
- NOT available through view preset API

### View Presets (Unified/Split/Built-in-Composite)
Loaded through view preset API:
- Triggered by: User preset selection
- Entry point: `configStore.loadViewPreset()`
- Uses: `PresetApplicationService.applyPreset()`
- Runtime switching supported
```

### 10.2 Medium-Term Improvements (Optional)

**1. Extract Preset Application Handlers**
Move handlers from PresetApplicationService to separate classes:
```
src/services/presets/handlers/
  ├── unified-handler.ts
  ├── split-handler.ts
  └── built-in-composite-handler.ts
```

Benefits: Better isolation, easier testing, clearer responsibilities.

**2. Add Converter Abstraction (If 5+ Types)**
Only if preset types grow significantly. Current 4 types don't justify abstraction overhead.

**3. Validation Harmonization**
Create `BaseValidator` class with common validation logic, extend for specific types.

### 10.3 Long-Term Considerations

**1. Preset Versioning Strategy**
Currently: `version: "1.0"` in composite-custom, `version: "2.0"` in registry.

Consider: Schema evolution strategy (v2.0 → v3.0), migration path, backward compatibility.

**2. Preset Templates/Generators**
Users might want to create new composite-custom presets from scratch.
Consider: Preset generation UI, template library, parameter wizards.

**3. Preset Validation UI**
Currently: Validation errors logged to console.
Consider: User-facing validation feedback, preset testing tools.

---

## 11. Conclusion

### 11.1 Key Findings

**The dual preset system is justified:**
- Composite-custom = Full cartographic configuration (export/import)
- View presets = Lightweight projection shortcuts (UI convenience)
- Different purposes, different requirements, different workflows

**Phase 2 Unification was successful:**
- Eliminated duplicate loaders ✅
- Unified registry structure ✅
- Centralized validation logic ✅
- Maintained type safety ✅

**One critical issue remains:**
- Composite-custom presets accessible through wrong loading path
- Fix: Filter at API level (simple, safe, effective)

### 11.2 Duplication Assessment

**Actual Duplication:** Minimal to None
- Shared: Registry, loader, parameter validation
- Specialized: Converters (composite-only), application handlers (type-specific)
- Justified: Different complexity requirements, different use cases

**Perceived Duplication:** Actually Good Design
- Two loading paths = Two lifecycle events (initialization vs runtime)
- Two validators = Two complexity levels (deep vs shallow)
- Two application patterns = Two data formats (rich vs simple)

### 11.3 Export/Import Preservation

**Export capability fully preserved:**
- Composite-custom presets remain round-trip capable
- Export system independent of preset system
- Import reuses validation but has separate application path
- No risk to external interoperability

**Key requirement maintained:**
Generated code works in external applications (D3.js, Observable Plot) without Atlas Composer dependencies.

### 11.4 Final Recommendation

**Implement immediate actions only:**
1. Filter composite-custom from view preset API (5 lines of code)
2. Update defensive error comment (clarify intent)
3. Document loading paths clearly (prevent future confusion)

**Skip optional improvements:**
Current architecture is clean, functional, and maintainable. The "duplication" is actually specialization. Don't over-engineer.

**Monitor for future:**
If preset types grow to 8-10+, revisit abstraction patterns. Until then, KISS principle applies.

---

**Analysis Completed:** October 20, 2025
**Recommendation:** Fix loading path filtering, document clearly, otherwise **preserve current architecture**.
