# Debug Logging System

## Overview

Uses [debug](https://www.npmjs.com/package/debug) for structured logging with per-service namespacing.

## Quick Start

```bash
pnpm dev:debug           # All logs (atlas:*)
pnpm dev:debug:store     # Store operations
pnpm dev:debug:render    # Rendering operations
pnpm dev:debug:projection # Projection operations
pnpm dev:debug:preset    # Preset operations
```

## Usage

```typescript
import { logger } from '@/utils/logger'

logger.projection.service('Creating projection: %s', projectionType)
logger.store.config('Atlas changed: %s -> %s', oldId, newId)
logger.render.coordinator('Rendering %d territories', count)
```

**Format Specifiers**: `%s` (string), `%d` (number), `%o` (object inline), `%O` (object pretty)

## Browser Console Control

```javascript
localStorage.debug = 'atlas:*'              // All logs
localStorage.debug = 'atlas:projection:*'   // Projection only
localStorage.debug = 'atlas:*,-atlas:data:*' // All except data
localStorage.debug = ''                      // Disable
```

## Namespace Structure

| Domain | Namespaces |
|--------|------------|
| **Services** | atlas:atlas:*, atlas:projection:*, atlas:render:*, atlas:data:*, atlas:parameters:*, atlas:presets:*, atlas:export:* |
| **Stores** | atlas:store:config, atlas:store:geoData, atlas:store:parameters, atlas:store:ui |
| **Vue** | atlas:vue:component, atlas:vue:composable, atlas:vue:router |

## Best Practices

- Use format specifiers (more efficient than concatenation)
- Check `.enabled` for expensive operations: `if (debug.enabled) { ... }`
- Use `%O` sparingly (expensive)
- Keep `console.error` for production errors, use debug for development
