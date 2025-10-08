# Generic Adapter Architecture

## Overview

This document describes the generic adapter pattern used across the codebase to transform unified JSON configurations into backend and frontend code. This approach eliminates code duplication and provides a single source of truth.

## Architecture Layers

```
configs/portugal.json (single source of truth)
    ↓
    ├─→ Backend: scripts/configs/adapter.js → portugal.js (3 lines)
    ├─→ Frontend Territory Data: src/data/territories/adapter.ts → portugal.data.ts (16 lines)
    └─→ Frontend Region Config: src/config/regions/adapter.ts → portugal.config.ts (24 lines)
```

## 1. Unified JSON Config (`configs/*.json`)

**Single source of truth** containing all region metadata:
- Territory definitions (mainland + overseas)
- Rendering parameters (projections, scales, offsets)
- Backend extraction rules (polygon indices)
- Frontend modes and groups

**Example:** `configs/portugal.json` (120 lines)

## 2. Backend Adapter (`scripts/configs/adapter.js`)

**Purpose:** Transform unified JSON to backend geodata extraction format

**API:**
```javascript
export function createBackendConfig(unifiedConfig) {
  // Returns: { name, description, territories, outputName }
}
```

**Usage in region files (3 lines each):**
```javascript
import config from '../../configs/portugal.json' with { type: 'json' }
import { createBackendConfig } from './adapter.js'
export default createBackendConfig(config)
```

**Before/After:**
- Before: 50 lines per region file
- After: **3 lines per region file**
- Reduction: **94% code reduction**

## 3. Frontend Territory Data Adapter (`src/data/territories/adapter.ts`)

**Purpose:** Transform unified JSON to frontend territory definitions

**API:**
```typescript
export function createTerritoryExports(config: any) {
  // Returns: { mainland, overseas, all }
}
```

**Usage in region files (~16 lines each):**
```typescript
import config from '../../../configs/portugal.json'
import { createTerritoryExports } from './adapter'

const { mainland, overseas, all } = createTerritoryExports(config)

export const MAINLAND_PORTUGAL = mainland
export const PORTUGAL_OVERSEAS = overseas
export const PORTUGAL_ALL_TERRITORIES = all
```

**Before/After:**
- Before: 40+ lines per region file with transform logic
- After: **16 lines per region file** (mostly exports)
- Reduction: **60% code reduction**

## 4. Frontend Region Config Adapter (`src/config/regions/adapter.ts`)

**Purpose:** Transform unified JSON to frontend region configurations

**API:**
```typescript
export function createRegionConfigExports(config: any, territories: TerritoryExports) {
  // Returns: { projectionParams, territoryModes, territoryGroups, 
  //           defaultCompositeConfig, geoDataConfig, 
  //           compositeProjectionConfig, regionConfig, regionSpecificConfig }
}
```

**Usage in region files (~24 lines each):**
```typescript
import config from '../../../configs/portugal.json'
import { createRegionConfigExports } from './adapter'
import { MAINLAND_PORTUGAL, PORTUGAL_OVERSEAS, PORTUGAL_ALL_TERRITORIES } from '@/data/territories'

const exports = createRegionConfigExports(config, {
  mainland: MAINLAND_PORTUGAL,
  overseas: PORTUGAL_OVERSEAS,
  all: PORTUGAL_ALL_TERRITORIES,
})

export const PORTUGAL_PROJECTION_PARAMS = exports.projectionParams
export const PORTUGAL_TERRITORY_MODES = exports.territoryModes
// ... 5 more exports
```

**Before/After:**
- Before: 110+ lines per region file with transform logic
- After: **24 lines per region file** (mostly exports)
- Reduction: **78% code reduction**

## Benefits

### 1. Single Source of Truth
- All region data lives in one JSON file
- Changes propagate automatically to all layers
- No risk of backend/frontend drift

### 2. Minimal Boilerplate
- Backend config: **3 lines**
- Territory data: **16 lines**
- Region config: **24 lines**
- Total per region: **43 lines** (was 200+ lines)

### 3. No Code Generation
- Direct JSON imports using ES modules
- Runtime transformation
- No build step complexity
- Easy to debug

