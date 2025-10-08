# Backend Configuration Adapter

This directory contains the **generic backend adapter** that transforms unified JSON configurations into the format required by geodata extraction scripts.

## Architecture

```
configs/*.json (unified configs)
    ↓
scripts/configs/adapter.js (transformation)
    ↓
prepare-geodata.js (geodata generation)
```

## Files

- **`adapter.js`** - Generic adapter that transforms unified JSON configs to backend format
  - Handles territory extraction rules
  - Supports `mainlandPolygon`, `extractFrom`, `polygonBounds`, `duplicateFrom`
  - Used by `prepare-geodata.js` and `validate-configs.js`

## How It Works

The adapter eliminates the need for separate backend config files. Instead:

1. **Unified configs** live in `configs/*.json` (single source of truth)
2. **Backend scripts** import JSON directly and transform on-the-fly
3. **No duplication** - backend configs are generated automatically

## Previous Architecture (Deprecated)

Previously, each region required a separate `.js` file in this directory:
- ❌ `portugal.js` (50 lines)
- ❌ `france.js` (92 lines)
- ❌ `eu.js` (43 lines)
- ❌ `spain.js` (...)

Now replaced by:
- ✅ `configs/portugal.json` → `adapter.js` (automatic)
- ✅ `configs/france.json` → `adapter.js` (automatic)
- ✅ `configs/eu.json` → `adapter.js` (automatic)
- ✅ `configs/spain.json` → `adapter.js` (automatic)

## Usage

The adapter is used automatically by backend scripts. You don't need to interact with it directly.

```bash
# Scripts automatically load JSON and apply adapter
node scripts/prepare-geodata.js france
node scripts/validate-configs.js portugal
```

## Creating a New Configuration

1. Create a new file in this directory (e.g., `portugal.js`)
2. Export a configuration object following the structure above
3. Find Natural Earth IDs at: https://github.com/topojson/world-atlas
4. Run the script with your new config name

Example:

```javascript
// scripts/configs/portugal.js
export default {
  name: 'Portugal',
  description: 'Portugal and autonomous regions',
  territories: {
    620: { name: 'Portugal', code: 'PT', iso: 'PRT' },
  },
  outputName: 'portugal-territories',
}
```

Then run:

```bash
node scripts/prepare-geodata.js portugal
```

## Finding Natural Earth IDs

To find the Natural Earth ID for a country:

1. Visit: https://github.com/topojson/world-atlas
2. Or inspect the downloaded world data in `public/data/world-countries-*.json`
3. Look for the `id` property in the country features
4. The ID corresponds to the ISO 3166-1 numeric code

## Notes

- IDs are taken from the Natural Earth dataset
- Some territories may not be available in lower resolutions
- Overseas territories may have separate IDs from their parent countries
