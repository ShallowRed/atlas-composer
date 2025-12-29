# Architectural Improvements & Inspirations

## Overview

This document captures architectural improvement opportunities and potential inspirations identified during codebase analysis. Items range from immediate enhancements to longer-term evolution possibilities.

## Improvement Areas

### 1. Test Isolation

**Current State**: 12 tests in `initialization-service.test.ts` are skipped, suggesting integration complexity or flaky test behavior.

**Recommendation**: 
- Extract complex initialization flows into smaller, testable units
- Use dependency injection for store mocking
- Consider test doubles for async operations (atlas loading, preset fetching)
- Separate unit tests from integration tests with clear boundaries

**Files Affected**: `src/services/initialization/__tests__/`

### 2. Domain Events

**Current State**: The application relies on Vue's reactivity system for state change propagation. Watchers in `useMapWatchers` handle rendering updates reactively.

**Recommendation**:
- Introduce explicit domain events for cross-cutting concerns
- Event types: `AtlasChanged`, `ProjectionUpdated`, `PresetApplied`, `TerritoryTransformed`
- Benefits: Better audit trails, debugging, and undo/redo capability
- Implementation: Event bus or lightweight pub/sub within stores

**Example Structure**:
```typescript
interface DomainEvent {
  type: string
  timestamp: number
  payload: unknown
  source: string
}

type AtlasChangedEvent = {
  type: 'ATLAS_CHANGED'
  payload: { previousAtlasId: AtlasId, newAtlasId: AtlasId }
}
```

### 3. Error Boundary UI

**Current State**: Error handling is comprehensive in services via `Result<T, E>` pattern. UI feedback for errors could be more consistent.

**Recommendation**:
- Create centralized error display components
- Implement Vue error boundaries for component-level failures
- Add recovery actions where applicable (retry, fallback, reset)
- Consider toast notification queue for multiple errors
- Map domain errors to user-friendly messages with i18n

**Files to Enhance**: 
- `src/components/ui/primitives/Alert.vue`
- `src/utils/error-formatting.ts`
- `src/composables/useErrorHandler.ts` (new)

### 4. Dependency Injection

**Current State**: Services use direct imports and manual instantiation. Composables create service instances inline.

**Recommendation**:
- Current approach is acceptable for application scale
- For larger growth, consider lightweight DI:
  - Vue's provide/inject for service instances
  - Factory functions with configurable dependencies
  - Improves testability and allows service substitution

**Pattern Example**:
```typescript
// Provider
const cartographerKey = Symbol('cartographer')
provide(cartographerKey, new Cartographer(config))

// Consumer
const cartographer = inject(cartographerKey)
```

### 5. Loading State Granularity

**Current State**: `useLoadingState` provides skeleton loading. Multiple loading states exist across stores.

**Recommendation**:
- Consolidate loading states in UI store
- Add granular loading indicators (atlas loading, preset loading, rendering)
- Implement loading state machine: `idle` → `loading` → `success` | `error`
- Consider suspense boundaries for async components

## Inspiration Opportunities

### 1. Command Pattern for Undo/Redo

**Value Proposition**: Enable users to undo/redo territory positioning, projection changes, and parameter adjustments.

**Architecture**:
```typescript
interface Command {
  execute(): void
  undo(): void
  description: string
}

class CommandHistory {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  
  execute(command: Command): void
  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
}
```

**Commands to Implement**:
- `SetTerritoryProjectionCommand`
- `UpdateTerritoryPositionCommand`
- `ChangeViewModeCommand`
- `ApplyPresetCommand`
- `UpdateGlobalParametersCommand`

**Integration Points**:
- `useParameterStore` actions
- `useTerritoryTransforms` composable
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

### 2. State Machine for Application Flow

**Value Proposition**: Replace manual state transitions with declarative state machines for complex flows.

**Candidate Flows**:
- Atlas initialization (loading → validating → applying → ready)
- Preset application (loading → validating → applying → rendering)
- Export workflow (configuring → generating → copying → complete)

**Implementation Options**:
- XState library for full state machine support
- Custom finite state machine using discriminated unions
- Vue composable wrapping state transitions

