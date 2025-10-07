# Migration Guide: New Architecture

## Overview

The codebase has been refactored to improve separation of concerns and make it region-agnostic. This guide helps you migrate from the old structure to the new one.

## Old vs New Architecture

### Before (Deprecated)
```
src/constants/territories/
├── france-territories.ts      ❌ Mixed: data + config + utilities
├── portugal-territories.ts    ❌ Mixed: data + config + utilities
└── eu-territories.ts          ❌ Mixed: data + config + utilities
```

### After (New Structure)
```
src/
├── data/territories/          ✅ Pure geographic data
│   ├── france.data.ts
│   ├── portugal.data.ts
│   ├── eu.data.ts
│   └── index.ts
├── config/regions/            ✅ Region-specific configuration
│   ├── types.ts
│   ├── france.config.ts
│   ├── portugal.config.ts
│   ├── eu.config.ts
│   └── index.ts
└── services/                  ✅ Business logic
    ├── TerritoryService.ts    (Generic utilities)
    ├── RegionService.ts       (Region-aware facade)
    └── CartographerFactory.ts (Factory pattern)
```

## Migration Examples

### 1. Importing Territory Data

#### ❌ Old Way
```typescript
import { ALL_TERRITORIES, OVERSEAS_TERRITORIES } from '@/constants/territories/france-territories'
```

#### ✅ New Way
```typescript
// Option 1: Direct import (if you know the region)
import { ALL_TERRITORIES, OVERSEAS_TERRITORIES } from '@/data/territories/france.data'

// Option 2: Dynamic via RegionService (recommended)
import { RegionService } from '@/services/RegionService'

const regionService = new RegionService('france')
const allTerritories = regionService.getAllTerritories()
const overseasTerritories = regionService.getOverseasTerritories()
```

### 2. Getting Territory Configuration

#### ❌ Old Way
```typescript
import { DEFAULT_GEO_DATA_CONFIG, TERRITORY_MODES } from '@/constants/territories/france-territories'
```

#### ✅ New Way
```typescript
// Option 2: Via getRegionConfig
import { getRegionConfig } from '@/config/regions'

// Option 1: Direct import
import { FRANCE_GEO_DATA_CONFIG, FRANCE_TERRITORY_MODES } from '@/config/regions/france.config'

const config = getRegionConfig('france')
const geoDataConfig = config.geoDataConfig
```

### 3. Using Territory Utilities

#### ❌ Old Way
```typescript
import { getTerritoriesForMode, getTerritoryByCode } from '@/constants/territories/france-territories'

const territories = getTerritoriesForMode('metropole-major')
```

#### ✅ New Way
```typescript
import { RegionService } from '@/services/RegionService'
import { TerritoryService } from '@/services/TerritoryService'

const regionService = new RegionService('france')
const allTerritories = regionService.getAllTerritories()
const territoryModes = regionService.getTerritoryModes()

const territories = TerritoryService.getTerritoriesForMode(
  allTerritories,
  'metropole-major',
  territoryModes
)
```

### 4. Calculating Default Values

#### ❌ Old Way
```typescript
import { DEFAULT_TERRITORY_TRANSLATIONS } from '@/constants/territories/france-territories'

Object.entries(DEFAULT_TERRITORY_TRANSLATIONS).forEach(([code, { x, y }]) => {
  // ...
})
```

#### ✅ New Way
```typescript
import { RegionService } from '@/services/RegionService'
import { TerritoryService } from '@/services/TerritoryService'

const regionService = new RegionService('france')
const territories = regionService.getOverseasTerritories()
const defaultTranslations = TerritoryService.calculateDefaultTranslations(territories)

Object.entries(defaultTranslations).forEach(([code, { x, y }]) => {
  // ...
})
```

### 5. Creating a Cartographer

#### ❌ Old Way
```typescript
import { Cartographer } from '@/cartographer/Cartographer'
import { DEFAULT_COMPOSITE_PROJECTION_CONFIG, DEFAULT_GEO_DATA_CONFIG } from '@/constants/territories/france-territories'

const cartographer = new Cartographer(DEFAULT_GEO_DATA_CONFIG, DEFAULT_COMPOSITE_PROJECTION_CONFIG)
```

#### ✅ New Way
```typescript
import { CartographerFactory } from '@/services/CartographerFactory'

// Factory handles all region-specific setup
const cartographer = await CartographerFactory.create('france')
```

### 6. In Pinia Stores

#### ❌ Old Way
```typescript
import { ALL_TERRITORIES, OVERSEAS_TERRITORIES } from '@/constants/territories/france-territories'

const allTerritories = ref(ALL_TERRITORIES)
const overseasTerritories = ref(OVERSEAS_TERRITORIES)
```

