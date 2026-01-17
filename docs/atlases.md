# Atlas System Quick Reference

## Core Architecture

**Static Registry**: Uses `configs/atlas-registry.json` to define available atlases
**Lazy Loading**: Atlas configurations load on-demand via fetch API, not bundled at build time
**Reactive Loading**: useAtlasLoader composable with VueUse's useAsyncState manages async loading state
**Map-based Cache**: Loaded configs cached in Map<string, LoadedAtlasConfig> for fast subsequent access
**Adapter Pattern**: Transforms JSON → TypeScript configs
**Grouped & Sorted**: Registry controls atlas grouping and display order in UI

## Atlas Loading Flow

1. **App Startup**: Registry metadata loads synchronously, default atlas preloads
2. **User Selection**: Atlas dropdown displays groups and atlases from registry
3. **On Demand**: When user selects atlas, useAtlasLoader initiates fetch
4. **Fetch Config**: registry.loadAtlasAsync() fetches `/configs/{atlas}.json`
5. **Cache**: Loaded config stored in cache, subsequent access returns cached version
6. **Reactive**: currentAtlasConfig ref updates when loading completes
7. **Coordination**: AtlasCoordinator orchestrates store updates and preset loading

## Atlas Registry System

The atlas registry (`configs/atlas-registry.json`) defines all available atlases with metadata, behavior configuration, and inline preset definitions:

### Registry Structure
- **groups**: Group definitions with labels and display order
  - **id**: Group identifier (`country`, `region`, `world`)
  - **label**: Display label (i18n object or string)
  - **sortOrder**: Display order (lower = earlier)
- **atlases**: Atlas entries
  - **id**: Unique atlas identifier (matches config filename)
  - **name**: Display name (i18n object or string)
  - **group**: Group ID for UI grouping
  - **sortOrder**: Display order within group (lower = earlier)
  - **isDefault**: Boolean flag marking default atlas
  - **configPath**: Relative path to atlas JSON config
  - **presets**: Array of preset definitions (inline, not referenced)
    - **id**: Unique preset identifier
    - **name**: Display name (i18n object)
    - **type**: Preset type (`composite-custom`, `unified`, `split`, `built-in-composite`)
    - **isDefault**: Boolean flag marking default preset for this atlas
    - **configPath**: Path to preset configuration file
    - **description**: Preset description (i18n object, optional)
  - **behavior**: Application behavior configuration (optional)
    - **collectionSets**: UI-specific configuration
      - **territoryManager**: Territory manager behavior (composite-custom mode)
        - **collectionSet**: Which collection set to use (`administrative` or `geographic`)
      - **configSection**: Config section behavior (unified/split modes)
        - **collectionSet**: Which collection set to use for territory selector dropdown

The behavior object separates application-level configuration from pure atlas data.
Atlas configs contain only territory data and collections; the registry defines how the application uses them and which presets are available.

Presets are defined inline within their atlas entry, providing single source of truth for atlas metadata and available presets.
Each preset type in the registry defines an available view mode for that atlas.

**View Mode Discovery**: The application queries the registry to determine available view modes:
- `getAvailableViewModes(atlasId)` - Returns unique preset types for the atlas
- `getDefaultViewMode(atlasId)` - Returns type of preset marked with `isDefault: true`

**Typical Configuration**:
- `territoryManager.collectionSet`: 'administrative' (for composite-custom mode territory selection)
- `configSection.collectionSet`: 'administrative' (for unified/split mode territory dropdown)

Atlas configs are loaded lazily via fetch when accessed.
The registry schema validates structure at build time.

## Atlas Groups

Groups are defined in the registry with translatable labels:

| Group ID | Label (EN) | Label (FR) | Sort Order | Atlas Sort Range |
|----------|------------|------------|------------|------------------|
| `country` | Countries | Pays | 1 | 1-99 |
| `region` | Regions & Unions | Régions & Unions | 2 | 100-199 |
| `world` | World | Monde | 3 | 200+ |

