# Magic Values Centralization - Cleanup Summary

## Overview
All hardcoded values (territory codes, names, projection parameters, UI ranges, etc.) have been centralized into `src/constants/territories.ts`.

## Changes Made

### 1. Enhanced `src/constants/territories.ts`
Added comprehensive constants for all magic values across the application:

#### New Constants Added:
- **`TERRITORY_MODES`**: Territory mode definitions with codes for each mode
  - `metropole-only`, `metropole-major`, `metropole-uncommon`, `all-territories`
  - Includes human-readable labels and territory code arrays

- **`TERRITORY_LIST`**: Full list of territories with codes and names for UI display

- **`FRANCE_PROJECTION_PARAMS`**: Geographic projection parameters
  - Center coordinates: `longitude: 2.5, latitude: 46.5`
  - Rotation for mainland: `[-2, 0]`
  - Rotation for azimuthal: `[-2, -46.5]`
  - Conic parallels: `[44, 49]`

- **`TRANSLATION_RANGES`**: UI slider ranges for territory positioning
  - X: min -600, max 600, step 10
  - Y: min -400, max 400, step 10

- **`SCALE_RANGE`**: UI slider range for territory scaling
  - min: 0.5, max: 2.0, step: 0.1, default: 1.0

- **`DEFAULT_TERRITORY_TRANSLATIONS`**: Default reset values
  - Automatically derived from territory offset values

- **`TERRITORY_VAR_NAMES`**: JavaScript variable name mappings
  - For code generation in projection exporter

#### Enhanced Territory Configs:
- Added `clipExtent` property to all overseas territories
- Each territory now has complete configuration for composite projections

#### New Helper Functions:
- `getTerritoriesForMode(mode)`: Returns territory codes for a given mode
- `getTerritoryVarName(code)`: Returns JS variable name for a territory

### 2. Updated `src/stores/config.ts`
- **Removed**: Local `TerritoryMode` type definition
- **Added**: Import of `TerritoryMode` from centralized constants
- Territory translations and scales now initialized from `ALL_TERRITORIES`
- Cleaner, more maintainable code

### 3. Updated `src/stores/geoData.ts`
- **Removed**: Hardcoded territory code arrays in `filteredTerritories` computed property
- **Added**: Uses `getTerritoriesForMode()` function
- Switch statement replaced with single filter using centralized codes
- Much simpler and more maintainable

### 4. Updated `src/components/TerritoryControls.vue`
- **Removed**: Hardcoded `allTerritories` array with names
- **Removed**: Hardcoded territory codes in switch statement
- **Removed**: Hardcoded default translations in `resetToDefaults()`
- **Removed**: Hardcoded slider ranges (min/max/step values)
- **Added**: Uses `TERRITORY_LIST`, `getTerritoriesForMode()`, `TRANSLATION_RANGES`, `SCALE_RANGE`, `DEFAULT_TERRITORY_TRANSLATIONS`
- All sliders now use constants for min/max/step values
- Reset function uses centralized default values

### 5. Updated `src/utils/projectionExporter.ts`
- **Removed**: Local `TERRITORY_CENTERS` constant
- **Removed**: Local `TERRITORY_CLIP_EXTENTS` constant
- **Removed**: Local `TERRITORY_NAMES` constant
- **Removed**: Local `getTerritoryVarName` function
- **Added**: Imports from centralized constants
- Uses `getTerritoryConfig()` to get territory metadata
- Uses `getTerritoryVarName()` from constants

### 6. Updated `src/services/GeoProjectionService.ts`
- **Removed**: Hardcoded rotation values `[-2, 0]` and `[-2, -46.5]`
- **Removed**: Hardcoded parallels `[44, 49]`
- **Added**: Uses `FRANCE_PROJECTION_PARAMS` for all projection parameters
- All conic projections now use `FRANCE_PROJECTION_PARAMS.parallels.conic`
- All mainland rotations use `FRANCE_PROJECTION_PARAMS.rotate.mainland`
- All azimuthal rotations use `FRANCE_PROJECTION_PARAMS.rotate.azimuthal`

### 7. Updated `src/services/GeoDataService.ts`
- **Removed**: Hardcoded territory code arrays in `getRawUnifiedData()` method
- **Removed**: Switch statement with duplicate territory lists
- **Removed**: Hardcoded territory names in `extractDOMTOMFromMetropole()`
- **Removed**: Local `getTerritoryRegion()` method with hardcoded region mappings
- **Added**: Uses `getTerritoriesForMode()` function
- **Added**: Uses `getTerritoryName()` for territory names
- **Added**: Uses `getTerritoryRegion()` from centralized constants
- Much cleaner implementation with single filter

### 8. Updated `src/stores/config.ts`
- **Removed**: Hardcoded `territoryProjections` initialization with 11 territory codes
- **Added**: Dynamic initialization from `OVERSEAS_TERRITORIES` using `projectionType` or `DEFAULT_PROJECTION_TYPES.OVERSEAS`
- Projection types now properly derived from territory configuration

## Benefits

### 1. Single Source of Truth
All territory-related constants are now in one place: `src/constants/territories.ts`

### 2. Easier Maintenance
- Adding a new territory: Update one file
- Changing territory parameters: Update one file
- Changing UI ranges: Update one file

### 3. Type Safety
- `TerritoryMode` type is now exported and reused
- Consistent typing across the application

### 4. Reduced Code Duplication
- Territory lists were duplicated across 5+ files
- Now centralized with single definition

### 5. Better Consistency
- Projection parameters are consistent across all services
- Territory names are consistent everywhere
- UI ranges are consistent in all components

## Files Modified

1. ✅ `src/constants/territories.ts` - Enhanced with new constants including regions
2. ✅ `src/stores/config.ts` - Uses centralized TerritoryMode, constants, and dynamic projection init
3. ✅ `src/stores/geoData.ts` - Uses getTerritoriesForMode()
4. ✅ `src/components/TerritoryControls.vue` - Uses all UI constants
5. ✅ `src/utils/projectionExporter.ts` - Uses centralized territory configs
6. ✅ `src/services/GeoProjectionService.ts` - Uses FRANCE_PROJECTION_PARAMS
7. ✅ `src/services/GeoDataService.ts` - Uses centralized functions including getTerritoryRegion()

## Testing Recommendations

1. **Territory Mode Switching**: Verify all territory modes work correctly
2. **Projection Parameters**: Check all projection types render correctly
3. **Territory Controls**: Test translation/scale sliders with new ranges
4. **Reset Functionality**: Verify reset button restores correct defaults
5. **Code Export**: Test projection code generation with new variable names

## Future Improvements

Potential areas for further centralization:
- View mode configurations
- Projection type definitions and categories
- Map rendering parameters (colors, stroke widths, etc.)
- Error messages and user-facing strings

## Migration Notes

No breaking changes to public APIs or user data. All changes are internal refactoring.
The application behavior remains identical, with improved maintainability.
