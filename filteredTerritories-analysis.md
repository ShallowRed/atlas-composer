# Analysis: `filteredTerritories` Naming Issue

## Problem Statement

The computed property `filteredTerritories` in `geoDataStore` is **misleading** because:

1. **It only returns overseas/secondary territories**, not the mainland
2. **The name suggests it returns ALL filtered territories**, including mainland
3. This has caused bugs where mainland territories need special handling (as we just discovered)

## Current Definition

Located in: `src/stores/geoData.ts:37`

```typescript
const filteredTerritories = computed(() => {
  const configStore = useConfigStore()
  const territories = overseasTerritoriesData.value // ← Only overseas!

  // Returns filtered overseas territories based on view mode and settings
})
```

**Key issue**: It filters from `overseasTerritoriesData`, which explicitly excludes mainland.

## Usage Analysis (34 occurrences)

### Category 1: **Correct Usage** (territory lists for overseas/secondary)
These usages are semantically correct - they genuinely only need overseas territories:

1. **`SplitView.vue`** (3 uses)
   - Rendering split view cards for overseas territories
   - Correct: Split view shows mainland separately

2. **`TerritorySetManager.vue`** (1 use)
   - Managing active territory set (add/remove territories)
   - Correct: Users manage overseas territories, mainland is always included

3. **`useTerritoryTransforms.ts`** (1 use)
   - Getting list of territories for projection controls
   - **Potentially incorrect**: Should mainland be in this list?

4. **`useTerritoryConfig.ts`** (1 use)
   - Checking if there are territories to configure
   - **Potentially incorrect**: Logic checks length > 0, but might need mainland check

### Category 2: **Workaround Required** (needs mainland handling)
These usages need to explicitly check for mainland separately:

5. **`useTerritoryCursor.ts`** (2 uses)
   - Line 156: Checking if territory is draggable
   - Line 396: Filtering borders for drag zones
   - **Fixed with workaround**: Now explicitly checks `mainlandCode`

6. **`useClipExtentEditor.ts`** (1 use)
   - Line 77: Getting territory for clip extent editing
   - **Fixed with workaround**: Now explicitly checks `mainlandCode`

7. **`useViewState.ts`** (2 uses)
   - Line 86: `isMainlandInTerritories` check
   - Line 102: `hasOverseasTerritories` check
   - **Workaround logic**: Uses `.some(t => t.code === mainlandCode)` which will NEVER match!

8. **`useTerritoryTransforms.ts`** (1 use)
   - Line 51: Checking if mainland is in territories
   - **Workaround logic**: Uses `.some(t => t.code === mainlandCode)` which will NEVER work!

### Category 3: **Passing to Services** (ambiguous)
These pass the value to other services:

9. **`MapRenderer.vue`** (5 uses)
   - Lines 335, 391, 427 (2x), 476 (2x)
   - Passes to rendering services
   - **Impact unclear**: Services may expect all territories or only overseas

10. **`map-render-coordinator.ts`** (2 uses)
    - Line 62: Type definition
    - Line 131: Using the filtered list
    - **Impact unclear**: Service behavior depends on whether it expects mainland

11. **`initialization-service.ts`** (1 use)
    - Line 189: Building filtered atlas config
    - **Impact unclear**: Depends on service expectations

### Category 4: **Counting/Logging** (misleading)
These count or log the filtered territories:

12. **`useMapWatchers.ts`** (1 use)
    - Line 128: Logging `filteredTerritoriesCount`
    - **Misleading**: Count doesn't include mainland

13. **`useUrlState.ts`** (2 uses)
    - Lines 67, 78: Iterating territories for URL state
    - **Potentially incorrect**: URL state might not include mainland parameters

## Bugs Identified

### 🔴 Critical Bugs

1. **`useViewState.ts:86` - `isMainlandInTerritories`**
   ```typescript
   const isMainlandInTerritories = computed(() => {
     return geoDataStore.filteredTerritories.some(t => t.code === mainlandCode.value)
   })
   ```
   **Bug**: This will ALWAYS return `false` because mainland is never in `filteredTerritories`!

2. **`useTerritoryTransforms.ts:51` - `isMainlandInTerritories`**
   ```typescript
   const isMainlandInTerritories = computed(() => {
     return geoDataStore.filteredTerritories.some(t => t.code === mainlandCode.value)
   })
   ```
   **Bug**: Same issue - will ALWAYS return `false`!

### 🟡 Potential Issues

3. **`useUrlState.ts:67,78`**
   - May not be saving/loading mainland parameters in URL state

4. **`useTerritoryConfig.ts:18`**
   - `hasTerritoriesForProjectionConfig` might not detect mainland-only configurations

5. **`useTerritoryTransforms.ts:23`**
   - Territory list might be missing mainland when needed

## Recommended Solutions

### Option 1: Rename to `overseasTerritories` (Recommended)
**Pros**:
- Accurate and clear
- Forces developers to think about whether they need mainland
- Makes the mainland vs overseas distinction explicit

**Cons**:
- Large refactoring (34 usages)
- Need to audit each usage

### Option 2: Create `allTerritories` computed
**Pros**:
- Provides a complete list when needed
- Keeps existing `filteredTerritories` for backward compatibility

**Cons**:
- Two similar properties might cause confusion
- Doesn't fix the misleading name

### Option 3: Make `filteredTerritories` include mainland
**Pros**:
- Name matches behavior
- Fixes all bugs automatically

**Cons**:
- Might break existing code that assumes only overseas
- Changes fundamental store behavior

## Implementation Plan (Option 1 - Recommended)

1. **Rename in store** (`geoData.ts`)
   - `filteredTerritories` → `overseasTerritories`
   - Update computed property and export

2. **Add new helper computed** (if needed)
   - `allActiveTerritories` - includes mainland when applicable

3. **Update all 34 usages** systematically:
   - Category 1 (Correct): Simple rename, verify semantics
   - Category 2 (Workarounds): Remove workarounds, use `allActiveTerritories` if created
   - Category 3 (Services): Audit service expectations, update accordingly
   - Category 4 (Counting): Update to use appropriate property

4. **Fix critical bugs**:
   - Fix `isMainlandInTerritories` checks
   - Add proper mainland handling where needed

5. **Update documentation**:
   - `docs/vue-architecture.llm.txt`
   - Update all references to `filteredTerritories`

6. **Update tests**:
   - Update test mocks and expectations

## Estimated Impact

- **Files to modify**: ~15 files
- **Lines to change**: ~40-50 lines
- **Risk level**: Medium (breaking change, but TypeScript will catch most issues)
- **Testing required**: Comprehensive - all view modes, all territory configurations

## Next Steps

1. Get approval for Option 1 (rename to `overseasTerritories`)
2. Create comprehensive test plan
3. Implement changes systematically
4. Run full test suite
5. Manual testing in all view modes
6. Update documentation