Groups display in order defined by their `sortOrder`.
Within each group, atlases sort by their own `sortOrder` value.

## Directory Structure

```
configs/
├── atlas-registry.json        # Registry of available atlases
├── atlas-registry.schema.json # Registry validation schema
├── atlas.schema.json          # Atlas config validation schema
├── france.json                # Atlas configurations (loaded on demand)
├── portugal.json
├── usa.json
├── europe.json
└── world.json

src/core/atlases/
├── loader.ts          # JSON → TypeScript adapter
├── registry.ts        # Registry with loadAtlasAsync() and Map-based cache
├── utils.ts           # Territory helpers
└── constants.ts       # Defaults

src/composables/
└── useAtlasLoader.ts  # Reactive async atlas loading with useAsyncState

src/public/data/
├── {atlas}-territories-{res}.json  # TopoJSON geometries
└── {atlas}-metadata-{res}.json     # Territory metadata
```

## Territory Configuration

All territories in an atlas are treated equally. A composite projection is simply N territories placed on a canvas with individual projection settings. There is no hierarchy or role distinction between territories.

### Territory Entry Structure

```json
{
  "territories": [
    {
      "code": "FR-MET",
      "name": "France Metropolitaine",
      "center": [2.5, 46.5],
      "bounds": [[-6.5, 41], [10, 51]]
    },
    {
      "code": "FR-GP",
      "name": "Guadeloupe",
      "center": [-61.46, 16.14],
      "bounds": [[-61.81, 15.83], [-61, 16.52]]
    }
  ]
}
```

### Required Territory Fields
- `code` - Unique territory identifier (e.g., 'FR-MET', 'PT-20')
- `name` - Display name (string or i18n object)
- `center` - Geographic center [longitude, latitude]
- `bounds` - Bounding box [[minLon, minLat], [maxLon, maxLat]]

### Optional Territory Fields
- `shortName` - Abbreviated name for UI
- `iso` - ISO 3166-1 alpha-3 code
- `region` - Geographic sub-region grouping
- `extraction` - Data extraction configuration

## View Modes

View modes are determined dynamically from registry presets:

| Mode | Description | Determined By |
|------|-------------|---------------|
| `composite-custom` | User-defined layout | Preset with type='composite-custom' exists in registry |
| `built-in-composite` | Pre-built D3 composite | Preset with type='built-in-composite' exists in registry |
| `split` | Separate maps per territory | Preset with type='split' exists in registry |
| `unified` | Single world map | Preset with type='unified' exists in registry |

**Default View Mode**: Determined by the preset marked with `isDefault: true` in the registry entry for the atlas.

## Adding a New Atlas

**Two-step process**: Create atlas config + register in atlas registry

### Step 1: Create Atlas Config File

Create `configs/new-atlas.json`:
```json
{
  "$schema": "./atlas.schema.json",
  "id": "new-atlas",
  "name": "New Atlas Name",
  "category": "country",
  "territories": [
    {
      "id": "250",
      "code": "NA-MET",
      "name": "Territory Name",
      "center": [2.5, 46.5],
      "bounds": [[-5, 41], [10, 51]]
    }
  ]
}
```

### Step 2: Register in Atlas Registry

### Step 2: Register in Atlas Registry

Add entry to `configs/atlas-registry.json` atlases array:
```json
{
  "defaultAtlas": "france",
  "groups": [...],
  "atlases": [
    {
      "id": "new-atlas",
      "name": {
        "en": "New Atlas",
        "fr": "Nouvel Atlas"
      },
      "group": "country",
      "sortOrder": 40,
      "configPath": "./new-atlas.json"
    }
  ]
}
```

