# Projection Parameter Controls Implementation

## Overview
Added interactive controls for adjusting projection parameters in world/unified atlas views. Users can now customize rotation, center, and parallel parameters using sliders similar to the territory controls.

## Implementation Details

### 1. Store Infrastructure (`src/stores/config.ts`)

Added state management for custom projection parameters:

**State Variables:**
- `customRotateLongitude`: Override for rotation longitude (-180 to 180°)
- `customRotateLatitude`: Override for rotation latitude (-90 to 90°)
- `customCenterLongitude`: Override for center longitude (-180 to 180°)
- `customCenterLatitude`: Override for center latitude (-90 to 90°)
- `customParallel1`: Override for standard parallel 1 (0 to 90°)
- `customParallel2`: Override for standard parallel 2 (0 to 90°)

All parameters default to `null` which means "use atlas defaults".

**Computed Property:**
- `effectiveProjectionParams`: Merges custom parameter overrides with atlas defaults
  - Returns complete `ProjectionParams` structure
  - Uses null coalescing: custom value ?? atlas default
  - Automatically reactive when custom params change

**Action Functions:**
- `setCustomRotate(longitude, latitude)`: Updates rotation parameters
- `setCustomCenter(longitude, latitude)`: Updates center coordinates
- `setCustomParallels(parallel1, parallel2)`: Updates standard parallels
- `resetProjectionParams()`: Resets all custom parameters to null

### 2. Rendering Integration (`src/stores/geoData.ts`)

Updated line 71 to use custom parameters:

**Before:**
```typescript
const projectionParams = configStore.atlasService?.getProjectionParams()
```

**After:**
```typescript
const projectionParams = configStore.effectiveProjectionParams
```

This ensures custom projection parameters flow through to the `CartographerService` for rendering.

### 3. UI Component (`src/components/ui/ProjectionParamsControls.vue`)

Created new component with sliders for all projection parameters:

**Features:**
- Six range sliders for all projection parameters
- Real-time value display with degree symbols
- Visual range indicators (min/mid/max labels)
- Reset button (only shown when custom params are set)
- Info alert explaining parameter overrides
- Type-safe handling of rotate parameter arrays

**Parameter Ranges:**
- Rotate Longitude: -180° to 180° (step: 1°)
- Rotate Latitude: -90° to 90° (step: 1°)
- Center Longitude: -180° to 180° (step: 1°)
- Center Latitude: -90° to 90° (step: 1°)
- Parallel 1: 0° to 90° (step: 1°)
- Parallel 2: 0° to 90° (step: 1°)

**Styling:**
- Follows daisyUI patterns (range-primary, range-xs)
- RemixIcon icons for visual clarity
- Compact layout with proper spacing

### 4. Integration in MapView (`src/views/MapView.vue`)

Added projection parameter controls to settings section:

**Location:** After sphere outline toggle, before composition borders toggle
**Visibility:** Only shown when `viewMode === 'unified'`
**Layout:** Wrapped in divider section for visual separation

### 5. Internationalization

Added translations in both English and French:

**English (`src/i18n/locales/en.json`):**
```json
"projectionParams": {
  "title": "Projection Parameters",
  "rotateLongitude": "Rotate Longitude",
  "rotateLatitude": "Rotate Latitude",
  "centerLongitude": "Center Longitude",
  "centerLatitude": "Center Latitude",
  "parallel1": "Standard Parallel 1",
  "parallel2": "Standard Parallel 2",
  "reset": "Reset",
  "info": "Adjust projection parameters to customize the view. These controls override the default atlas settings."
}
```

**French (`src/i18n/locales/fr.json`):**
```json
"projectionParams": {
  "title": "Paramètres de projection",
  "rotateLongitude": "Rotation longitude",
  "rotateLatitude": "Rotation latitude",
  "centerLongitude": "Centre longitude",
  "centerLatitude": "Centre latitude",
  "parallel1": "Parallèle standard 1",
  "parallel2": "Parallèle standard 2",
  "reset": "Réinitialiser",
  "info": "Ajustez les paramètres de projection pour personnaliser la vue. Ces contrôles remplacent les paramètres par défaut de l'atlas."
}
```

