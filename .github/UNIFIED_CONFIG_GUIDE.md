# Unified JSON Configuration System

## Overview

The unified JSON configuration system provides a **single source of truth** for geographic region configurations. Instead of maintaining separate configurations in backend scripts and frontend TypeScript files, you now define everything once in a JSON file and auto-generate the other formats.

## Benefits

### Before (Manual Duplication)
- ❌ Backend config: `scripts/configs/portugal.js`
- ❌ Frontend data: `src/data/territories/portugal.data.ts`
- ❌ Frontend config: `src/config/regions/portugal.config.ts`
- ❌ Manual synchronization required
- ❌ Easy to introduce inconsistencies
- ❌ ~30-60 minutes per country

### After (Unified Config)
- ✅ Single source: `configs/portugal.json`
- ✅ Auto-generate all other files
- ✅ Always in sync
- ✅ Type-safe with JSON schema
- ✅ ~30 seconds per country

## File Structure

```
configs/
  schema.json          # JSON schema for validation
  portugal.json        # Unified config for Portugal
  france.json          # Unified config for France
  spain.json           # etc.
```

## JSON Config Format

```json
{
  "$schema": "./schema.json",
  "id": "portugal",
  "name": "Portugal",
  "description": "Portugal, Madeira, and Azores",

  "metadata": {
    "naturalEarthIds": [620],
    "iso3": "PRT",
    "region": "Europe"
  },

  "projection": {
    "center": { "longitude": -8.0, "latitude": 39.5 },
    "rotate": {
      "mainland": [8.0, 0],
      "azimuthal": [8.0, -39.5]
    },
    "parallels": { "conic": [37, 42] }
  },

  "territories": [
    {
      "id": "620",
      "code": "PT-CONT",
      "name": "Portugal Continental",
      "role": "mainland",
      "bounds": [[-9.5, 37.0], [-6.2, 42.2]],
      "center": [-8.0, 39.5],
      "extraction": {
        "mainlandPolygon": 1
      },
      "rendering": {
        "offset": [0, 0],
        "projectionType": "conic"
      }
    },
    {
      "id": "620-20",
      "code": "PT-20",
      "name": "Madeira",
      "role": "overseas",
      "region": "Atlantic",
      "bounds": [[-17.5, 32.5], [-16.5, 33.0]],
      "center": [-16.9, 32.75],
      "extraction": {
        "extractFrom": "620",
        "polygonIndices": [0]
      },
      "rendering": {
        "offset": [400, -200],
        "projectionType": "mercator"
      }
    }
  ],

  "modes": [
    {
      "id": "mainland-only",
      "label": "Portugal continental uniquement",
      "territories": ["PT-CONT"]
    },
    {
      "id": "all-territories",
      "label": "Toutes les régions autonomes",
      "territories": ["PT-CONT", "PT-20", "PT-30"]
    }
  ],

  "groups": [
    {
      "id": "mainland",
      "label": "Portugal Continental",
      "territories": ["PT-CONT"]
    },
    {
      "id": "atlantic",
      "label": "Régions Autonomes Atlantique",
      "territories": ["PT-20", "PT-30"]
    }
  ]
}
```

## Territory Properties

### Required Properties

- **`id`**: Natural Earth ID (e.g., `"620"`) or compound ID (e.g., `"620-20"`)
- **`code`**: Territory code used in rendering (e.g., `"PT-CONT"`, `"PT-20"`)
- **`name`**: Human-readable name
- **`role`**: One of `"mainland"`, `"overseas"`, `"embedded"`

### Geographic Properties

- **`bounds`**: Bounding box `[[minLon, minLat], [maxLon, maxLat]]`
- **`center`**: Geographic center `[longitude, latitude]`
- **`region`**: Optional sub-region (e.g., `"Atlantic"`, `"Indian Ocean"`)
- **`iso`**: ISO 3166-1 alpha-3 code (e.g., `"PRT"`)

### Extraction Properties

Defines how to extract territory geometry from Natural Earth data:

```json
"extraction": {
  "mainlandPolygon": 1,              // For mainland territories
  "extractFrom": "620",               // Extract from parent territory
  "polygonIndices": [0, 1, 2]        // Which polygons to extract
}
```

### Rendering Properties

Defines how to render the territory:

```json
"rendering": {
  "offset": [400, -200],              // Translation offset [x, y]
  "projectionType": "mercator",       // Projection type
  "scale": 1.0                        // Scale multiplier
}
```

## Workflow

### 1. Analyze Country

Use the analyzer to get polygon information:

```bash
npm run geodata:analyze 620  # Portugal
```

This shows you:
- All polygons with their bounds and areas
- Which polygon is the mainland
- Grouped archipelagos
- **Suggested configuration**

### 2. Create Unified Config

Create `configs/portugal.json` with the suggested structure from the analyzer.

Adjust:
- Territory names and codes
- UI labels for modes and groups
- Projection parameters
- Rendering offsets