**Key Points**:
- `id` must match filename (without `.json`)
- `sortOrder` controls position within group (1-99 for countries, 100-199 for regions, 200+ for world)
- `group` must match a group ID defined in the `groups` array
- Lower `sortOrder` values appear first within their group
- Config loads on-demand via fetch when user selects the atlas
- To set as default: change `defaultAtlas` field in registry

## Minimal Config

```json
```json
{
  "$schema": "./atlas.schema.json",
  "atlasId": "france",
```

## Complete Config Structure

```json
**Example:**
```json
{
  "$schema": "./atlas.schema.json",
  "atlasId": "new-region",
```

## Internationalization (i18n)

All user-facing text fields support both simple strings and i18n objects.

### Resolution Strategy

The loader (`src/core/atlases/loader.ts`) resolves i18n values during config loading:
1. Gets current locale from localStorage or browser (via `getCurrentLocale()`)
2. Resolves all i18n values to strings using `resolveI18nValue()`
3. Creates runtime configs with resolved strings

The resolution utility (`src/core/atlases/i18n-utils.ts`) provides:
- `resolveI18nValue(value, locale)` - Non-composable for services/loaders
- `useResolveI18nValue(value)` - Vue composable for components
- `getCurrentLocale()` - Gets locale from localStorage/browser

### Config Format

**Simple String** (fallback for all languages):
```json
{
  "name": "France",
  "description": "France métropolitaine et territoires d'outre-mer"
}
```

**i18n Object** (multi-language support):
```json
{
  "name": {
    "en": "France",
    "fr": "France"
  },
  "description": {
    "en": "Metropolitan France and overseas territories",
    "fr": "France métropolitaine et territoires d'outre-mer"
  }
}
```

### Supported Fields

- **Atlas level**: `name`, `description`
- **Territory level**: `name`, `shortName`, `region`
- **Modes** (legacy): `label`
- **Territory Modes**: `name`
- **Groups**: `label`

### Resolution Rules

1. If value is a string → return as-is (fallback for all locales)
2. If value is an object → try current locale key
3. If current locale missing → fallback to `en`
4. If `en` missing → return first available value

### Type System

- `I18nValue` type: `string | Record<string, string>`
- TypeScript types in `types/atlas-config.ts` support both formats
- Loader transforms i18n values to resolved strings at load time
- Runtime configs contain only resolved strings (no i18n objects)

## Key Fields Reference

| Field | Required | Description |
|-------|----------|-------------|
| `$schema` | ✅ | Reference to atlas.schema.json |
| `id` | ✅ | Unique atlas identifier (kebab-case) |
| `name` | ✅ | Display name (string or i18n object) |
| `category` | - | Atlas category: `country`, `region`, or `world` (default: country) |
| `description` | - | Brief description (string or i18n object) |
| `referenceScale` | ⏩ | Base scale for composite projections (default: 2700) |
| `territories` | ✅ | Territory definitions (array) or "*" for all territories |
| `projection` | ⚠️ | Highly recommended projection parameters |
| `territoryCollections` | ⏩ | Unified territory grouping system with selection type constraints |

**View Modes**: Available view modes are determined dynamically from registry presets. Each preset type (composite-custom, unified, split, built-in-composite) defines an available view mode. The default view mode is determined by the preset marked with `isDefault: true` in the registry.

## Territory Collections System

Territory collections provide a unified, flexible system for grouping territories by administrative or geographic criteria. Each collection set defines a selection type that constrains how it can be used in the UI.

### Structure
Territory collections are organized into sets, where each set contains multiple collections and a selection type:

```json
{
  "territoryCollections": {
    "administrative": {
      "label": {"en": "Administrative", "fr": "Administratif"},
      "selectionType": "incremental",
      "collections": [
        {
          "id": "metropole-only",
          "label": {"en": "Metropolitan only", "fr": "Métropole uniquement"},
          "territories": ["FR-MET"]
        }
      ]
    },
    "geographic": {
      "label": {"en": "Geographic", "fr": "Géographique"},
      "selectionType": "mutually-exclusive",
      "collections": [
        {
          "id": "mainland",
          "label": {"en": "Mainland", "fr": "Métropole"},
          "territories": ["FR-MET"]
        }
      ]
    }
  }
}
```

### Collection Set Properties
- **label**: Display label for the collection set (i18n object or string)
- **selectionType**: Defines selection behavior:
  - `"incremental"`: Progressive territory additions (used for territoryScope dropdowns)
  - `"mutually-exclusive"`: Single collection selection (used for territoryManager and territoryGroups)
- **description** (optional): Explanation of the grouping strategy
- **collections**: Array of collection objects

### Collection Properties
- **id**: Unique identifier within the set (kebab-case)
- **label**: Display label (i18n object or string)
- **territories**: Array of territory codes or `"*"` for all territories
- **exclude** (optional): Array of territory codes to exclude when using `"*"`

### Selection Type Usage
The selection type determines which UI components can use a collection set:

- **incremental** collections: Used in territory scope dropdowns (split/unified modes) where users select progressive combinations (e.g., "Mainland only" → "Mainland + DROM" → "All territories")
- **mutually-exclusive** collections: Used in territory manager (composite mode) and territory groupings (split view) where only one collection can be active at a time (e.g., "Caribbean" OR "Pacific", not both)

### Usage in Registry Behavior
The registry defines which collection set to use for specific UI elements:

```json
{
  "behavior": {
    "collectionSets": {
      "territoryManager": "legal-status",
      "territoryScope": "incremental",
      "territoryGroups": "geographic"
    }
  }
}
```

Validation enforces that `territoryManager` and `territoryGroups` reference mutually-exclusive collection sets, while `territoryScope` references incremental collection sets.

## Preset System

Presets provide high-quality default territory positioning for composite-custom mode.

### Configuration
Presets are defined inline within atlas entries in the registry (`configs/atlas-registry.json`):

```json
{
  "atlases": [
    {
      "id": "france",
      "name": {"en": "France", "fr": "France"},
      "presets": [
        {
          "id": "france-default",
          "name": {"en": "France - Default", "fr": "France - Par defaut"},
          "type": "composite-custom",
          "configPath": "./presets/france/france-default.json",
          "isDefault": true
        },
        {
          "id": "france-unified",
          "name": {"en": "France - Unified", "fr": "France - Vue unifiee"},
          "type": "unified",
          "configPath": "./presets/france/france-unified.json"
        }
      ]
    }
  ]
}
```

### Location and Format
- **Registry**: Preset metadata defined inline in `configs/atlas-registry.json`
- **Config Files**: Preset configurations stored in `configs/presets/` directory
- **Format**: ExportedCompositeConfig JSON (same as export/import format)

### Workflow
1. Application queries atlas registry for available presets using `getAtlasPresets(atlasId)`
2. Default preset identified by `isDefault: true` flag in preset definition
3. PresetLoader loads preset config from path specified in `configPath` field
4. Preset provides default projections, translations, and scales for territories
5. Applied automatically on atlas initialization in composite-custom mode

### Benefits
- Users get professional defaults without manual adjustment
- Consistent layouts across sessions
- Easier onboarding for new users
- Presets can be shared and versioned

### Creating Presets
Presets are created by exporting manually-adjusted compositions from the running application.
See `configs/presets/README.md` for detailed instructions.

## Auto-Discovery Flow

1. **Build Time**: Vite glob imports scan `configs/*.json`
2. **Load Time**: Registry loads and validates each config
3. **Transform**: Loader adapts JSON to TypeScript interfaces
4. **Register**: Each atlas is registered by ID
5. **Ready**: Application can query registry for atlases

## Related Docs

- `add-new-atlas.md` - Step-by-step guide for adding new atlas
- `projections.md` - Projection system reference
- `scripts.md` - CLI tools for geodata preparation
- `export.md` - Export system and preset creation
