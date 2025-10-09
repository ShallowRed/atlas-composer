# Type Management & Sharing: Investigation & Improvement Plan

**Date:** 9 October 2025
**Status:** Architecture Review & Recommendations

---

## Current Architecture Analysis

### 🔴 Problems Identified

#### 1. **Circular Dependency Issue**
```
types/index.ts
  ↓ imports from
src/types/territory.d.ts
  ↑ but scripts/ also needs types/

scripts/tsconfig.json
  ↓ includes
"../src/types/**/*.d.ts"  ❌ Backend including frontend files!
```

**Problem:** Backend scripts are reaching into frontend source directory, creating tight coupling.

#### 2. **Mixed Module Systems**
- **Frontend:** `moduleResolution: "bundler"` (Vite/ESNext)
- **Backend:** `moduleResolution: "NodeNext"` (Node.js runtime)
- **Conflict:** Different resolution strategies cause import path inconsistencies

#### 3. **Ownership Ambiguity**
```
types/
├── config.d.ts          ← Backend-focused types
└── index.ts             ← Re-exports from src/types/territory.d.ts

src/types/
└── territory.d.ts       ← Frontend-focused types
```

**Question:** Who owns what? Where should shared types live?

#### 4. **Build Order Dependencies**
```
scripts/ needs types/ needs src/types/
```
This creates a build order problem - scripts can't be built independently.

---

## Architectural Principles (Best Practices)

### ✅ What We Should Follow

1. **Separation of Concerns**
   - Frontend should not import from backend
   - Backend should not import from frontend
   - Shared code should be in neutral territory

2. **Dependency Direction**
   ```
   Frontend  ←──┐
                ├── Shared Types (types/)
   Backend   ←──┘
   ```
   Both depend on shared, but not on each other.

3. **Single Source of Truth**
   - Each type should be defined in exactly one place
   - No duplication, no re-exports from other domains

4. **Independent Buildability**
   - Backend scripts should build without frontend presence
   - Frontend should build without backend scripts
   - Shared types should be standalone

---

## Recommended Architecture

### 🎯 Option 1: Pure Shared Types (RECOMMENDED)

**Structure:**
```
types/                           ← Standalone, domain-agnostic
├── atlas-config.d.ts           ← JSON config structure (raw data)
├── backend-config.d.ts         ← Backend extraction format
├── geojson.d.ts                ← GeoJSON/TopoJSON interfaces
└── index.ts                    ← Clean barrel export (no re-exports from src/)

src/types/                       ← Frontend-only types
└── territory.d.ts              ← Runtime territory types (derived from JSON)
                                   (TerritoryConfig, AtlasConfig, etc.)

scripts/                         ← Backend-only
└── (imports only from types/)
```

**Benefits:**
- ✅ Clean separation: no cross-domain imports
- ✅ Each directory is independently compilable
- ✅ Clear ownership: types/ is neutral, src/types/ is frontend, scripts/ is backend
- ✅ Backend doesn't need Vue/Vite/bundler knowledge

**Migration:**
1. Move `JSONTerritoryConfig`, `JSONAtlasConfig` to `types/atlas-config.d.ts`
2. Move `BackendConfig`, `BackendTerritory` to `types/backend-config.d.ts`
3. Keep `TerritoryConfig`, `AtlasConfig` in `src/types/territory.d.ts` (frontend runtime types)
4. Remove `src/types/` from `scripts/tsconfig.json` include
5. Remove re-exports from `types/index.ts` that reference `src/`

---

### 🎯 Option 2: Monorepo Packages (OVERKILL for current scale)

**Structure:**
```
packages/
├── types/                      ← Published as @atlas/types
│   ├── package.json
│   └── src/
├── backend/                    ← Published as @atlas/backend
│   ├── package.json
│   └── scripts/
└── frontend/                   ← Published as @atlas/frontend
    ├── package.json
    └── src/
```

**Benefits:**
- ✅ Perfect separation with explicit dependencies
- ✅ Version management per package
- ✅ Reusable across multiple projects

**Drawbacks:**
- ❌ Overkill for a single application
- ❌ Adds complexity (publishing, versioning, workspace management)
- ❌ Slower iteration (need to rebuild packages)

**Verdict:** Not recommended unless planning to extract types as standalone library.

---

### 🎯 Option 3: Duplicate Types (ANTI-PATTERN)

Keep separate type definitions in `scripts/` and `src/types/`.

**Drawbacks:**
- ❌ Manual synchronization required
- ❌ Risk of drift between backend and frontend
- ❌ Violates DRY principle

**Verdict:** ❌ Do not pursue.

---

## Detailed Recommendation: Option 1 Implementation

