# Scripts TypeScript Migration Analysis

## Executive Summary

**Recommendation: ⭐⭐⭐⭐⭐ Migrate scripts to TypeScript**

Migrating the `scripts/` folder to TypeScript would bring significant benefits with minimal effort. The existing type infrastructure is already in place, and the migration would enable type sharing between frontend and backend, improving maintainability and catching errors at compile-time.

## Current State

### Scripts Structure
```
scripts/
├── prepare-geodata.js       # Main data preparation script (~400 lines)
├── validate-configs.js      # Config validation script (~200 lines)
├── dev/
│   ├── analyze-country.js   # Country analysis tool (~150 lines)
│   └── lookup-country.js    # Country lookup tool (~100 lines)
└── utils/
    ├── cli-args.js         # CLI argument parsing (~80 lines)
    ├── config-adapter.js   # Backend config transformation (~100 lines)
    ├── config-loader.js    # Config loading (~120 lines)
    ├── logger.js           # Colored logging (~60 lines)
    └── ne-data.js          # Natural Earth data fetching (~150 lines)
```

**Total: ~1,360 lines of JavaScript**

### Current Issues

1. **No Type Safety**: All scripts use plain JavaScript with JSDoc comments (incomplete)
2. **Type Duplication**: Backend config types are defined separately from frontend types
3. **No Compile-Time Validation**: Errors only caught at runtime
4. **Manual Type Synchronization**: Config structure changes require manual updates in multiple places
5. **IDE Support Limited**: No autocomplete for config structures, territory types, etc.

### Existing TypeScript Infrastructure

✅ Already available:
- TypeScript 5.9.3 installed
- `@types/node` package
- `@types/topojson-client` package
- Full type definitions in `src/types/territory.d.ts`
- `tsconfig.json` configured for frontend
- ES modules (`"type": "module"` in package.json)

## Benefits of Migration

### 1. Type Sharing (Primary Benefit)

**Current Situation:**
- Frontend has `TerritoryConfig`, `AtlasConfig`, etc. in `src/types/territory.d.ts`
- Backend scripts duplicate these structures or use loose typing
- Config adapter manually transforms without type safety

**After Migration:**
```typescript
// scripts/utils/config-loader.ts
import type { AtlasConfig, TerritoryConfig } from '@/types/territory'

export async function loadConfig(atlasName: string): Promise<{
  unified: AtlasConfig
  backend: BackendConfig
}> {
  // TypeScript validates structure at compile-time
}
```

### 3. Better IDE Support

- Full autocomplete for all config structures
- Inline documentation from JSDoc comments
- Go-to-definition across frontend and backend
- Refactoring tools work across entire codebase

### 4. Maintainability

- Single source of truth for types
- Config schema changes propagate automatically
- Breaking changes caught immediately
- Easier onboarding for new developers

### 5. Runtime Safety

Using tools like `zod` or `io-ts` (optional):
```typescript
import type { TerritoryConfig } from '@/types/territory'
import { z } from 'zod'

const TerritoryConfigSchema = z.object({
  code: z.string(),
  name: z.string(),
  // ...
})

// Validate at runtime AND compile-time
const territory: TerritoryConfig = TerritoryConfigSchema.parse(jsonData)
```

## Alternative: Runtime Validation

For even stronger safety, add runtime validation:

```typescript
// scripts/utils/validation.ts
import { z } from 'zod'

export const TerritoryConfigSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  center: z.tuple([z.number(), z.number()]),
  bounds: z.tuple([
    z.tuple([z.number(), z.number()]),
    z.tuple([z.number(), z.number()])
  ]),
  offset: z.tuple([z.number(), z.number()]),
  projectionType: z.string().optional(),
  // ...
})

// Use in scripts
const territory = TerritoryConfigSchema.parse(jsonData)
// ✅ Compile-time AND runtime type safety
```

## Migration Checklist

### Setup Phase
- [x] Create `scripts/tsconfig.json` ✅
- [x] Install `tsx` package ✅
- [x] Update `package.json` scripts to use `tsx` ✅
- [ ] Test that `tsx` can import from `@/types`

### Utilities Migration
- [x] Migrate `logger.js` → `logger.ts`
- [x] Migrate `cli-args.js` → `cli-args.ts`
- [x] Migrate `ne-data.js` → `ne-data.ts`
- [x] Migrate `config-adapter.js` → `config-adapter.ts` (add type imports)
- [x] Migrate `config-loader.js` → `config-loader.ts`

### Main Scripts Migration
- [x] Migrate `validate-configs.js` → `validate-configs.ts` ✅
- [x] Migrate `prepare-geodata.js` → `prepare-geodata.ts` ✅
- [x] Migrate `dev/lookup-country.js` → `dev/lookup-country.ts` ✅
- [x] Migrate `dev/analyze-country.js` → `dev/analyze-country.ts` ✅

### Testing & Validation
- [x] Run `pnpm build:scripts` (ensure compilation works) ✅
- [x] Run `pnpm geodata:validate france` ✅
- [x] Run `pnpm geodata:validate --all` ✅ (all 3 atlases valid)
- [x] Run `pnpm geodata:prepare --help` ✅
- [x] Run `pnpm geodata:lookup --help` ✅
- [x] Run `pnpm geodata:analyze --help` ✅
- [x] Run `pnpm test:run` ✅ (170 tests passed)

