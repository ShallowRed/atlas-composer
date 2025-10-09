# Projection System Migration Guide

## Overview

This guide helps you migrate from the old projection system to the new metadata-rich projection system with intelligent recommendations.

**Target Version**: Atlas Composer v2.0
**Migration Difficulty**: Low to Medium
**Estimated Time**: 30-60 minutes

## What Changed

### Old System (Before Refactoring)

```typescript
// Old: Hardcoded array in projection-service.ts
const PROJECTION_OPTIONS = [
  { value: 'mercator', label: 'Mercator' },
  { value: 'naturalEarth', label: 'Natural Earth' },
  // ... more projections
]

// Old: Switch statement for creation
function getProjection(name: string) {
  switch (name) {
    case 'mercator':
      return d3.geoMercator()
    case 'naturalEarth':
      return d3.geoNaturalEarth1()
    // ... more cases
  }
}
```

### New System (After Refactoring)

```typescript
// New: Registry-based with metadata
import { ProjectionFactory } from '@/projections/factory'
import { ProjectionRegistry } from '@/projections/registry'

const registry = ProjectionRegistry.getInstance()
const factory = ProjectionFactory.getInstance()

// Get recommendations
const recommendations = registry.recommend({
  atlasId: 'france',
  viewMode: 'split',
  limit: 5
})

// Create projection
const projection = factory.create({
  projection: recommendations[0].definition,
  center: [2.5, 46.5],
  scale: 2500
})
```

## Breaking Changes

### 1. Projection ID Changes

Some projection IDs have been standardized:

| Old ID | New ID | Notes |
|--------|--------|-------|
| `naturalEarth` | `natural-earth` | Kebab-case standardization |
| `conicConformal` | `conic-conformal` | Kebab-case standardization |
| `azimuthalEqualArea` | `azimuthal-equal-area` | Kebab-case standardization |
| `azimuthalEquidistant` | `azimuthal-equidistant` | Kebab-case standardization |
| `conicConformalFrance` | `conic-conformal-france` | Kebab-case standardization |
| `conicConformalPortugal` | `conic-conformal-portugal` | Kebab-case standardization |
| `conicConformalEurope` | `conic-conformal-europe` | Kebab-case standardization |

**Migration Path**: The registry supports **aliases** and **case-insensitive lookup**, so old IDs still work:

```typescript
// All of these work:
registry.get('naturalEarth')      // ✅ Alias
registry.get('natural-earth')     // ✅ New ID
registry.get('NATURAL-EARTH')     // ✅ Case-insensitive
```

### 2. Import Paths Changed

| Old Import | New Import |
|------------|------------|
| `@/services/projection-service` | `@/projections/registry` + `@/projections/factory` |
| `@/services/projections` | `@/projections/registry` + `@/projections/factory` |

**Migration Example**:

```typescript
// Old
import { ProjectionService } from '@/services/projection-service'
const projection = ProjectionService.getProjection('mercator')

// New
import { ProjectionFactory } from '@/projections/factory'
const factory = ProjectionFactory.getInstance()
const projection = factory.createById('mercator')
```

### 3. API Changes

#### Getting Projections

```typescript
// Old
import { PROJECTION_OPTIONS } from '@/services/projection-service'
const options = PROJECTION_OPTIONS

// New
import { ProjectionRegistry } from '@/projections/registry'
const registry = ProjectionRegistry.getInstance()
const projections = registry.getAll()
```

#### Creating Projections

```typescript
// Old
import { ProjectionService } from '@/services/projection-service'
const projection = ProjectionService.getProjection('mercator')
  .center([2.5, 46.5])
  .scale(2500)

// New
import { ProjectionFactory } from '@/projections/factory'
const factory = ProjectionFactory.getInstance()
const projection = factory.createById('mercator', {
  center: [2.5, 46.5],
  scale: 2500
})
```

#### Filtering Projections

```typescript
// Old: Manual filtering
const conicProjections = PROJECTION_OPTIONS.filter(p => 
  p.category === 'Conique'
)

// New: Built-in filtering
const conicProjections = registry.filter({ family: 'conic' })
```

### 4. Type Changes

```typescript
// Old
interface ProjectionOption {
  value: string
  label: string
  category?: string
}

// New
interface ProjectionDefinition {
  id: string
  name: string
  category: ProjectionCategory
  family: ProjectionFamily
  strategy: ProjectionStrategy
  capabilities: ProjectionCapabilities
  suitability: ProjectionSuitability
  // ... more metadata
}
```

