# Scripts & Build Tools

## Overview

TypeScript-based toolkit for geodata preparation, validation, and development.

## Quick Start

```bash
pnpm geodata:prepare france            # Prepare geodata
pnpm geodata:validate france           # Validate config/data
pnpm geodata:lookup france             # Look up in Natural Earth
pnpm geodata:analyze 250               # Analyze polygon structure
```

## Core Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| **prepare-geodata.ts** | Download NE data, filter, create TopoJSON | `pnpm geodata:prepare <atlas>` |
| **validate-configs.ts** | Validate config/data consistency | `pnpm geodata:validate <atlas>` |
| **lookup-country.ts** | Look up country in Natural Earth | `pnpm geodata:lookup <query>` |
| **analyze-country.ts** | Analyze polygon structure | `pnpm geodata:analyze <id>` |

## prepare-geodata Pipeline

1. Load & validate config from `configs/<atlas>.json`
2. Download Natural Earth data
3. Filter territories by ID
4. Extract embedded territories (separate polygons)
5. Duplicate territories if needed
6. Generate TopoJSON output to `src/public/data/`

**Output**: `{atlas}-territories-{res}.json`, `{atlas}-metadata-{res}.json`

## Territory Extraction

Extract polygons from Natural Earth MultiPolygon features:

```json
{
  "code": "FR-GP",
  "extraction": {
    "extractFrom": "250",
    "polygonIndices": [1]
  }
}
```

## Territory Duplication

Duplicate features for projection layouts:

```json
{
  "duplicates": [
    { "sourceCode": "258", "targetCode": "FR-PF-2" }
  ]
}
```

## Key API

```typescript
import { loadConfig } from '#scripts/config/loader'
import { fetchWorldData } from '#scripts/utils/ne-data'
import { validateSchema } from '#scripts/utils/schema-validator'
import { logger } from '#scripts/utils/logger'
```

## Directory Structure

```
scripts/
├── prepare-geodata.ts, validate-configs.ts
├── config/ (adapter.ts, loader.ts)
├── utils/ (cli-args.ts, logger.ts, ne-data.ts, schema-validator.ts)
└── dev/ (lookup-country.ts, analyze-country.ts)
```

## Best Practices

- Always validate after generation
- Use dev tools (lookup, analyze) before creating configs
- Start with 50m resolution (balance of speed/detail)
- Test extraction rules incrementally
- Cache in `node_modules/.cache/natural-earth/`

## Naming Conventions

- Metropolitan: `{ISO}-MET` (FR-MET)
- Overseas: `{ISO}-{ABBR}` (FR-GP)
- Duplicates: `{ISO}-{ABBR}-{N}` (FR-PF-2)

## Workflow

```
pnpm geodata:lookup "country"  → Create config
pnpm geodata:analyze <id>      → Get polygon structure
pnpm geodata:prepare <atlas>   → Generate data
pnpm geodata:validate <atlas>  → Validate
pnpm dev                       → Test
```

## Related Docs

- [add-new-atlas.md](add-new-atlas.md) - Step-by-step guide
- [atlases.md](atlases.md) - Atlas system
