# Unified Configuration System

This directory contains unified JSON configurations that serve as the **single source of truth** for all geographic regions.

## Quick Start

```bash
# 1. Create or edit a unified config
vim configs/portugal.json

# 2. Generate geographic data
npm run geodata:prepare portugal

# 3. Validate
npm run geodata:validate portugal

# That's it! No code generation needed - configs are imported directly.
```

## Structure

```
configs/
├── schema.json        # JSON Schema for validation
├── portugal.json      # Portugal configuration
├── france.json        # France configuration  
├── spain.json         # Spain configuration
└── README.md         # This file
```

## Benefits

### Single Source of Truth
- ✅ One JSON file per region
- ✅ Directly imported in backend + frontend (no code generation!)
- ✅ Always consistent
- ✅ Type-safe with JSON schema
- ✅ Simple runtime transformations

### Before → After
| Task | Old Way | New Way |
|------|---------|---------|
| **Files to maintain** | 3 separate files | 1 JSON + 2 simple adapters |
| **Duplication** | High | None |
| **Code generation** | Required | None! |
| **Sync issues** | Common | Impossible |
| **Time per country** | 30-60 min | 30 sec |

## Configuration Format

See [UNIFIED_CONFIG_GUIDE.md](../.github/UNIFIED_CONFIG_GUIDE.md) for complete documentation.

### Minimal Example

```json
{
  "$schema": "./schema.json",
  "id": "portugal",
  "name": "Portugal",
  "territories": [
    {
      "id": "620",
      "code": "PT-CONT",
      "name": "Portugal Continental",
      "role": "mainland",
      "bounds": [[-9.5, 37.0], [-6.2, 42.2]],
      "center": [-8.0, 39.5],
      "extraction": { "mainlandPolygon": 1 },
      "rendering": { "offset": [0, 0] }
    }
  ]
}
```

## Available Commands

```bash
# Analyze Natural Earth data
npm run geodata:analyze 620

# Generate configs from JSON
npm run geodata:generate portugal
npm run geodata:generate --all

# Generate geographic data
npm run geodata:prepare portugal

# Validate everything
npm run geodata:validate portugal
npm run geodata:validate --all
```

## Workflow

### Adding a New Country

1. **Analyze**
   ```bash
   npm run geodata:analyze <natural-earth-id>
   ```

2. **Create JSON config** using analyzer output
   ```bash
   cp configs/portugal.json configs/spain.json
   # Edit configs/spain.json
   ```

3. **Generate all files**
   ```bash
   npm run geodata:generate spain
   npm run geodata:prepare spain
   ```

4. **Validate**
   ```bash
   npm run geodata:validate spain
   ```

### Updating Existing Country

1. **Edit JSON config**
   ```bash
   vim configs/portugal.json
   ```

2. **Regenerate**
   ```bash
   npm run geodata:generate portugal
   npm run geodata:prepare portugal
   ```

3. **Validate**
   ```bash
   npm run geodata:validate portugal
   ```

## Generated Files

From `configs/portugal.json`, the generator creates:

- **Backend config**: `scripts/configs/portugal.js`
  - Extraction rules
  - Territory metadata
  - Natural Earth ID mapping

- **Frontend data**: `src/data/territories/portugal.data.ts`
  - Territory definitions
  - Geographic metadata
  - TypeScript exports

- **Frontend config**: `src/config/regions/portugal.config.ts`
  - Projection parameters
  - UI modes and groups
  - Rendering configuration

All generated files include:
```typescript
/**
 * Auto-generated from configs/portugal.json
 * DO NOT EDIT - Use 'npm run geodata:generate portugal' to regenerate
 */
```

## JSON Schema Validation

VS Code provides:
- ✅ Auto-completion
- ✅ Inline validation
- ✅ Documentation tooltips
- ✅ Error detection

The schema is at `configs/schema.json`.

## Documentation

- [UNIFIED_CONFIG_GUIDE.md](../.github/UNIFIED_CONFIG_GUIDE.md) - Complete guide
- [GEODATA_QUICKSTART.md](../.github/GEODATA_QUICKSTART.md) - Quick intro
- [scripts/README.md](../scripts/README.md) - Tool documentation

## Migration from Old Format

See [UNIFIED_CONFIG_GUIDE.md](../.github/UNIFIED_CONFIG_GUIDE.md#migration-guide) for migration instructions.

## Best Practices

1. **Always use analyzer first**
   ```bash
   npm run geodata:analyze 620
   ```

2. **Edit JSON, not generated files**
   - Generated files are overwritten
   - JSON is the source of truth

3. **Validate after changes**
   ```bash
   npm run geodata:validate portugal
   ```

4. **Use semantic naming**
   - IDs: `"620"`, `"620-20"` (Natural Earth ID + index)
   - Codes: `"PT-CONT"`, `"PT-20"` (ISO + identifier)

5. **Commit both JSON and generated files**
   - JSON: Source of truth
   - Generated: For reproducibility