## Step-by-Step Migration

### Step 1: Update Imports

Replace old projection service imports:

```typescript
// Before
import { ProjectionService } from '@/services/projection-service'
import { PROJECTION_OPTIONS } from '@/services/projection-service'

// After
import { ProjectionFactory } from '@/projections/factory'
import { ProjectionRegistry } from '@/projections/registry'
```

### Step 2: Update Projection Lists

Replace hardcoded projection options:

```typescript
// Before
const projectionOptions = PROJECTION_OPTIONS

// After
const registry = ProjectionRegistry.getInstance()
const projectionOptions = registry.getAll().map(def => ({
  value: def.id,
  label: def.name
}))
```

### Step 3: Update Projection Creation

Replace projection creation calls:

```typescript
// Before
const projection = ProjectionService.getProjection(selectedProjection)
  .center([2.5, 46.5])
  .scale(2500)

// After
const factory = ProjectionFactory.getInstance()
const projection = factory.createById(selectedProjection, {
  center: [2.5, 46.5],
  scale: 2500
})
```

### Step 4: Use Recommendations (Optional but Recommended)

Replace manual projection selection with intelligent recommendations:

```typescript
// Before
const defaultProjection = 'mercator'

// After
const registry = ProjectionRegistry.getInstance()
const recommendations = registry.recommend({
  atlasId: currentAtlas,
  viewMode: currentViewMode,
  limit: 1
})
const defaultProjection = recommendations[0]?.definition.id || 'mercator'
```

### Step 5: Update Filtering Logic

Replace manual filtering with registry filters:

```typescript
// Before
const recommendedProjections = projections.filter(p => 
  p.category === 'Recommandées'
)

// After
const recommendedProjections = registry.filter({
  category: 'RECOMMENDED'
})

// Or even better, use recommendations:
const recommendedProjections = registry.recommend({
  atlasId: 'france',
  limit: 10
}).map(rec => rec.definition)
```

## Migration Examples

### Example 1: Component with Projection Selector

#### Before

```typescript
// ProjectionSelector.vue (Old)
<script setup lang="ts">
import { PROJECTION_OPTIONS } from '@/services/projection-service'

const projections = PROJECTION_OPTIONS
const selected = ref('mercator')
</script>

<template>
  <select v-model="selected">
    <option v-for="proj in projections" :value="proj.value">
      {{ proj.label }}
    </option>
  </select>
</template>
```

#### After

```typescript
// ProjectionSelector.vue (New)
<script setup lang="ts">
import { ProjectionRegistry } from '@/projections/registry'
import { computed } from 'vue'

const registry = ProjectionRegistry.getInstance()

// Get all projections
const projections = computed(() => registry.getAll())

// Or get recommendations
const projections = computed(() => {
  const recommendations = registry.recommend({
    atlasId: props.atlasId,
    viewMode: props.viewMode,
    limit: 10
  })
  return recommendations.map(rec => rec.definition)
})

const selected = ref('mercator')
</script>

<template>
  <select v-model="selected">
    <option v-for="proj in projections" :value="proj.id">
      {{ proj.name }}
    </option>
  </select>
</template>
```

### Example 2: Service with Projection Creation

#### Before

```typescript
// map-service.ts (Old)
import { ProjectionService } from '@/services/projection-service'

export class MapService {
  createMap(projectionName: string, options: any) {
    const projection = ProjectionService.getProjection(projectionName)
      .center(options.center)
      .scale(options.scale)
    
    return d3.geoPath().projection(projection)
  }
}
```

#### After

```typescript
// map-service.ts (New)
import { ProjectionFactory } from '@/projections/factory'
import { ProjectionRegistry } from '@/projections/registry'

export class MapService {
  private factory = ProjectionFactory.getInstance()
  private registry = ProjectionRegistry.getInstance()
  
  createMap(projectionId: string, options: any) {
    const definition = this.registry.get(projectionId)
    if (!definition) {
      throw new Error(`Unknown projection: ${projectionId}`)
    }
    
    const projection = this.factory.create({
      projection: definition,
      center: options.center,
      scale: options.scale
    })
    
    return d3.geoPath().projection(projection)
  }
  
  // New: Smart projection selection
  createMapWithRecommendation(atlasId: string, viewMode: string, options: any) {
    const recommendations = this.registry.recommend({
      atlasId,
      viewMode,
      limit: 1
    })
    
    const projection = this.factory.create({
      projection: recommendations[0].definition,
      center: options.center,
      scale: options.scale
    })
    
    return d3.geoPath().projection(projection)
  }
}
```

