# Atlas Composer - Architecture

## Purpose

Interactive web app for creating custom cartographic visualizations using composite projections.

## Stack

| Category | Technology |
|----------|------------|
| Frontend | Vue.js 3, TypeScript, Vite |
| Mapping | D3.js, Observable Plot |
| State | Pinia stores (7 stores) |
| Styling | Tailwind CSS, DaisyUI 5 |
| Data | Natural Earth GeoJSON |

## Core Domains

| Domain | Location | Documentation |
|--------|----------|---------------|
| Atlas | core/atlases/, configs/ | [atlases.md](atlases.md) |
| Projection | core/projections/ | [projections.md](projections.md) |
| Parameter | core/parameters/, stores/parameters.ts | [services.md](services.md) |
| Preset | core/presets/, services/presets/ | [presets.md](presets.md) |
| Service | services/ | [services.md](services.md) |
| Vue | views/, components/, composables/, stores/ | [vue-architecture.md](vue-architecture.md) |
| Export | services/export/ | [export.md](export.md) |
| Scripts | scripts/ | [scripts.md](scripts.md) |

## Type Safety

**Branded Types**: AtlasId, ProjectionId, PresetId, TerritoryCode
**Result Type**: Explicit error handling via `Result<T, E>` discriminated union
**Domain Errors**: GeoDataError, PresetError, ProjectionError, AtlasError

## Data Flow

```
User Action → Vue Component → Pinia Store → Service Layer → D3/Plot → DOM Update
```

## Project Structure

```
src/
├── views/            # Page components (MapView.vue)
├── components/       # Vue components (16 total)
├── composables/      # Reusable logic (19 total)
├── stores/           # Pinia stores (7: app, atlas, projection, view, parameters, geoData, ui)
├── core/             # Domain logic (atlases, projections, parameters, presets)
├── services/         # Business logic layer
└── types/            # TypeScript definitions

configs/              # Atlas configurations + presets
scripts/              # Build tools
packages/             # NPM packages
```

## Distributable Packages

```
specification     ← Types + JSON Schemas (source of truth)
     ↓
preset-library    ← Curated presets
projection-core   ← Pure D3 utilities
projection-loader ← Runtime loader (~6KB)
```

| Package | Purpose | Location |
|---------|---------|----------|
| @atlas-composer/specification | Types, schemas, validation | packages/specification/ |
| @atlas-composer/preset-library | Ready-to-use presets | packages/preset-library/ |
| @atlas-composer/projection-loader | Runtime composite loader | packages/projection-loader/ |
| @atlas-composer/projection-core | Stream utilities, bounds | packages/projection-core/ |

## Key Patterns

- **Configuration-Driven**: JSON configs, schema validation, dynamic loading
- **Service Layer**: UI → Service → D3, stateless services, DI
- **Unified Parameter Registry**: Central registry, family-based validation, inheritance
- **Reactive Rendering**: Watchers, CartographerService coordination

## Vue Layer

**Components** (16): MapRenderer, TerritoryControls, ProjectionSelector, UI components
**Composables** (19): useAtlasData, useParameterProvider, useViewState, etc.
**Stores** (7): app, atlas, projection, view, parameters, geoData, ui

## Parameter Management

**Inheritance**: Territory > Global > Atlas > Registry defaults
**Provider**: `parameterProvider.getEffectiveParameters(territoryCode)`
**Storage**: Presets (projection.parameters, layout), Runtime (parameterStore)

## Development

```bash
pnpm install          # Install
pnpm dev              # Dev server
pnpm build            # Build all
pnpm build:packages   # Build NPM packages
```

## Related Documentation

| File | Content |
|------|---------|
| [atlases.md](atlases.md) | Atlas system |
| [projections.md](projections.md) | Projection system |
| [presets.md](presets.md) | Preset system |
| [services.md](services.md) | Service layer |
| [vue-architecture.md](vue-architecture.md) | Vue components, stores |
| [export.md](export.md) | Export system |
| [scripts.md](scripts.md) | Build tools |
| [adrs.md](adrs.md) | Architecture decisions |
