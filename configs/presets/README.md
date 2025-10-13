# Atlas Composer Presets

This directory contains preset composite projection configurations for Atlas composer.

## What are Presets?

Presets are pre-configured composite projection layouts that provide high-quality default positioning for territories in an atlas. They use the same format as exported configurations (`ExportedCompositeConfig`) and can be loaded automatically when an atlas is initialized.

## File Format

Presets use JSON format and must conform to the schema defined in `schema.json`. Each preset file contains:

- **version**: Format version (currently "1.0")
- **metadata**: Information about the atlas and export
- **pattern**: Composite pattern type ("single-focus" or "equal-members")
- **referenceScale**: Base scale for the composite projection
- **territories**: Array of territory configurations with projections, parameters, and layout

## Creating a Preset

There are two ways to create a preset:

### Method 1: Export from the Application (Recommended)

1. Open Atlas composer and select the atlas you want to create a preset for
2. Switch to "composite-custom" view mode
3. Adjust territory positions, projections, and scales to your preference
4. Click the "Export Configuration" button
5. Save the exported JSON file to this directory with the naming convention `{atlas-id}-{variant}.json`

### Method 2: Manual Creation

1. Copy an existing preset file or use the schema as reference
2. Fill in the metadata section with appropriate values
3. Define each territory's projection, parameters, and layout
4. Validate against `schema.json` before committing

## Naming Convention

Preset files should follow this naming pattern:

```
{atlas-id}-{variant}.json
```

Examples:
- `france-default.json` - Default preset for France atlas
- `portugal-default.json` - Default preset for Portugal atlas
- `spain-default.json` - Default preset for Spain atlas
- `eu-compact.json` - Compact layout variant for EU atlas
- `world-equidistant.json` - Equidistant projection variant for World atlas

## Using Presets

Presets are referenced in atlas configuration files (`configs/*.json`) via two fields:

```json
{
  "defaultPreset": "france-default",
  "availablePresets": ["france-default", "france-compact"]
}
```

- **defaultPreset**: Preset loaded automatically when the atlas is initialized
- **availablePresets**: List of presets shown in the UI selector (when multiple options exist)

## Validation

Validate a preset file against the schema:

```bash
pnpm geodata:validate {atlas-id}
```

## Guidelines for Quality Presets

1. **Alignment**: Territories should be visually aligned with the mainland
2. **Scale Consistency**: Territory scales should provide clear visibility while maintaining relative size perception
3. **Spacing**: Territories should be spaced appropriately to avoid overlap
4. **Projection Choice**: Use appropriate projections for each territory's geographic characteristics
5. **Metadata**: Include clear notes describing the preset's purpose and characteristics

## Preset Variants

You can create multiple presets for the same atlas to support different use cases:

- **default**: Standard layout optimized for general use
- **compact**: Tighter layout for space-constrained displays
- **expanded**: Larger territories with more detail
- **balanced**: Equal emphasis on all territories
- **geographic**: Closer to geographic positioning

## Contributing

When contributing a new preset:

1. Ensure the preset is validated against the schema
2. Test the preset in the application
3. Document any special characteristics in the metadata notes
4. Follow the naming convention
5. Consider creating multiple variants if appropriate