### Example 3: Store with Projection State

#### Before

```typescript
// projection-store.ts (Old)
import { defineStore } from 'pinia'
import { PROJECTION_OPTIONS } from '@/services/projection-service'

export const useProjectionStore = defineStore('projection', {
  state: () => ({
    selectedProjection: 'mercator',
    availableProjections: PROJECTION_OPTIONS
  }),
  
  actions: {
    setProjection(name: string) {
      this.selectedProjection = name
    }
  }
})
```

#### After

```typescript
// projection-store.ts (New)
import { defineStore } from 'pinia'
import { ProjectionRegistry } from '@/projections/registry'
import type { ProjectionDefinition } from '@/projections/types'

export const useProjectionStore = defineStore('projection', {
  state: () => ({
    selectedProjectionId: 'mercator',
    atlasId: 'france',
    viewMode: 'split' as const
  }),
  
  getters: {
    registry: () => ProjectionRegistry.getInstance(),
    
    selectedProjection(): ProjectionDefinition | undefined {
      return this.registry.get(this.selectedProjectionId)
    },
    
    availableProjections(): ProjectionDefinition[] {
      return this.registry.getAll()
    },
    
    recommendedProjections(): ProjectionDefinition[] {
      const recommendations = this.registry.recommend({
        atlasId: this.atlasId,
        viewMode: this.viewMode,
        limit: 10
      })
      return recommendations.map(rec => rec.definition)
    }
  },
  
  actions: {
    setProjection(id: string) {
      if (this.registry.isValid(id)) {
        this.selectedProjectionId = id
      }
    },
    
    setContext(atlasId: string, viewMode: string) {
      this.atlasId = atlasId
      this.viewMode = viewMode
      
      // Auto-select best projection
      const recommendations = this.registry.recommend({
        atlasId,
        viewMode,
        limit: 1
      })
      if (recommendations.length > 0) {
        this.selectedProjectionId = recommendations[0].definition.id
      }
    }
  }
})
```

## Non-Breaking Changes (Enhancements)

These features are new and don't require migration, but you should use them:

### 1. Smart Recommendations

```typescript
// Automatically get the best projection for your context
const recommendations = registry.recommend({
  atlasId: 'france',
  viewMode: 'split',
  limit: 5
})

recommendations.forEach(rec => {
  console.log(`${rec.definition.name} - Score: ${rec.score}`)
})
```

### 2. Advanced Filtering

```typescript
// Filter by capabilities
const equalAreaProjections = registry.filter({
  capabilities: { preservesArea: true }
})

// Filter by suitability
const polarProjections = registry.filter({
  suitability: { polar: { min: 80 } }
})

// Combined filters
const franceConicProjections = registry.filter({
  atlasId: 'france',
  family: 'conic',
  viewMode: 'split'
})
```

### 3. Rich Metadata

```typescript
const projection = registry.get('conic-conformal-france')!

console.log('Capabilities:', projection.capabilities)
// { preservesAngles: true, supportsSplit: true, ... }

console.log('Suitability:', projection.suitability)
// { france: 100, midLatitude: 90, ... }

console.log('Use Cases:', projection.useCases)
// ['Displaying France with DOM-TOM territories']
```

## Testing Your Migration

### 1. Check for Deprecation Warnings

After migrating, check the console for warnings:

```typescript
// Old code might still work but show warnings
const projection = ProjectionService.getProjection('mercator')
// Warning: ProjectionService is deprecated, use ProjectionFactory
```

### 2. Verify Projection IDs

Ensure all projection IDs are valid:

```typescript
const registry = ProjectionRegistry.getInstance()

const myProjectionIds = ['mercator', 'naturalEarth', 'albers']
myProjectionIds.forEach(id => {
  if (!registry.isValid(id)) {
    console.error(`Invalid projection ID: ${id}`)
  }
})
```

### 3. Test Recommendations

Verify recommendations work for your atlases:

