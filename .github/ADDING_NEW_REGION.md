# Adding a New Region - Quick Guide

This guide shows you how to add support for a new geographic region (country, union, etc.) to the application.

## Quick Start

Adding a new region requires creating **just 2 files** + **1 registration**:

```
✅ Step 1: Create data file      src/data/territories/[region].data.ts
✅ Step 2: Create config file    src/config/regions/[region].config.ts
✅ Step 3: Register region       src/config/regions/index.ts
```

That's it! No need to modify services, stores, or components.

## Step-by-Step Example: Adding Spain

### Step 1: Create Data File

**File**: `src/data/territories/spain.data.ts`

```typescript
/**
 * Spain Territory Data
 * Pure geographic data for Spain and its territories
 */

import type { TerritoryConfig } from '@/types/territory'

/**
 * Mainland Spain
 */
export const MAINLAND_SPAIN: TerritoryConfig = {
  code: 'ES-CONT',
  name: 'España Continental',
  shortName: 'Península',
  center: [-3.7, 40.4], // Madrid coordinates
  offset: [80, 0], // Default position offset for composite view
  bounds: [[-9.3, 36.0], [3.3, 43.8]], // Geographic bounds
  projectionType: 'conic-conformal',
  rotate: [-3, 0],
  area: 492175, // km²
  region: 'Mainland',
}

/**
 * Overseas/Autonomous territories
 */
export const OVERSEAS_TERRITORIES: TerritoryConfig[] = [
  {
    code: 'ES-CN',
    name: 'Islas Canarias',
    shortName: 'Canarias',
    center: [-15.5, 28.1],
    offset: [0, -200], // Position in composite view
    bounds: [[-18.2, 27.6], [-13.4, 29.4]],
    projectionType: 'mercator',
    rotate: [0, 0],
    area: 7447,
    region: 'Océano Atlántico',
  },
  {
    code: 'ES-CE',
    name: 'Ceuta',
    shortName: 'Ceuta',
    center: [-5.3, 35.9],
    offset: [-150, -100],
    bounds: [[-5.4, 35.85], [-5.25, 35.95]],
    projectionType: 'mercator',
    rotate: [0, 0],
    area: 19,
    region: 'Norte de África',
  },
  {
    code: 'ES-ML',
    name: 'Melilla',
    shortName: 'Melilla',
    center: [-2.9, 35.3],
    offset: [-100, -100],
    bounds: [[-3.0, 35.25], [-2.85, 35.35]],
    projectionType: 'mercator',
    rotate: [0, 0],
    area: 12,
    region: 'Norte de África',
  },
]

/**
 * All Spanish territories
 */
export const ALL_TERRITORIES: TerritoryConfig[] = [
  MAINLAND_SPAIN,
  ...OVERSEAS_TERRITORIES,
]
```

### Step 2: Create Config File

**File**: `src/config/regions/spain.config.ts`