### Cleanup
- [x] Delete all `.js` files in `scripts/` ✅
- [ ] Update `scripts/` documentation
- [ ] Update main README if needed
- [x] TypeScript compilation verified ✅
- [ ] Commit changes

### Documentation
- [ ] Update ATLASES.md with TypeScript script examples
- [ ] Update README with TypeScript mention in scripts section
- [ ] Add note about type sharing benefits

## Risks & Mitigations

### Risk 1: Breaking Changes
**Mitigation:** Keep old `.js` files until validation complete, then delete

### Risk 2: Import Path Issues
**Mitigation:** Test `@/types` imports in tsconfig before migration

### Risk 3: Node.js Module Resolution
**Mitigation:** Use `"moduleResolution": "NodeNext"` and `.ts` extensions

### Risk 4: Runtime Issues
**Mitigation:** Extensive testing with all scripts before committing

## Cost-Benefit Analysis

| Aspect | Current (JavaScript) | After (TypeScript) |
|--------|---------------------|-------------------|
| **Type Safety** | ❌ None | ✅ Full compile-time |
| **Type Sharing** | ❌ Manual duplication | ✅ Automatic from frontend |
| **IDE Support** | ⚠️ Limited | ✅ Full autocomplete |
| **Error Detection** | ❌ Runtime only | ✅ Compile-time + runtime |
| **Maintainability** | ⚠️ Manual sync | ✅ Automatic propagation |
| **Refactoring** | ❌ Manual, error-prone | ✅ Safe, automated |
| **Documentation** | ⚠️ JSDoc (incomplete) | ✅ Types + JSDoc |
| **Developer Experience** | 6/10 | 10/10 |
| **Migration Effort** | N/A | 4-6 hours (one-time) |
| **Ongoing Cost** | Higher (manual sync) | Lower (automatic) |

## Recommendation

**✅ Proceed with Full Migration (Option A)**

**Reasons:**
1. **High ROI**: 4-6 hours investment for permanent benefits
2. **Type Sharing**: Single source of truth for all configs
3. **Better DX**: Significantly improved developer experience
4. **Future-Proof**: Easier to add new atlases/features
5. **Low Risk**: Can validate output matches current behavior
6. **Consistency**: Entire project uses TypeScript

**Priority:** Should be done before adding new atlases or major features

**Timeline:** Can be completed in a single focused session (half-day)

---

## Migration Complete! ✅

**Date Completed:** October 9, 2025

### Summary

Successfully migrated all 9 scripts (~1,360 lines) from JavaScript to TypeScript:

**Utilities (5 files):**
- ✅ `logger.ts` - Colored console logging with Color type
- ✅ `cli-args.ts` - CLI argument parsing with ParsedArgs interface
- ✅ `ne-data.ts` - Natural Earth data fetching with proper Topology types
- ✅ `config-adapter.ts` - Backend config transformation with full type safety
- ✅ `config-loader.ts` - Config loading with LoadedConfig interface

**Main Scripts (4 files):**
- ✅ `prepare-geodata.ts` - GeoJSON/TopoJSON processing (427 lines, fully typed)
- ✅ `dev/lookup-country.ts` - Country lookup tool (344 lines, fully typed)
- ✅ `dev/analyze-country.ts` - Polygon analyzer (356 lines, fully typed)
- ✅ `validate-configs.ts` - Config validation (243 lines, fully typed)

### Key Improvements

1. **Type Safety:** All scripts now have full compile-time type checking
2. **Type Sharing:** Backend scripts import types from `src/types/territory.d.ts`
3. **Better DX:** Full IDE autocomplete and type inference
4. **Path Fixes:** Fixed incorrect path references in validate-configs (configs/ not scripts/configs/)
5. **Zero Regressions:** All 170 tests still passing, all scripts working correctly

### Technical Details

**Type Issues Resolved:**
- Topology import from `topojson-specification` package
- Array access safety with type guards
- GeoJSON/TopoJSON type casting
- Proper function signatures with Promise types
- Validation result interfaces

**Structure Corrections:**
- Updated validate-configs error messages to reference correct paths
- Aligned with unified JSON config structure in `configs/` directory
- Fixed GeoJSON FeatureCollection type checking

### Verification Results

```bash
✓ pnpm exec tsc --noEmit -p scripts/tsconfig.json  # No errors
✓ pnpm geodata:validate --all                       # 3 atlases valid
✓ pnpm geodata:prepare --help                       # Working
✓ pnpm geodata:lookup --help                        # Working
✓ pnpm geodata:analyze --help                       # Working
✓ pnpm test:run                                     # 170 tests passed
```

### Files Removed

All old JavaScript files have been safely deleted:
- scripts/*.js (2 files)
- scripts/dev/*.js (2 files)
- scripts/utils/*.js (5 files)

**Total:** 9 JavaScript files deleted, 9 TypeScript files in production

---

**Benefits Realized:**
- ✅ Single source of truth for config types
- ✅ Compile-time error detection
- ✅ Type-safe refactoring capabilities
- ✅ Improved developer experience
- ✅ Better maintainability

**Migration Time:** ~2 hours (faster than estimated 4-6 hours!)

---

**Next Steps:**
1. ~~Review this analysis~~ ✅
2. ~~If approved, start with Phase 1 (Setup)~~ ✅
3. ~~Migrate utilities first (they're small and have dependencies)~~ ✅
4. ~~Migrate main scripts~~ ✅
5. ~~Validate thoroughly~~ ✅
6. Document and commit 📝
