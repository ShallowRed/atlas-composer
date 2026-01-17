# Atlas System

## Architecture

- **Static Registry**: `configs/atlas-registry.json` defines available atlases
- **Lazy Loading**: Atlas configs load on-demand via fetch, cached in Map
- **Reactive**: useAtlasLoader composable with useAsyncState

## Loading Flow

1. Registry metadata loads at startup, default atlas preloads
2. User selects atlas → useAtlasLoader initiates fetch
3. Config loaded, cached, currentAtlasConfig ref updates
4. AtlasCoordinator orchestrates store updates and preset loading

## Registry Structure

```json
{
  "defaultAtlas": "france",
  "groups": [
    { "id": "country", "label": {"en": "Countries"}, "sortOrder": 1 }
  ],
  "atlases": [
    {
      "id": "france",
      "name": {"en": "France"},
      "group": "country",
      "sortOrder": 10,
      "configPath": "./france.json",
      "presets": [
        { "id": "france-default", "type": "composite-custom", "isDefault": true, "configPath": "./presets/france/france-default.json" }
      ],
      "behavior": {
        "collectionSets": {
          "territoryManager": { "collectionSet": "administrative" }
        }
      }
    }
  ]
}
```

## Atlas Config Structure

```json
{
  "$schema": "./schemas/atlas.schema.json",
  "atlasId": "france",
  "name": {"en": "France"},
  "territories": [
    { "code": "FR-MET", "name": "France", "center": [2.5, 46.5], "bounds": [[-6.5, 41], [10, 51]] }
  ],
  "territoryCollections": {
    "administrative": {
      "selectionType": "incremental",
      "collections": [{ "id": "all", "territories": "*" }]
    }
  }
}
```

## View Modes

Determined by preset types in registry:

| Mode | Preset Type | Description |
|------|-------------|-------------|
| composite-custom | composite-custom | User-defined layout |
| built-in-composite | built-in-composite | Pre-built D3 composite |
| split | split | Separate maps per territory |
| unified | unified | Single world map |

Default: preset marked with `isDefault: true`

## Territory Collections

| Selection Type | Usage | Behavior |
|----------------|-------|----------|
| **incremental** | Territory scope dropdowns | Progressive additions |
| **mutually-exclusive** | Territory manager, groups | Single collection active |

## i18n Support

All user-facing fields support `string` or `{en: "...", fr: "..."}` objects.

**Resolution**: current locale → `en` fallback → first available

## Adding a New Atlas

1. Create `configs/new-atlas.json` with territories
2. Add entry to `configs/atlas-registry.json`
3. Create preset(s) in `configs/presets/`

## Key Files

| Location | Purpose |
|----------|---------|
| configs/atlas-registry.json | Atlas definitions, presets, behavior |
| configs/{atlas}.json | Territory data, collections |
| src/core/atlases/registry.ts | loadAtlasAsync(), cache |
| src/core/atlases/loader.ts | JSON → TypeScript adapter |
| src/composables/useAtlasLoader.ts | Reactive async loading |

## Related Docs

- [add-new-atlas.md](add-new-atlas.md) - Step-by-step guide
- [presets.md](presets.md) - Preset system
- [projections.md](projections.md) - Projection system