## Usage

### For Users

1. Select "World" atlas or any atlas in "Unified" view mode
2. Scroll to the "Projection Parameters" section in the settings panel
3. Adjust sliders to rotate, center, or change parallels
4. Changes apply immediately to the map
5. Click "Reset" to restore atlas defaults

### For Developers

**Accessing Custom Parameters:**
```typescript
const configStore = useConfigStore()

// Read individual parameters
const rotateLon = configStore.customRotateLongitude // number | null
const rotateLat = configStore.customRotateLatitude // number | null

// Get effective parameters (with defaults)
const params = configStore.effectiveProjectionParams // ProjectionParams

// Set custom parameters
configStore.setCustomRotate(-10, 45)
configStore.setCustomCenter(0, 20)
configStore.setCustomParallels(30, 60)

// Reset to defaults
configStore.resetProjectionParams()
```

**Parameter Structure:**
```typescript
interface ProjectionParams {
  center?: {
    longitude: number
    latitude: number
  }
  rotate?: {
    mainland: number | [number, number]
    azimuthal: number | [number, number]
  }
  parallels?: {
    conic: [number, number]
  }
}
```

## Benefits

1. **Experimentation**: Users can explore different projection perspectives interactively
2. **Custom Views**: Create specialized views for specific regions or purposes
3. **Educational**: Helps understand how projection parameters affect visualization
4. **Flexibility**: Override defaults without modifying atlas configuration files
5. **Reversible**: Easy reset to original settings

## Technical Notes

### Type Safety
- All parameters properly typed with TypeScript
- Handles both number and [number, number] rotate formats
- Null coalescing ensures fallback to defaults

### Reactivity
- Store uses Vue's `ref()` for reactive parameters
- Computed `effectiveProjectionParams` updates automatically
- UI sliders bound with `v-model` pattern
- Changes propagate immediately to rendering

### Performance
- No performance impact when custom params are null
- Minimal overhead when active (simple object spread)
- No unnecessary re-renders (computed caching)

### Future Enhancements

Possible improvements:
1. **Projection-specific visibility**: Show only relevant params for current projection type
   - Hide parallels for non-conic projections
   - Show azimuthal-specific controls for azimuthal projections
2. **Preset positions**: Quick buttons for common orientations (Pacific-centered, etc.)
3. **Animation**: Smooth transitions between parameter values
4. **URL parameters**: Persist custom params in URL for sharing
5. **Copy/paste**: Share parameter configurations as JSON
6. **Fine-tuning**: Add decimal step option for precise adjustments

## Files Modified

- `src/stores/config.ts`: Added custom parameter state and actions
- `src/stores/geoData.ts`: Updated to use effectiveProjectionParams
- `src/components/ui/ProjectionParamsControls.vue`: New component (created)
- `src/views/MapView.vue`: Added component integration
- `src/i18n/locales/en.json`: Added English translations
- `src/i18n/locales/fr.json`: Added French translations

## Testing

**Build Status:** ✅ Success
- TypeScript compilation: No errors
- Vite build: 625.92 kB (gzipped: 202.68 kB)
- ESLint: No warnings or errors

**Functionality to Test:**
- [ ] Sliders adjust projection in real-time
- [ ] Reset button restores atlas defaults
- [ ] Controls only visible in unified mode
- [ ] Values display correctly with degree symbols
- [ ] Custom parameters persist during atlas changes
- [ ] Reset clears all custom parameters
- [ ] Translations work in both English and French

## Related Features

- **Sphere Outline**: Works in conjunction with projection parameters
- **Territory Controls**: Similar UI pattern for consistency
- **Projection Selector**: Complementary control for projection type selection
- **View Mode**: Controls only active in unified mode