#### ✅ New Way
```typescript
import { computed } from 'vue'
import { RegionService } from '@/services/RegionService'

const regionService = computed(() => new RegionService(selectedRegion.value))

const allTerritories = computed(() => regionService.value.getAllTerritories())
const overseasTerritories = computed(() => regionService.value.getOverseasTerritories())
```

## Key Services Reference

### TerritoryService (Static Utilities)
```typescript
import { TerritoryService } from '@/services/TerritoryService'

// Generic operations - works with any territory data
TerritoryService.getTerritoryByCode(territories, 'FR-GF')
TerritoryService.getTerritoriesForMode(territories, mode, modeConfig)
TerritoryService.calculateDefaultProjections(territories)
TerritoryService.calculateDefaultTranslations(territories)
TerritoryService.calculateDefaultScales(territories)
TerritoryService.groupByRegion(territories)
TerritoryService.getTerritoryRegion(territories, code)
```

### RegionService (Region-Aware Facade)
```typescript
import { RegionService } from '@/services/RegionService'

const service = new RegionService('france') // or 'portugal', 'eu'

// Get data
service.getAllTerritories()
service.getOverseasTerritories()
service.getMainlandTerritory()

// Get configuration
service.getProjectionParams()
service.getTerritoryModes()
service.getTerritoryGroups()
service.getGeoDataConfig()
service.getCompositeConfig()
```

### CartographerFactory
```typescript
import { CartographerFactory } from '@/services/CartographerFactory'

// Create a region-specific cartographer
const cartographer = await CartographerFactory.create('france')

// Get cached instance
const same = CartographerFactory.getInstance('france')

// Clear cache when needed
CartographerFactory.clearCache('france')
```

## Benefits of New Architecture

1. **Separation of Concerns**
   - Data layer: Pure geographic data
   - Config layer: Region-specific settings
   - Service layer: Business logic

2. **Region Agnostic**
   - No hard-coded France dependencies
   - Easy to add new regions
   - Dynamic region switching

3. **Better Maintainability**
   - Clear file structure
   - Single responsibility principle
   - Easier to test

4. **Type Safety**
   - Better TypeScript types
   - Centralized type definitions
   - Compile-time checks

## Adding a New Region

To add a new region (e.g., Spain), create just 2 files:

### 1. Data File: `src/data/territories/spain.data.ts`
```typescript
import type { TerritoryConfig } from '@/types/territory'

export const MAINLAND_SPAIN: TerritoryConfig = {
  code: 'ES-CONT',
  name: 'España Continental',
  // ... territory data
}

export const OVERSEAS_TERRITORIES: TerritoryConfig[] = [
  // Canary Islands, etc.
]

export const ALL_TERRITORIES = [MAINLAND_SPAIN, ...OVERSEAS_TERRITORIES]
```

### 2. Config File: `src/config/regions/spain.config.ts`
```typescript
import type { RegionConfig, RegionSpecificConfig } from './types'
import { ALL_TERRITORIES, OVERSEAS_TERRITORIES } from '@/data/territories/spain.data'

export const SPAIN_PROJECTION_PARAMS = {
  // projection parameters
}

export const SPAIN_TERRITORY_MODES = {
  // territory modes
}

export const SPAIN_CONFIG: RegionSpecificConfig = {
  projectionParams: SPAIN_PROJECTION_PARAMS,
  territoryModes: SPAIN_TERRITORY_MODES,
}

export const SPAIN_REGION_CONFIG: RegionConfig = {
  id: 'spain',
  name: 'España',
  // ... region config
}
```

### 3. Register in `src/config/regions/index.ts`
```typescript
import { SPAIN_CONFIG, SPAIN_REGION_CONFIG } from './spain.config'

export const REGION_CONFIGS = {
  // ... existing regions
  spain: SPAIN_REGION_CONFIG,
}
```

That's it! No need to update services or components.

## Backward Compatibility

The old files still exist with deprecation notices for backward compatibility:
- `@/constants/territories/france-territories.ts`
- `@/constants/territories/portugal-territories.ts`
- `@/constants/territories/eu-territories.ts`
- `@/constants/regions.ts` (re-exports from new location)

These will be removed in a future version. Please migrate to the new structure.

## Need Help?

If you encounter issues during migration:
1. Check the type definitions in `@/types/territory.d.ts`
2. Look at service implementations for examples
3. See how the stores use the new services
4. Review this migration guide

## Timeline

- **Phase 1-6**: ✅ Complete - New architecture implemented
- **Phase 7**: 🔄 Current - Deprecation notices added
- **Phase 8**: Upcoming - Final testing and documentation
- **Future**: Old files will be removed after migration period