### Phase 1: Restructure Shared Types (30 min)

**1.1 Create Clean Type Files**

`types/atlas-config.d.ts`:
```typescript
/**
 * JSON Configuration Types
 * Represents the structure of configs/*.json files
 * Used by both backend (scripts/) and frontend (src/)
 */

export interface JSONTerritoryConfig {
  id: string
  role: 'mainland' | 'overseas' | 'member-state'
  code: string
  name: string
  shortName?: string
  iso: string
  region?: string
  center: [number, number]
  bounds: [[number, number], [number, number]]
  extraction?: {
    mainlandPolygon?: number
    extractFrom?: string
    polygonIndices?: number[]
    polygonBounds?: [number, number, number, number]
    duplicateFrom?: string
  }
  rendering?: {
    projectionType?: string
    offset?: [number, number]
    scale?: number
    clipExtent?: { x1: number, y1: number, x2: number, y2: number }
    rotate?: [number, number, number?]
    parallels?: [number, number]
    baseScaleMultiplier?: number
  }
}

export interface JSONAtlasConfig {
  id: string
  name: string
  description: string
  territories: JSONTerritoryConfig[]
  projectionPreferences?: {
    defaultProjection?: string
    compositeModes?: string[]
  }
  viewModes?: {
    supported: Array<'split' | 'composite-existing' | 'composite-custom' | 'unified'>
    default: 'split' | 'composite-existing' | 'composite-custom' | 'unified'
  }
  splitModeConfig?: {
    mainlandTitle?: string
    mainlandCode?: string
    territoriesTitle: string
  }
  territoryModeOptions?: Array<{ value: string, label: string }>
  defaultTerritoryMode?: string
  projection?: any
  modes?: any[]
  groups?: any[]
}
```

`types/backend-config.d.ts`:
```typescript
/**
 * Backend Configuration Types
 * Used by scripts/prepare-geodata.ts for data extraction
 */

export interface BackendTerritory {
  name: string
  code: string
  iso: string
  mainlandPolygon?: number
  extractFrom?: number
  polygonIndices?: number[]
  bounds?: [number, number, number, number]
  duplicateFrom?: string
}

export interface BackendConfig {
  name: string
  description: string
  territories: Record<string, BackendTerritory>
  outputName: string
}
```

`types/geojson.d.ts` (NEW):
```typescript
/**
 * GeoJSON Type Definitions
 * Common types used across scripts and frontend
 */

export interface GeoJSONProperties {
  [key: string]: any
}

export interface GeoJSONGeometry {
  type: string
  coordinates: any
}

export interface GeoJSONFeature {
  type: 'Feature'
  id?: string | number
  properties: GeoJSONProperties
  geometry: GeoJSONGeometry
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}
```

`types/index.ts`:
```typescript
/**
 * Shared Types for Atlas Composer
 * Domain-agnostic types used by both backend and frontend
 */

// JSON Configuration (raw data from configs/*.json)
export type {
  JSONAtlasConfig,
  JSONTerritoryConfig,
} from './atlas-config'

// Backend Processing Types
export type {
  BackendConfig,
  BackendTerritory,
} from './backend-config'

// GeoJSON Types
export type {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  GeoJSONGeometry,
  GeoJSONProperties,
} from './geojson'
```

**1.2 Update TypeScript Configs**

`scripts/tsconfig.json`:
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "rootDir": "..",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node"],
    "declaration": true,
    "declarationMap": true,
    "noEmit": false,
    "outDir": "../dist/scripts",
    "sourceMap": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": [
    "**/*.ts",
    "../types/**/*.ts" // ✅ Only shared types, NOT src/
  ],
  "exclude": ["node_modules", "dist"]
}
```

`tsconfig.json` (frontend):
```jsonc
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "target": "ES2022",
    "jsx": "preserve",
    "jsxImportSource": "vue",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleDetection": "force",
    "useDefineForClassFields": true,
    "baseUrl": ".",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["src/*"],
      "#configs/*": ["configs/*"],
      "#types/*": ["types/*"] // ✅ Use Node.js subpath imports
    },
    "types": ["vite/client", "node"],
    "allowImportingTsExtensions": true,
    "strict": true
    // ... rest of config
  },
  "include": [
    "src/**/*",
    "src/**/*.vue",
    "types/**/*.ts" // ✅ Include shared types
  ]
}
```

### Phase 2: Update Imports (20 min)

**2.1 Backend Scripts**
```typescript
// scripts/utils/config-adapter.ts
import type { BackendConfig, JSONAtlasConfig } from '#types'