### 3. Generate All Configs

```bash
npm run geodata:generate portugal
```

This auto-generates:
- ✅ `scripts/configs/portugal.js` (backend extraction config)
- ✅ `src/data/territories/portugal.data.ts` (frontend data)
- ✅ `src/config/regions/portugal.config.ts` (frontend config)

### 4. Generate Geographic Data

```bash
npm run geodata:prepare portugal
```

This creates:
- ✅ `src/public/data/portugal-territories-50m.json`
- ✅ `src/public/data/portugal-metadata-50m.json`

### 5. Validate

```bash
npm run geodata:validate portugal
```

Checks:
- ✅ All configs exist
- ✅ Territory codes match
- ✅ No inconsistencies

## Complete Example

Adding a new country (Spain):

```bash
# 1. Analyze
npm run geodata:analyze 724

# 2. Create configs/spain.json based on analyzer output
# (edit the file manually)

# 3. Generate all config files
npm run geodata:generate spain

# 4. Generate geographic data
npm run geodata:prepare spain

# 5. Validate everything
npm run geodata:validate spain

# Total time: ~30 seconds (was 30-60 minutes)
```

## Updating Existing Configs

To update an existing configuration:

1. Edit the unified JSON config (`configs/portugal.json`)
2. Regenerate all files: `npm run geodata:generate portugal`
3. Regenerate geographic data: `npm run geodata:prepare portugal`
4. Validate: `npm run geodata:validate portugal`

**Note**: Generated files include a warning:
```typescript
/**
 * Auto-generated from configs/portugal.json
 * DO NOT EDIT - Use 'npm run geodata:generate portugal' to regenerate
 */
```

## JSON Schema

The `configs/schema.json` file provides:
- ✅ Type validation in VS Code
- ✅ Auto-completion
- ✅ Inline documentation
- ✅ Error detection

VS Code will automatically validate your JSON configs and show errors inline.

## Migration Guide

To migrate an existing country from the old format:

1. **Extract information** from existing files:
   - Backend: `scripts/configs/portugal.js`
   - Frontend data: `src/data/territories/portugal.data.ts`
   - Frontend config: `src/config/regions/portugal.config.ts`

2. **Create unified config** `configs/portugal.json`:
   - Use analyzer output as base
   - Copy territory names, codes, bounds from old configs
   - Copy projection params from frontend config
   - Copy modes and groups from frontend config

3. **Generate and compare**:
   ```bash
   npm run geodata:generate portugal
   ```

4. **Test** that generated files match the originals functionally

5. **Delete old manual configs** (optional - they're now auto-generated)

## Advanced Features

### Compound Territory IDs

For territories extracted from parent MultiPolygons:
```json
{
  "id": "620-20", // Compound ID
  "extraction": {
    "extractFrom": "620", // Parent territory
    "polygonIndices": [0] // Extract polygon 0 from parent
  }
}
```

### Multiple Projections

For territories rendered with different projections (e.g., French Polynesia):
```json
{
  "id": "258",
  "code": "FR-PF",
  "rendering": {
    "projectionType": "mercator",
    "offset": [322, 210]
  }
},
{
  "id": "258-2",
  "code": "FR-PF-2",
  "extraction": {
    "duplicateFrom": "258"  // Use same geometry, different rendering
  },
  "rendering": {
    "projectionType": "mercator",
    "offset": [308, 126],
    "scale": 0.12            // Much smaller scale
  }
}
```

### Territory Roles

- **`mainland`**: Primary territory (only one per region)
- **`overseas`**: Overseas territory or department
- **`embedded`**: Territory embedded in parent's MultiPolygon

## Best Practices

1. **Always use the analyzer first** - Don't guess polygon indices
2. **Use semantic IDs** - `"id": "620-20"` (Natural Earth ID + index)
3. **Use ISO codes** - `"code": "PT-20"` (2-letter + identifier)
4. **Document regions** - Use `"region"` field for geographic grouping
5. **Test after changes** - Run validator and check rendering
6. **Keep modes simple** - Start with mainland-only and all-territories
7. **Group logically** - Group by ocean/region for UI organization

## Troubleshooting

### "Config not found"
Create `configs/<country>.json` first.

### "No mainland territory found"
Add exactly one territory with `"role": "mainland"`.

### "Territories don't match"
Territory codes in generated files don't match the JSON config.
Check for typos in territory codes.

### "Validation failed"
VS Code shows JSON schema errors.
Fix the reported issues in the JSON file.

## See Also

- [GEODATA_QUICKSTART.md](./GEODATA_QUICKSTART.md) - Quick introduction
- [GEODATA_IMPROVEMENT_PROPOSAL.md](./GEODATA_IMPROVEMENT_PROPOSAL.md) - Full vision (Phases 1-4)
- [scripts/README.md](../scripts/README.md) - Tool documentation