```typescript
/**
 * Spain Region Configuration
 * Region-specific settings for Spain
 */

import type { RegionSpecificConfig } from './types'
import type { RegionConfig } from '@/types/territory'
import { ALL_TERRITORIES, MAINLAND_SPAIN, OVERSEAS_TERRITORIES } from '@/data/territories/spain.data'

/**
 * Projection parameters for Spain
 */
export const SPAIN_PROJECTION_PARAMS = {
  center: {
    longitude: -3.7,
    latitude: 40.4,
  },
  rotate: {
    mainland: [-3, 0] as [number, number],
    azimuthal: [3.7, -40.4] as [number, number],
  },
  parallels: {
    conic: [38, 42] as [number, number],
  },
}

/**
 * Territory mode configurations for Spain
 */
export const SPAIN_TERRITORY_MODES = {
  'mainland-only': {
    label: 'Península únicamente',
    codes: [],
  },
  'with-canarias': {
    label: 'Península + Canarias',
    codes: ['ES-CN'],
  },
  'all-territories': {
    label: 'Todos los territorios',
    codes: ['ES-CN', 'ES-CE', 'ES-ML'],
  },
}

/**
 * Territory groups for Spain (for UI organization)
 */
export const SPAIN_TERRITORY_GROUPS = {
  atlantic: {
    label: 'Océano Atlántico',
    codes: ['ES-CN'],
  },
  africa: {
    label: 'Norte de África',
    codes: ['ES-CE', 'ES-ML'],
  },
}

/**
 * Geographic data configuration
 */
export const SPAIN_GEO_DATA_CONFIG = {
  dataPath: '/data/spain-territories-50m.json',
  metadataPath: '/data/spain-metadata-50m.json',
  topologyObjectName: 'territories',
  mainlandCode: 'ES-CONT',
  mainlandBounds: [[-9.3, 36.0], [3.3, 43.8]] as [[number, number], [number, number]],
  overseasTerritories: OVERSEAS_TERRITORIES,
}

/**
 * Default composite projection configuration
 * Pre-configured positions for the default composite view
 */
export const SPAIN_DEFAULT_COMPOSITE_CONFIG = {
  territoryProjections: {
    'ES-CN': 'mercator',
    'ES-CE': 'mercator',
    'ES-ML': 'mercator',
  },
  territoryTranslations: {
    'ES-CN': { x: 0, y: -200 },
    'ES-CE': { x: -150, y: -100 },
    'ES-ML': { x: -100, y: -100 },
  },
  territoryScales: {
    'ES-CN': 1.0,
    'ES-CE': 1.0,
    'ES-ML': 1.0,
  },
}

/**
 * Composite projection configuration for CustomCompositeProjection
 */
export const SPAIN_COMPOSITE_PROJECTION_CONFIG = {
  mainlandBounds: SPAIN_GEO_DATA_CONFIG.mainlandBounds,
  mainlandCode: 'ES-CONT',
  mainlandProjection: {
    type: 'conic-conformal',
    rotate: SPAIN_PROJECTION_PARAMS.rotate.mainland,
    parallels: SPAIN_PROJECTION_PARAMS.parallels.conic,
    center: [SPAIN_PROJECTION_PARAMS.center.longitude, SPAIN_PROJECTION_PARAMS.center.latitude],
  },
  overseasTerritories: OVERSEAS_TERRITORIES.map(t => ({
    code: t.code,
    bounds: t.bounds,
    projection: {
      type: t.projectionType,
      rotate: t.rotate,
    },
  })),
}

/**
 * Complete region-specific configuration
 */
export const SPAIN_CONFIG: RegionSpecificConfig = {
  projectionParams: SPAIN_PROJECTION_PARAMS,
  territoryModes: SPAIN_TERRITORY_MODES,
  territoryGroups: SPAIN_TERRITORY_GROUPS,
  defaultCompositeConfig: SPAIN_DEFAULT_COMPOSITE_CONFIG,
}

/**
 * Full region configuration for Spain
 */
export const SPAIN_REGION_CONFIG: RegionConfig = {
  id: 'spain',
  name: 'España',
  geoDataConfig: SPAIN_GEO_DATA_CONFIG,
  supportedViewModes: ['split', 'composite-existing', 'composite-custom', 'unified'],
  defaultViewMode: 'composite-custom',
  defaultTerritoryMode: 'with-canarias',
  compositeProjections: ['conic-conformal-spain'],
  defaultCompositeProjection: 'conic-conformal-spain',
  compositeProjectionConfig: SPAIN_COMPOSITE_PROJECTION_CONFIG,
  defaultCompositeConfig: SPAIN_DEFAULT_COMPOSITE_CONFIG,
  splitModeConfig: {
    mainlandTitle: 'España Continental',
    mainlandCode: 'ES-CONT',
    territoriesTitle: 'Territorios Autónomos',
  },
  hasTerritorySelector: true,
  territoryModeOptions: [
    { value: 'mainland-only', label: SPAIN_TERRITORY_MODES['mainland-only'].label },
    { value: 'with-canarias', label: SPAIN_TERRITORY_MODES['with-canarias'].label },
    { value: 'all-territories', label: SPAIN_TERRITORY_MODES['all-territories'].label },
  ],
}
```

### Step 3: Register the Region

**File**: `src/config/regions/index.ts`

