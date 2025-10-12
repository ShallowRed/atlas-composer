# Shareable URLs Feature - Bug Fix

## Issue Summary

User reported that the shareable URLs feature was "not really working yet" even though it was implemented.

## Root Cause Analysis

The issue was in the URL state serialization logic in `src/composables/useUrlState.ts`. The code was serializing **all** territory settings (scales and translations) whenever they differed from absolute defaults (scale ≠ 1.0, translation ≠ 0), rather than comparing against **atlas-specific defaults**.

### Why This Was a Problem

For atlases like France with composite projections:
- France has 12 overseas territories (Guadeloupe, Martinique, French Guiana, etc.)
- Each territory has default positioning values for the composite view:
  - Default scales: e.g., `FR-GP: 1.4`, `FR-MQ: 1.6`, etc.
  - Default translations: e.g., `FR-GP: {x: -324, y: -38}`, etc.
- These defaults are defined in the atlas configuration and applied on initialization

### The Bug's Impact

When generating a shareable URL for France (even with zero customizations):
- **36 territory parameters** were serialized (12 territories × 3 values each)
- URL became **800+ characters** just for default state
- URLs could easily exceed browser limits (typically 2048 chars)
- Made URLs unmanageable and potentially non-functional

**Example of problematic URL:**
```
?atlas=france&view=composite-custom&projection=azimuthal-equal-area&projMode=individual&territory=all&t={"s_FR-GP":1.4,"s_FR-MQ":1.6,"s_FR-GF":0.6,"s_FR-RE":1.2,"s_FR-YT":1.6,"s_FR-MF":2.5,"s_FR-PM":1.3,"s_FR-WF":2.7,"s_FR-PF":0.5,"s_FR-PF-2":0.06,"s_FR-NC":0.3,"s_FR-TF":0.1,"tx_FR-GP":-324,"ty_FR-GP":-38,"tx_FR-MQ":-324,"ty_FR-MQ":35,"tx_FR-GF":-324,"ty_FR-GF":155,"tx_FR-RE":313,"ty_FR-RE":-96,"tx_FR-YT":316,"ty_FR-YT":-173,"tx_FR-MF":-324,"ty_FR-MF":-119,"tx_FR-PM":-324,"ty_FR-PM":-176,"tx_FR-WF":313,"ty_FR-WF":59,"tx_FR-PF":311,"ty_FR-PF":203,"tx_FR-PF-2":297,"ty_FR-PF-2":122,"tx_FR-NC":313,"ty_FR-NC":-13,"tx_FR-TF":0,"ty_FR-TF":250}
```

## The Fix

Modified `serializeState()` in `src/composables/useUrlState.ts` to:

1. **Get atlas-specific defaults** before serialization
2. **Compare territory settings** against these defaults (not absolute zeros/ones)
3. **Only serialize differences** from atlas defaults

### Code Changes

```typescript
// Added import
import { TerritoryDefaultsService } from '@/services/atlas/territory-defaults-service'

// Modified serializeState() to get atlas defaults
const atlasService = configStore.atlasService
const territories = atlasService.getAllTerritories()
const defaults = TerritoryDefaultsService.initializeAll(
  territories,
  configStore.selectedProjection || 'mercator',
)

// Compare against atlas defaults, not absolute defaults
for (const [code, scale] of Object.entries(territoryStore.territoryScales)) {
  const defaultScale = defaults.scales[code] ?? 1
  if (scale !== defaultScale) {  // Changed from: scale !== 1
    territorySettings[`s_${code}`] = scale
    hasSettings = true
  }
}

for (const [code, translation] of Object.entries(territoryStore.territoryTranslations)) {
  const defaultTranslation = defaults.translations[code] ?? { x: 0, y: 0 }
  if (translation.x !== defaultTranslation.x || translation.y !== defaultTranslation.y) {
    territorySettings[`tx_${code}`] = translation.x
    territorySettings[`ty_${code}`] = translation.y
    hasSettings = true
  }
}
```

## Results

### Before Fix
- URL for France with defaults: **~800 characters**
- Included 36 unnecessary parameters
- Risk of exceeding browser URL limits

### After Fix
- URL for France with defaults: **~150 characters**
- Only includes `atlas`, `view`, `projection`, `projMode`, `territory`
- Territory settings (`t` parameter) only included when user customizes
- Much cleaner, shareable URLs

**Example of fixed URL:**
```
?atlas=france&view=composite-custom&projection=azimuthal-equal-area&projMode=individual&territory=all
```

## Testing

### Comprehensive Test Suite Added

Created `src/composables/__tests__/useUrlState.spec.ts` with 17 tests covering:

1. **Basic serialization** - Verify correct parameters are included
2. **Atlas-specific defaults** - Ensure defaults aren't serialized
3. **Custom settings** - Verify changes ARE serialized
4. **Deserialization** - State restoration from URL
5. **Round-trip** - Serialize → deserialize maintains state
6. **Edge cases** - Malformed data, partial configs

### Test Results

```
✓ 17 tests in useUrlState.spec.ts
✓ All 268 tests pass across the project
✓ No regressions introduced
```

## Manual Validation Checklist

To fully validate the fix, test these scenarios:

- [ ] **France default state**: Copy shareable URL, verify no `t` parameter
- [ ] **France with custom territory**: Adjust one territory scale/position, verify only that territory in URL
- [ ] **Portugal/Spain/EU**: Test with different atlases
- [ ] **Complex customization**: Adjust multiple territories, verify all changes preserved
- [ ] **URL restoration**: Copy URL → paste in new tab → verify exact state restored
- [ ] **URL length**: With maximum customizations, URL stays under 2048 characters

## Benefits

1. **Shorter URLs**: Dramatically reduced URL length for default configs
2. **Better UX**: Cleaner, more shareable links
3. **No data loss**: Defaults restored automatically by atlas initialization
4. **Scalability**: Can support more territories without URL bloat
5. **Browser compatibility**: Stays well under URL length limits

## Technical Details

### Atlas Configuration System

Atlases define territory defaults in their JSON config files:

```json
{
  "territories": [
    {
      "code": "FR-GP",
      "name": "Guadeloupe",
      "scale": 1.4,
      "translate": [-324, -38]
    }
  ]
}
```

These defaults are loaded by `TerritoryDefaultsService` and applied on atlas initialization. The URL state system now respects these defaults.

### State Flow

1. **On page load**: Atlas loads → territories initialized with defaults
2. **User customizes**: Territory store values change
3. **Share URL**: Only customizations serialized (not defaults)
4. **URL opened**: Atlas loads → defaults applied → customizations overlay
5. **Result**: Exact same state as original

## Related Files

- `src/composables/useUrlState.ts` - Main fix
- `src/composables/__tests__/useUrlState.spec.ts` - New test suite
- `src/services/atlas/territory-defaults-service.ts` - Default value provider
- `src/stores/territory.ts` - Territory state management
- `src/components/ui/actions/ShareButton.vue` - UI component

## Conclusion

The shareable URLs feature was fully implemented but had a critical bug in the serialization logic. By comparing against atlas-specific defaults instead of absolute defaults, URLs are now much shorter, more shareable, and fully functional. The feature is ready for user validation.