```typescript
const atlases = ['france', 'portugal', 'spain', 'eu']
atlases.forEach(atlasId => {
  const recommendations = registry.recommend({ atlasId, limit: 1 })
  console.log(`Best for ${atlasId}:`, recommendations[0]?.definition.name)
})
```

### 4. Run Tests

```bash
# Run projection system tests
pnpm test src/projections

# Run full test suite
pnpm test

# Check for type errors
pnpm typecheck
```

## Troubleshooting

### Problem: "Cannot find module '@/services/projection-service'"

**Solution**: Update import to new path:

```typescript
// Old
import { ProjectionService } from '@/services/projection-service'

// New
import { ProjectionFactory } from '@/projections/factory'
import { ProjectionRegistry } from '@/projections/registry'
```

### Problem: "Projection ID 'naturalEarth' not found"

**Solution**: Use new kebab-case ID or leverage aliases:

```typescript
// Option 1: Use new ID
registry.get('natural-earth')

// Option 2: Use alias (still works)
registry.get('naturalEarth')  // Alias support

// Option 3: Case-insensitive
registry.get('NATURAL-EARTH')
```

### Problem: "Property 'getProjection' does not exist"

**Solution**: Update to factory pattern:

```typescript
// Old
const projection = ProjectionService.getProjection('mercator')

// New
const factory = ProjectionFactory.getInstance()
const projection = factory.createById('mercator')
```

### Problem: "Recommendations always return empty array"

**Solution**: Check atlas ID and view mode:

```typescript
// Make sure atlas ID is valid
const validAtlases = ['france', 'portugal', 'spain', 'eu']

// Check your filter context
const recommendations = registry.recommend({
  atlasId: 'france',  // Must be a valid atlas
  viewMode: 'split',  // Must be valid view mode
  limit: 5
})

if (recommendations.length === 0) {
  // Fall back to all projections
  const allProjections = registry.getAll()
}
```

### Problem: "Type errors with ProjectionDefinition"

**Solution**: Import types properly:

```typescript
import type { ProjectionDefinition } from '@/projections/types'

// Use in your code
const projection: ProjectionDefinition | undefined = registry.get('mercator')
```

## Rollback Plan

If you need to rollback the migration:

### Option 1: Use Legacy Service (Temporary)

The old `ProjectionService` is marked as deprecated but still functional:

```typescript
// This still works (with warnings)
import { ProjectionService } from '@/services/projection-service'
const projection = ProjectionService.getProjection('mercator')
```

### Option 2: Git Revert

```bash
# Revert to before migration
git log --oneline  # Find commit hash
git revert <commit-hash>
```

### Option 3: Feature Flag

Add a feature flag to switch between old and new systems:

```typescript
// config.ts
export const USE_NEW_PROJECTION_SYSTEM = false

// In your code
if (USE_NEW_PROJECTION_SYSTEM) {
  // Use new system
  const factory = ProjectionFactory.getInstance()
  projection = factory.createById(id)
} else {
  // Use old system
  projection = ProjectionService.getProjection(id)
}
```

## Timeline

The old projection service will be maintained according to this timeline:

- **Current**: Both old and new systems work (with deprecation warnings)
- **v2.1** (Q1 2026): Old system marked as deprecated
- **v2.5** (Q2 2026): Old system removed, new system only

**Recommendation**: Migrate as soon as possible to take advantage of new features and avoid future breaking changes.

## Support

For questions or issues during migration:

1. Check the [PROJECTIONS.md](./PROJECTIONS.md) documentation
2. Review the [test files](../src/projections/__tests__/) for examples
3. Open an issue on GitHub
4. Contact the development team

## Summary Checklist

- [ ] Updated all imports from `@/services/projection-service` to `@/projections/*`
- [ ] Replaced `ProjectionService.getProjection()` with `ProjectionFactory.create()`
- [ ] Replaced `PROJECTION_OPTIONS` with `ProjectionRegistry.getAll()`
- [ ] Updated projection IDs to kebab-case (or use aliases)
- [ ] Implemented smart recommendations where appropriate
- [ ] Updated filtering logic to use registry filters
- [ ] Added type annotations with `ProjectionDefinition`
- [ ] Tested all projection-related functionality
- [ ] Removed deprecation warnings from console
- [ ] Updated tests to use new system
- [ ] Documented any custom projections added

---

**Migration Status**: Ready for Production
**Last Updated**: January 2025
