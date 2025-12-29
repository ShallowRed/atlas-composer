# Testing Architecture

## Philosophy
Pragmatic clean architecture approach: test domain logic thoroughly, minimize infrastructure testing overhead.

## Test Boundaries

### Thoroughly Tested (Unit Tests)
Core domain logic with pure functions and minimal dependencies:
- **Projection System** (`core/projections/`): Registry, factory, configuration
- **Parameter System** (`core/parameters/`): Registry, validation, constraints  
- **View Logic** (`core/view/`): Mode selection, orchestration rules
- **Territory Services** (`services/territory/`): Visibility, reset, data aggregation
- **Export/Import** (`services/export/`): Validation, code generation, JSON roundtrip

### Appropriately Skipped (Integration Territory)
Infrastructure-heavy code requiring HTTP, full store chains, or DOM:
- **Initialization Service**: Requires atlas registry HTTP loading, complex store coordination
- **Vue Composables**: Thin wrappers over stores; testing stores tests the logic
- **Vue Components**: DOM rendering tested via visual inspection during development

## Rationale

### Why Skip Certain Tests

**Composable tests** were empty placeholders removed because:
1. Composables are thin reactive wrappers over Pinia stores
2. Testing them requires mocking entire store dependency chains
3. The underlying store logic is already tested in service tests
4. Visual/integration testing catches composable wiring issues

**Initialization service tests** are skipped because:
1. Service coordinates 5+ stores with complex initialization order
2. Requires HTTP mocking for atlas registry loading
3. Heavy mocking creates brittle tests that don't catch real bugs
4. Better tested via smoke/integration tests

### Why Test Export Thoroughly

Export/import is critical because:
1. User-facing feature for sharing configurations
2. Data loss in export = lost user work
3. Pure function logic - easy to test, high value
4. Roundtrip fidelity ensures no parameter degradation

## Test Categories

### Unit Tests (Fast, Isolated)
- Located in `__tests__/` directories alongside source
- Mock external dependencies minimally
- Test one unit of behavior per test
- Run in milliseconds

### Integration Tests (Broader Scope)
- Test multiple components working together
- May require store setup but not HTTP
- Verify data flow through layers

### Smoke Tests (Manual/Future)
- Full application flow verification
- Run with dev server
- Verify end-to-end scenarios

## Coverage by Domain

| Domain | Test Count | Priority | Notes |
|--------|------------|----------|-------|
| Projection core | 110+ | Critical | Factory, registry, configuration |
| Parameter registry | 31 | Critical | Validation, constraints |
| View orchestration | 73 | High | Mode selection, rules |
| Territory services | 31 | High | Visibility, reset logic |
| Export services | 64+ | Critical | Validation, codegen, roundtrip |
| Import services | 13 | Critical | JSON parsing, validation |
| Cartographer | 12 | Medium | Rendering coordination |

## Test File Organization

```
src/
├── core/
│   ├── projections/__tests__/    # Projection domain tests
│   ├── parameters/__tests__/     # Parameter domain tests
│   └── view/__tests__/           # View mode tests
├── services/
│   ├── export/__tests__/         # Export/import tests (CRITICAL)
│   ├── territory/__tests__/      # Territory service tests
│   └── view/__tests__/           # View orchestration tests
└── composables/__tests__/        # Minimal - only test complex logic
```

## Adding New Tests

### When to Add Unit Tests
- New domain logic in `core/` or `services/`
- Pure functions with business rules
- Data transformation or validation logic
- Export/import changes

### When to Skip Unit Tests
- Vue component wiring (test visually)
- Simple getters/setters
- Direct store property access
- Infrastructure coordination code

### Test Structure Template
```typescript
describe('serviceOrFunction', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange
      const input = ...
      
      // Act
      const result = service.method(input)
      
      // Assert
      expect(result).toBe(expected)
    })
  })
})
```

## Skipped Test Tracking

### Currently Skipped (Intentional)
- `initialization-service.test.ts` (12 tests) - Complex store coordination
- Registry projection skip (1 test) - Edge case deferred

### Removed (Empty Placeholders)
- `useAtlasData.spec.ts` - No actual tests
- `useProjectionConfig.spec.ts` - No actual tests  
- `useUrlState.spec.ts` - No actual tests
- `useViewState.spec.ts` - No actual tests
- `MapRenderer.spec.ts` - No actual tests

### Archived (Complex Dependencies)
- `composite-export-service.spec.ts.bak` - Required live CompositeProjection
- `roundtrip-parameters.spec.ts.bak` - Required full store integration

Replaced with focused tests that don't require full infrastructure.