**Example Structure**:
```typescript
type AppState =
  | { status: 'idle' }
  | { status: 'loading-atlas', atlasId: AtlasId }
  | { status: 'loading-preset', presetId: PresetId }
  | { status: 'rendering' }
  | { status: 'ready' }
  | { status: 'error', error: AppError }
```

### 3. Web Worker Rendering

**Value Proposition**: Maintain UI responsiveness during complex projection calculations.

**Candidate Operations**:
- D3 path generation for large datasets
- Bounds calculation for territories
- Stream multiplexing for composite projections
- GeoJSON simplification

**Architecture**:
```typescript
// Main thread
const worker = new Worker('./projection-worker.ts')
worker.postMessage({ type: 'GENERATE_PATHS', features, projection })
worker.onmessage = (e) => updatePaths(e.data.paths)

// Worker thread
self.onmessage = (e) => {
  if (e.data.type === 'GENERATE_PATHS') {
    const paths = generatePaths(e.data.features, e.data.projection)
    self.postMessage({ paths })
  }
}
```

**Considerations**:
- D3 projections are not transferable; serialize configuration
- Consider OffscreenCanvas for SVG-to-Canvas rendering
- Measure performance to validate necessity

### 4. Plugin Architecture for Projections

**Value Proposition**: Enable third-party projection definitions without core changes.

**Architecture**:
```typescript
interface ProjectionPlugin {
  id: string
  definition: ProjectionDefinition
  factory: () => GeoProjection
  metadata?: ProjectionMetadata
}

class ProjectionRegistry {
  registerPlugin(plugin: ProjectionPlugin): void
  loadPluginFromURL(url: string): Promise<void>
}
```

**Benefits**:
- Community-contributed projections
- Atlas-specific projection bundles
- Lazy loading of specialized projections

### 5. Collaborative Editing

**Value Proposition**: Real-time collaboration on composite projection configurations.

**Architecture Components**:
- WebSocket connection for state synchronization
- Operational Transformation (OT) or CRDT for conflict resolution
- Presence indicators for active collaborators
- Cursor position sharing on map canvas

**Implementation Complexity**: High - requires backend infrastructure

### 6. Micro-Frontend Extraction

**Value Proposition**: Embed projection selector or map renderer in external applications.

**Candidate Components**:
- `ProjectionDropdown` as standalone widget
- `MapRenderer` as embeddable visualization
- Export dialog as configuration tool

**Architecture**:
- Web Components wrapper for Vue components
- Shadow DOM for style isolation
- Event-based communication with host application
- Module federation for shared dependencies

### 7. GraphQL/tRPC Data Layer

**Value Proposition**: Type-safe API layer if backend is introduced.

**Mapping to Current Structure**:
```
services/atlas/        → Atlas queries/mutations
services/presets/      → Preset queries/mutations  
services/projection/   → Projection queries
core/atlases/registry  → Atlas resolver
```

**Benefits**:
- End-to-end type safety with tRPC
- Automatic TypeScript client generation
- Caching and optimistic updates

## Priority Matrix

| Improvement | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| Test isolation | Medium | Low | High |
| Error boundary UI | Medium | Medium | High |
| Command pattern (undo) | High | Medium | Medium |
| Domain events | Medium | Medium | Medium |
| Loading state granularity | Low | Low | Medium |
| State machine flows | Medium | Medium | Low |
| Dependency injection | Low | Medium | Low |
| Web worker rendering | Medium | High | Low |
| Plugin architecture | Medium | High | Future |
| Collaborative editing | High | Very High | Future |

## Implementation Notes

### Adding New Improvements

When implementing improvements from this list:
1. Create implementation plan in `.plan.md` file for multi-file changes
2. Update affected domain documentation in `docs/`
3. Add tests for new functionality
4. Update this document to reflect completed items (move to separate section)

### Evaluation Criteria

Consider these factors when prioritizing:
- User value: Direct impact on user experience
- Developer experience: Improved maintainability or testing
- Technical debt: Addressing accumulated complexity
- Future enablement: Foundation for future features