// scripts/prepare-geodata.ts
import type { BackendConfig, JSONTerritoryConfig } from '#types'
```

**2.2 Frontend**
```typescript
// src/core/atlases/loader.ts
import type { JSONAtlasConfig, JSONTerritoryConfig } from '#types'
import type { AtlasConfig, TerritoryConfig } from '@/types/territory'
```

### Phase 3: Remove Dependencies (10 min)

**3.1 Clean Up**
- Remove `../src/types/**/*.d.ts` from `scripts/tsconfig.json`
- Remove any frontend re-exports from `types/index.ts`
- Verify no `import ... from '@/...'` in scripts/

**3.2 Verify Independence**
```bash
# Should work without src/ being present
cd scripts/
pnpm exec tsc --noEmit

# Should work without scripts/ being present
cd src/
pnpm exec vue-tsc --noEmit
```

---

## Benefits of Recommended Architecture

### ✅ Clean Separation
```
scripts/  ──→  types/  ←──  src/
   (backend)   (shared)    (frontend)
```
No cross-contamination.

### ✅ Independent Build
- Scripts can be built/tested in isolation
- Frontend can be built/tested in isolation
- Types are the only contract

### ✅ Clear Ownership
- `types/` = Data contracts (JSON structure)
- `src/types/` = Frontend runtime types (derived from JSON)
- `scripts/` = Backend processing logic

### ✅ Scalability
- Easy to extract backend scripts to separate repo
- Easy to add new consumers (CLI tools, tests, etc.)
- Clear boundaries for future refactoring

---

## Migration Checklist

### Phase 1: Restructure (30 min)
- [ ] Create `types/atlas-config.d.ts`
- [ ] Create `types/backend-config.d.ts`
- [ ] Create `types/geojson.d.ts`
- [ ] Update `types/index.ts` (remove src/ re-exports)
- [ ] Update `scripts/tsconfig.json` (remove src/ include)
- [ ] Update `tsconfig.json` (include types/)

### Phase 2: Update Imports (20 min)
- [ ] Update all `scripts/**/*.ts` files
- [ ] Update `src/core/atlases/loader.ts`
- [ ] Update `src/core/atlases/registry.ts`
- [ ] Search for any remaining `../../../types` patterns

### Phase 3: Verify (10 min)
- [ ] `pnpm exec tsc --noEmit -p scripts/tsconfig.json` ✅
- [ ] `pnpm typecheck` (frontend) ✅
- [ ] `pnpm test:run` ✅
- [ ] `pnpm geodata:validate --all` ✅

### Phase 4: Document (10 min)
- [ ] Update `SCRIPTS_TYPESCRIPT_MIGRATION.md`
- [ ] Add architecture diagram to README
- [ ] Document import patterns

---

## Alternative: Minimal Fix (If Time-Constrained)

If full restructure is too much right now:

1. **Remove frontend re-exports from `types/index.ts`**
   ```typescript
   // ❌ Remove these
   export type { AtlasConfig, TerritoryConfig } from '../src/types/territory.d.ts'
   ```

2. **Keep `src/types/` separate**
   ```typescript
   // In frontend files
   import type { JSONAtlasConfig } from '#types'
   import type { TerritoryConfig } from '@/types/territory'
   ```

3. **Accept dual include temporarily**
   - Keep `../src/types/**/*.d.ts` in scripts/tsconfig.json
   - Add TODO comment to refactor later

**Benefit:** Unblocks current work
**Drawback:** Doesn't solve architectural issue

---

## Recommendation Priority

### 🥇 RECOMMENDED: Full Restructure (Option 1)
- **Time:** ~1.5 hours
- **Benefit:** Clean architecture, long-term maintainability
- **Risk:** Low (types are stable, well-tested)

### 🥈 ACCEPTABLE: Minimal Fix
- **Time:** ~30 minutes
- **Benefit:** Unblocks current work
- **Risk:** Technical debt accumulation

### 🥉 NOT RECOMMENDED: Keep Current Structure
- Creates tight coupling
- Makes future refactoring harder
- Violates separation of concerns

---

## Questions for Decision

1. **Timeline:** Do you have 1.5 hours for proper restructure, or need to ship quickly?

2. **Future Plans:** Will backend scripts ever need to run independently (CI/CD, separate repo)?

3. **Type Stability:** Are the JSON config structures stable, or still evolving?

4. **Team Size:** Solo developer (flexibility) or team (need strict boundaries)?

---

## Conclusion

**Current architecture has a fundamental flaw:** backend depends on frontend source.

**Recommended solution:** Move all truly shared types to standalone `types/` directory, remove frontend re-exports, make each domain independently buildable.

**Next Step:** Review this plan, decide on timeline (full restructure vs minimal fix), then proceed with implementation.