### 4. Type Safety
- JSON validated against schema (`configs/schema.json`)
- TypeScript adapters provide type checking
- VS Code auto-completion for JSON files

### 5. Easy Maintenance
- Generic adapters handle all transformation logic
- Add new region: just create JSON config + 3-4 files
- Update logic: change adapter once, affects all regions

## Implementation Status

### ✅ Completed
- [x] Generic backend adapter
- [x] Generic territory data adapter
- [x] Generic region config adapter
- [x] Portugal fully migrated (all 3 layers)

### 🚧 Pending
- [ ] France migration (3 files)
- [ ] EU migration (3 files)
- [ ] Spain migration (3 files)

## Adding a New Region

1. **Create unified config** (`configs/new-region.json`):
   ```json
   {
     "$schema": "./schema.json",
     "id": "new-region",
     "name": "New Region",
     "territories": [...],
     "projection": {...},
     "modes": [...],
     "groups": [...]
   }
   ```

2. **Backend config** (`scripts/configs/new-region.js`, 3 lines):
   ```javascript
   import config from '../../configs/new-region.json' with { type: 'json' }
   import { createBackendConfig } from './adapter.js'
   export default createBackendConfig(config)
   ```

3. **Territory data** (`src/data/territories/new-region.data.ts`, ~16 lines):
   ```typescript
   import config from '../../../configs/new-region.json'
   import { createTerritoryExports } from './adapter'
   const { mainland, overseas, all } = createTerritoryExports(config)
   export const MAINLAND_NEW = mainland
   export const NEW_OVERSEAS = overseas
   export const NEW_ALL = all
   ```

4. **Region config** (`src/config/regions/new-region.config.ts`, ~24 lines):
   ```typescript
   import config from '../../../configs/new-region.json'
   import { createRegionConfigExports } from './adapter'
   import { MAINLAND_NEW, NEW_OVERSEAS, NEW_ALL } from '@/data/territories'
   const exports = createRegionConfigExports(config, { mainland: MAINLAND_NEW, overseas: NEW_OVERSEAS, all: NEW_ALL })
   export const NEW_PROJECTION_PARAMS = exports.projectionParams
   // ... 6 more exports
   ```

**Total: 1 JSON file + 3 small TypeScript/JavaScript files (~43 lines total)**

## Code Reduction Summary

| Layer | Before | After | Reduction |
|-------|--------|-------|-----------|
| Backend config | 50 lines | 3 lines | 94% |
| Territory data | 40 lines | 16 lines | 60% |
| Region config | 110 lines | 24 lines | 78% |
| **Total per region** | **200 lines** | **43 lines** | **78%** |

For 4 regions (Portugal, France, EU, Spain):
- Before: **800 lines** of duplicated logic
- After: **172 lines** + **3 generic adapters** (~250 lines)
- Total reduction: **~500 lines** (62% reduction)

## Files Reference

### Adapters (Generic)
- `scripts/configs/adapter.js` - Backend transformation
- `src/data/territories/adapter.ts` - Territory data transformation
- `src/config/regions/adapter.ts` - Region config transformation

### Configs (Single Source of Truth)
- `configs/schema.json` - JSON Schema for validation
- `configs/portugal.json` - Portugal unified config
- `configs/france.json` - (pending)
- `configs/eu.json` - (pending)
- `configs/spain.json` - (pending)

### Backend (Per Region)
- `scripts/configs/portugal.js` - 3 lines
- `scripts/configs/france.js` - (pending)
- `scripts/configs/eu.js` - (pending)
- `scripts/configs/spain.js` - (pending)

### Frontend Territory Data (Per Region)
- `src/data/territories/portugal.data.ts` - 16 lines
- `src/data/territories/france.data.ts` - (pending)
- `src/data/territories/eu.data.ts` - (pending)
- `src/data/territories/spain.data.ts` - (pending)

### Frontend Region Config (Per Region)
- `src/config/regions/portugal.config.ts` - 24 lines
- `src/config/regions/france.config.ts` - (pending)
- `src/config/regions/eu.config.ts` - (pending)
- `src/config/regions/spain.config.ts` - (pending)
