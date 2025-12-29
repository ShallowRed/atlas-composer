# Quick Guide: Adding a New Atlas to Atlas composer

## Essential Instructions for LLMs

When adding a new atlas to Atlas composer, follow these steps in order:

### Step 1: Research Natural Earth Data

Run lookup to find the country ID:
```bash
pnpm geodata:lookup "CountryName"
```

Get the Natural Earth ID from output (e.g., "ID 528" for Netherlands).

Run analyze to get polygon structure:
```bash
pnpm geodata:analyze <id>
```

Note:
- Polygon indices (zero-based: 0, 1, 2, ...)
- Which polygon is mainland (largest, marked as MAINLAND)
- Which polygons are overseas territories

### Step 2: Create Atlas Configuration

Create `configs/atlases/<atlas-id>.json` with this structure:

```json
{
  "$schema": "../schemas/atlas.schema.json",
  "id": "your-atlas-id",
  "name": {
    "en": "Atlas Name",
    "fr": "Nom de l'atlas"
  },
  "dataSources": {
    "territories": "your-atlas-territories-50m.json",
    "metadata": "your-atlas-metadata-50m.json"
  },
  "pattern": "single-focus",
  "territories": [
    {
      "id": "123",
      "code": "XY-CODE",
      "name": { "en": "Territory Name" },
      "role": "primary"
    }
  ]
}
```

See [configs/schemas/atlas.schema.json](../configs/schemas/atlas.schema.json) for full schema definition.

### Step 2b: Register Atlas

Add atlas entry to `configs/atlas-registry.json`:

```json
{
  "id": "your-atlas-id",
  "name": { "en": "Atlas Name" },
  "group": "country",
  "sortOrder": 10,
  "configPath": "./atlases/your-atlas-id.json",
  "presets": []
}
```

### Step 3: Generate Geodata

```bash
pnpm geodata:prepare <atlas-id>
```

This creates:
- `src/public/data/<atlas>-territories-50m.json`
- `src/public/data/<atlas>-metadata-50m.json`

### Step 4: Validate

```bash
pnpm geodata:validate <atlas-id>
```

Must show "✓ VALID" before proceeding.

### Step 5: Create Presets (Optional)

Presets provide pre-configured projection settings for different view modes.

#### Preset Types

1. **composite-custom** - Full custom composite configuration with per-territory layout
   - Schema: [configs/schemas/preset-composite-custom.schema.json](../configs/schemas/preset-composite-custom.schema.json)
   - Example: `configs/presets/france-default.json`

2. **unified** - Single projection for entire atlas
   - Schema: [configs/schemas/preset-unified.schema.json](../configs/schemas/preset-unified.schema.json)
   - Example: `configs/presets/france-unified.json`

3. **split** - Individual projections per territory
   - Schema: [configs/schemas/preset-split.schema.json](../configs/schemas/preset-split.schema.json)
   - Example: `configs/presets/france-split.json`

4. **built-in-composite** - Uses d3-composite-projections library
   - Schema: [configs/schemas/preset-built-in-composite.schema.json](../configs/schemas/preset-built-in-composite.schema.json)
   - Example: `configs/presets/france-built-in-composite.json`

#### Creating a Preset

1. Create preset file in `configs/presets/<atlas-id>-<preset-name>.json` (or organize in subdirectories like `configs/presets/<atlas-id>/<preset-name>.json`)
2. Add appropriate `$schema` reference
3. Register preset in `configs/atlas-registry.json` under the atlas's `presets` array with `configPath` field pointing to the preset file

Example unified preset:
```json
{
  "$schema": "../schemas/preset-unified.schema.json",
  "id": "atlas-unified-default",
  "name": { "en": "Unified View" },
  "atlasId": "your-atlas-id",
  "type": "unified",
  "config": {
    "projection": {
      "id": "natural-earth",
      "parameters": {
        "center": [0, 45],
        "scale": 1.0
      }
    }
  }
}
```

### Step 6: Test

```bash
pnpm dev
```

Check:
- Atlas appears in dropdown
- All territories render
- All view modes work
- Projections show correctly
- Presets load and apply correctly

## Key Field Reference

### Territory Extraction Methods

**Primary territory only (removes other polygons):**
```json
"extraction": {
  "mainlandPolygon": 0
}
```

**Extract polygon(s) by index (RECOMMENDED):**
```json
"extraction": {
  "extractFrom": "528",
  "polygonIndices": [1]
}
```

**Extract multiple polygons (archipelago):**
```json
"extraction": {
  "extractFrom": "528",
  "polygonIndices": [5, 6, 7, 8]
}
```

**Extract by bounds (alternative):**
```json
"extraction": {
  "extractFrom": "528",
  "polygonBounds": [[-69.99, 12.41], [-69.84, 12.63]]
}
```

### Atlas Patterns

- `single-focus` - 1 primary + N secondary territories (France, Portugal, Netherlands, USA)
- `equal-members` - N equal territories (EU, World, ASEAN)
- `hierarchical` - Complex multi-level structures (future use)

### Territory Roles

- `primary` - Main territory (for single-focus atlases)
- `secondary` - Distant/remote territory (for single-focus atlases)
- `member` - Equal member territory (for equal-members atlases like EU, world)
- `embedded` - Enclave/exclave within another territory

### Projection Preferences by Region

- **60°+** (Polar): `azimuthal-equal-area`, `stereographic`
- **30°-60°** (Mid-latitude): `conic-conformal`, `albers`, `conic-equal-area`
- **±30°** (Equatorial): `mercator`, `equirectangular`
- **Global**: `natural-earth`, `robinson`, `mollweide`

### Common Issues

**Territory missing from data:**
- Wrong polygon index → Re-run `geodata:analyze`
- Use exact index from analyze output

**Territory count mismatch:**
- Check `geodata:prepare` console output for errors
- Verify `polygonIndices` is array: `[1]` not `1`

**Atlas not appearing:**
- JSON syntax error → Validate: `cat config.json | python -m json.tool`

**Wrong projections shown:**
- Update `projectionPreferences.recommended`
- Add other atlas composites to `prohibited`

## Critical Rules

✅ DO:
- Use `pnpm geodata:analyze` for polygon indices
- Use zero-based indices (0, 1, 2, ...)
- Add other atlas composites to `prohibited` list
- Use `polygonIndices` (plural, array)
- Validate after every change
- Use `primary` role for single-focus primary territory
- Use `member` role for equal-members atlases (EU, world)

❌ DON'T:
- Guess polygon indices
- Use `polygonIndex` (singular)
- Forget validation step
- Use old role names (`mainland`, `overseas`, `member-state`)
- Mix `primary`/`secondary` with `member` roles
- Edit generated TopoJSON files manually

## Schema Reference

All configuration schemas are located in `configs/schemas/`:

- **atlas.schema.json** - Atlas configuration schema
- **atlas-registry.schema.json** - Atlas registry schema
- **preset-composite-custom.schema.json** - Composite-custom preset schema
- **preset-unified.schema.json** - Unified view preset schema
- **preset-split.schema.json** - Split view preset schema
- **preset-built-in-composite.schema.json** - Built-in composite preset schema
- **preset.schema.json** - Unified preset schema (validates any preset type)
- **preset-definitions.schema.json** - Shared type definitions

## Complete Example

See `configs/atlases/france.json` or `configs/atlases/portugal.json` for working atlas examples.
See `configs/presets/france-*.json` for working preset examples.

For full documentation, see:
- docs/atlases.md - Atlas system architecture
- docs/scripts.md - CLI tools reference
- docs/projections.md - Projection system reference
