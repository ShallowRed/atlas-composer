# Architecture Decision Records

## ADR-001: Keep Pinia Stores vs Pure Domain Stores

**Context**: Clean Architecture suggests infrastructure-agnostic state management.

**Decision**: Keep Pinia stores.

**Rationale**:
1. Vue reactivity is core to the application's real-time updates
2. Pinia provides excellent DevTools integration
3. Replacing Pinia would require rewriting all reactivity
4. ROI is negative for a small team

---

## ADR-002: Store Boundaries = Bounded Contexts

**Context**: How to split the god-object configStore.

**Decision**: Split by bounded context (Atlas, Projection, View).

**Rationale**:
1. Each store owns one domain concept
2. Reduces coupling between unrelated features
3. Enables independent testing
4. Follows DDD aggregate boundaries

**Result**: configStore (598 lines) split into:
- atlasStore (257 lines) - Atlas selection, config, territories
- projectionStore (341 lines) - Projection selection, composite, canvas
- viewStore (414 lines) - View mode, territory mode, visibility rules

---

## ADR-003: Static vs Instance Services

**Context**: Should services be static or instance-based?

**Decision**: Keep existing hybrid pattern.

**Rationale**:
1. Stateless operations (validation, loading) use static methods
2. Stateful operations (Cartographer, CompositeProjection) use instances
3. Pattern is working and understood
4. No benefit to enforcing one pattern

**Examples**:
- Static: InitializationService, PresetLoader, PresetApplicationService
- Instance: AtlasService, Cartographer, CompositeProjection
- Singleton: ProjectionRegistry

---

## ADR-004: Centralized Projection Defaults

**Context**: Atlas-specific projection defaults were duplicated across multiple files (registry.ts, atlas-metadata-service.ts).

**Decision**: Centralize defaults in `src/core/projections/defaults.ts`.

**Rationale**:
1. Single source of truth for atlas projection defaults
2. Eliminates duplicate switch statements
3. Easier to maintain and extend

**Result**: Created defaults.ts exporting:
- `ATLAS_PROJECTION_DEFAULTS` - Default parameters per atlas
- `getDefaultProjectionPreferences()` - Recommended projections per atlas
- `getDefaultCompositeProjections()` - Default composite projections per atlas

---

## ADR-005: Result Type vs LoadResult Pattern

**Context**: GeoDataService uses throws for error handling. Clean Architecture prefers explicit error returns. The codebase has existing LoadResult pattern for preset operations.

**Decision**: Use Result<T, E> for data loading, keep LoadResult for preset operations.

**Rationale**:
1. Result type provides explicit success/failure handling without exceptions
2. Domain error types enable type-safe error discrimination
3. LoadResult already handles preset warnings array - converting would lose this
4. Gradual migration allows both patterns to coexist via conversion utilities

**Result**: Dual pattern with interop:
- `Result<T, E>` - Data domain (GeoDataService), new error-prone code
- `LoadResult` - Preset domain (PresetLoader, ViewPresetLoader)
- `toLoadResult()` / `fromLoadResult()` - Conversion utilities in result.ts

**Files**:
- `src/core/types/result.ts` - Result type, helpers, conversion utilities
- `src/core/types/errors.ts` - Domain error types (GeoDataError, PresetError, etc.)
- `src/utils/error-formatting.ts` - User-facing error messages, i18n integration

---

## ADR-006: Branded Types for Domain Identifiers

**Context**: All domain identifiers (atlas IDs, projection IDs, preset IDs, territory codes) are plain strings, allowing accidental swaps at call sites.

**Decision**: Use TypeScript branded/nominal types for domain identifiers.

**Rationale**:
1. Compile-time prevention of identifier mix-ups
2. Self-documenting function signatures
3. Zero runtime overhead (brands are erased by TypeScript)
4. Gradual adoption - can coexist with plain strings during migration

**Result**: Full adoption across codebase:
- `AtlasId` - Stores, services, registry, components
- `ProjectionId` - Stores, services, CompositeProjection, parameter manager
- `PresetId` - Stores, services, PresetLoader, registry
- `TerritoryCode` - Stores, services, all territory methods, TerritoryDefaults

**Files**:
- `src/types/branded.ts` - Type definitions and constructor functions
- Stores: atlas.ts, projection.ts, view.ts, parameters.ts
- Services: All services with territory/projection methods
- Core: registry.ts, converter.ts, TerritoryDefaults interface
