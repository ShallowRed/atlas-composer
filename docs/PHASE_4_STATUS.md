# Phase 4: World Atlas - Wildcard Territory Support

## Status: Infrastructure Complete ✅ | Full Implementation Pending 🔄

## Goal
Enable world atlas (and other large-scale equal-members atlases) with wildcard `"*"` territory loading instead of listing all 241 countries explicitly in JSON config.

## Completed Work

### 1. Schema Extensions ✅
**File**: `configs/schema.json`

Added comprehensive support for new atlas patterns:
- **Pattern field**: `"single-focus" | "equal-members" | "hierarchical"`
- **I18n support**: `name` and `description` accept string OR `{ en: string, fr?: string }`
- **Wildcard territories**: `territories` can be `"*"` (all from data file) OR explicit array
- **New territory modes**: `territoryModes` array with:
  - I18n names
  - Wildcard support: `territoryCodes: "*"`
  - Exclusion support: `exclude: ["010"]` (e.g., "all except Antarctica")
- **New config fields**:
  - `defaultTerritoryMode`: Initial mode selection
  - `defaultProjection`: Default projection ID
  - `metadata.dataFiles`: Specify data file paths per resolution

### 2. Type System Updates ✅
**File**: `types/atlas-config.ts`

Extended `JSONAtlasConfig` interface:
```typescript
{
  pattern?: 'single-focus' | 'equal-members' | 'hierarchical'
  territories: '*' | JSONTerritoryConfig[]
  name: string | { en: string, fr?: string }
  description: string | { en: string, fr?: string }
  territoryModes?: Array<{
    id: string
    name: string | { en: string, fr?: string }
    territoryCodes: '*' | string[]
    exclude?: string[]
  }>
  defaultTerritoryMode?: string
  defaultProjection?: string
  metadata?: { ... }
}
```

### 3. Loader Wildcard Detection ✅
**File**: `src/core/atlases/loader.ts`

Updated `extractTerritories()` to detect wildcard `"*"`:
- Creates placeholder TerritoryConfig when `config.territories === "*"`
- Returns `isWildcard: true` flag for downstream handling
- Maintains synchronous loading (no breaking changes to registry)

**Key change**:
```typescript
if (config.territories === '*') {
  return {
    type: 'equal-members' as const,
    mainland: placeholderTerritory,
    mainlands: [placeholderTerritory],
    overseas: [],
    all: [placeholderTerritory],
    isWildcard: true, // Signal for geo-data service
  }
}
```

### 4. World Atlas Config ✅
**File**: `configs/world.json`

Created minimal world atlas config using wildcard:
```json
{
  "id": "world",
  "name": "World",
  "territories": "*",
  "viewModes": ["unified"],
  "projectionPreferences": {
    "recommended": ["natural-earth", "robinson", "mercator"]
  }
}
```

### 5. Compilation Verified ✅
- All TypeScript files compile without errors
- No breaking changes to existing atlases (France, Portugal, USA, EU)
- Registry loads successfully with wildcard placeholder

## Architecture Decision

**Chosen approach**: **Lazy loading via geo-data service**

Instead of loading all 241 countries at config load time (which would require making the entire registry async and breaking all callsites), we:

1. **Loader phase** (sync): Detect wildcard, return placeholder with `isWildcard: true` flag
2. **Geo-data service** (async): When loading data, detect `isWildcard` flag and dynamically extract all territories from TopoJSON file
3. **Benefits**:
   - No breaking changes to existing code
   - Config loading remains synchronous
   - Actual territory list loaded only when atlas is activated
   - Supports huge atlases without blocking app startup

## Remaining Work

### 1. Geo-Data Service Wildcard Loading 🔄
**File**: `src/services/geo-data-service.ts`

Need to implement dynamic territory extraction:
```typescript
async function loadTerritoryData(atlasId: string) {
  const config = getAtlasConfig(atlasId)
  
  // Check if this is a wildcard atlas
  const territories = getAtlasTerritories(atlasId)
  if (territories.isWildcard) {
    // Load TopoJSON
    const topoData = await fetch(config.geoDataConfig.dataPath).then(r => r.json())
    
    // Extract all geometries as territories
    const geometries = topoData.objects.countries?.geometries || []
    const allTerritories = geometries.map(geom => ({
      code: `WD-${geom.id}`,
      name: geom.properties.name,
      // Calculate bounds, center from geometry
    }))
    
    // Update territories in-place
    territories.mainlands = allTerritories
    territories.all = allTerritories
  }
  
  // Continue with normal loading...
}
```

### 2. Territory Mode Wildcard & Exclusion 🔄
**Files**: 
- `src/core/atlases/loader.ts` - `createTerritoryModes()`
- `src/stores/geoData.ts` - territory mode filtering
- `src/components/TerritoryControls.vue` - UI

Support `territoryCodes: "*"` with `exclude` array:
```typescript
// In createTerritoryModes()
if (mode.territoryCodes === '*') {
  // Get all territory codes
  let codes = getAllTerritoryCodes(territories)
  
  // Apply exclusions
  if (mode.exclude) {
    codes = codes.filter(code => !mode.exclude.includes(code))
  }
  
  return codes
}
```

### 3. Complete World Config 🔄
Once wildcard loading works, enhance `configs/world.json`:
- Add continent-based territory modes
- Add i18n names (EN/FR)
- Test with projections

### 4. Testing & Validation ⏸️
- Load world atlas in UI
- Verify all 241 countries render
- Test continent filtering
- Test "without Antarctica" mode
- Performance check (241 countries is heavy!)

## Migration Path

**For existing atlases**: No changes required
- France, Portugal, USA: Continue using explicit territory arrays
- EU: Continue using explicit 49 member array
- All work as before

**For new large atlases**: Use wildcard
```json
{
  "id": "my-big-atlas",
  "territories": "*",
  "territoryModes": [
    { "id": "all", "name": "All", "territoryCodes": "*" },
    { "id": "filtered", "name": "Without X", "territoryCodes": "*", "exclude": ["123"] }
  ]
}
```

## Next Steps

**Option A - Complete Phase 4 Now**:
1. Implement geo-data service wildcard loading (2-3 hours)
2. Add territory mode wildcard/exclusion (1-2 hours)
3. Create full world.json with continents (1 hour)
4. Test and debug (1-2 hours)
**Total**: 5-8 hours

**Option B - Defer to Phase 5**:
1. Mark world atlas as "experimental" in UI
2. Document wildcard system for future
3. Move to Phase 5 (view capabilities)
4. Return to complete world atlas later

## Recommendation

**Proceed with Option A** - the infrastructure is 90% done. Completing wildcard loading in geo-data service is the final missing piece and would validate the entire Phase 1-4 refactoring.

The world atlas would serve as the ultimate test case proving that:
- Pattern system works for all scales (1 country → 241 countries)
- Equal-members pattern is truly generic
- New role naming (member instead of member-state) makes sense
- Wildcard system scales to any size atlas

**Your decision?**