Add your region to the exports:

```typescript
import { SPAIN_CONFIG, SPAIN_REGION_CONFIG } from './spain.config'

export const REGION_CONFIGS: Record<string, RegionConfig> = {
  france: FRANCE_REGION_CONFIG,
  portugal: PORTUGAL_REGION_CONFIG,
  eu: EU_REGION_CONFIG,
  spain: SPAIN_REGION_CONFIG, // ← Add this line
}

export const REGION_SPECIFIC_CONFIGS = {
  france: FRANCE_CONFIG,
  portugal: PORTUGAL_CONFIG,
  eu: EU_CONFIG,
  spain: SPAIN_CONFIG, // ← Add this line
}
```

Also add to the data registry:

**File**: `src/data/territories/index.ts`

```typescript
import * as SpainData from './spain.data'

export const REGION_DATA_REGISTRY = {
  france: FranceData,
  portugal: PortugalData,
  eu: EuData,
  spain: SpainData, // ← Add this line
}
```

### Step 4: Generate Geographic Data

Prepare the TopoJSON data files:

```bash
# Create config file
cat > scripts/configs/spain.js << 'EOF'
export default {
  name: 'Spain',
  description: 'Spain and autonomous territories',
  territories: {
    724: {
      name: 'España Continental',
      code: 'ES-CONT',
      iso: 'ESP',
      bounds: [[-9.3, 36.0], [3.3, 43.8]]
    },
    // Canary Islands
    'Canarias': {
      name: 'Islas Canarias',
      code: 'ES-CN',
      iso: 'ESP',
    },
    // Add other territories...
  },
  outputName: 'spain-territories',
}
EOF

# Generate data
node scripts/prepare-geodata.js spain
```

## Testing Your New Region

1. **Start dev server**:
   ```bash
   pnpm dev
   ```

2. **Select your region** in the UI region selector

3. **Test all view modes**:
   - Split view
   - Composite (existing)
   - Composite (custom)
   - Unified view

4. **Test territory modes** (if applicable)

## Configuration Reference

### Required Fields in TerritoryConfig

```typescript
{
  code: string // Unique identifier (e.g., 'ES-CN')
  name: string // Full display name
  shortName: string // Abbreviated name (optional)
  center: [number, number] // [longitude, latitude]
  offset: [number, number] // [x, y] offset in composite view
  bounds: [[number, number], [number, number]] // Geographic bounds
  projectionType: string // e.g., 'mercator', 'conic-conformal'
  rotate: [number, number] // [lambda, phi] projection rotation
  area: number // Area in km² (optional but recommended)
  region: string // Group label for UI organization
}
```

### Required Fields in RegionConfig

```typescript
{
  id: string                      // Unique region ID
  name: string                    // Display name
  geoDataConfig: GeoDataConfig    // Data file paths and settings
  supportedViewModes: string[]    // Which view modes work
  defaultViewMode: string         // Default on load
  splitModeConfig?: {             // For split view
    mainlandTitle: string
    mainlandCode: string
    territoriesTitle: string
  }
  hasTerritorySelector: boolean   // Show territory mode selector?
  territoryModeOptions?: Array    // Territory mode options
}
```

## Tips

1. **Start Simple**: Begin with just mainland + 1-2 territories
2. **Test Incrementally**: Add one territory at a time
3. **Copy Existing**: Use France or Portugal as templates
4. **Visual Tuning**: Adjust `offset` values in the UI, then update config
5. **Bounds Matter**: Accurate bounds ensure proper territory extraction

## Need Help?

- Check existing regions: `france.config.ts`, `portugal.config.ts`
- Review type definitions: `src/types/territory.d.ts`
- See migration guide: `.github/MIGRATION_GUIDE.md`
- Test data generation: `scripts/configs/README.md`

## What Happens Automatically?

Once registered, your region automatically gets:
- ✅ Region selector entry
- ✅ Region-specific services via `RegionService`
- ✅ Cartographer instances via `CartographerFactory`
- ✅ Territory filtering and grouping
- ✅ Default projection calculations
- ✅ UI state management

No additional code needed!
