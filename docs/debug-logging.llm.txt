# Debug Logging System

## Overview

The application uses the [debug](https://www.npmjs.com/package/debug) npm package for structured logging with per-service namespacing. This provides fine-grained control over what gets logged during development.

## Quick Start

### Run with Debug Enabled

Use the provided npm scripts to launch the dev server with debug logging:

```bash
# Enable ALL debug logs
pnpm dev:debug

# Enable only store-related logs
pnpm dev:debug:store

# Enable only rendering logs
pnpm dev:debug:render

# Enable only projection logs
pnpm dev:debug:projection

# Enable only preset logs
pnpm dev:debug:preset

# Custom debug pattern
VITE_DEBUG="atlas:store:*,atlas:render:*" pnpm dev
```

### Available Scripts

- `pnpm dev` - Normal dev mode (no debug)
- `pnpm dev:debug` - All debug logs (`atlas:*`)
- `pnpm dev:debug:store` - Store operations only
- `pnpm dev:debug:render` - Rendering operations only
- `pnpm dev:debug:projection` - Projection operations only
- `pnpm dev:debug:preset` - Preset operations only

## Usage

### Basic Usage

```typescript
import { logger } from '@/utils/logger'

// Service logging
logger.projection.service('Creating projection: %s', projectionType)
logger.projection.composite('Territory %s configured with params: %O', code, params)

// Store logging
logger.store.config('Atlas changed: %s → %s', oldId, newId)
logger.store.parameters('Parameter updated: %s = %d', paramName, value)

// Render logging
logger.render.coordinator('Rendering map with %d territories', count)
logger.render.composite('Bounds calculated: %o', bounds)
```

### Format Specifiers

The `debug` package supports printf-style formatting:

- `%s` - String
- `%d` - Number (integer or float)
- `%o` - Object (single line)
- `%O` - Object (multi-line pretty-print)
- `%j` - JSON
- `%%` - Literal percent sign

```typescript
logger.projection.service('Projection %s created with scale=%d', type, scale)
logger.render.composite('Full config: %O', config) // Pretty-printed
logger.data.loader('GeoJSON loaded: %j', { features: count }) // JSON
```

## Manual Control (Alternative Method)

### Browser Console

Debug output can also be controlled via `localStorage.debug`:

```javascript
// Enable all atlas logs
localStorage.debug = 'atlas:*'

// Enable specific service
localStorage.debug = 'atlas:projection:*'

// Enable multiple services
localStorage.debug = 'atlas:projection:*,atlas:render:*'

// Enable all except data loading
localStorage.debug = 'atlas:*,-atlas:data:*'

// Disable all
localStorage.debug = ''
// or
delete localStorage.debug
```

Then refresh the page to apply changes.

### Programmatic Control

```typescript
import { enableDebug, disableDebug, isDebugEnabled } from '@/utils/logger'

// Enable at runtime
enableDebug('atlas:projection:*')

// Disable all
disableDebug()

// Check if enabled
if (isDebugEnabled('atlas:projection:service')) {
  // Expensive operation only if logging enabled
}
```

## Namespace Structure

The logger is organized by domain with sub-namespaces:

### Services
- `atlas:atlas:service` - Atlas configuration management
- `atlas:atlas:loader` - Atlas loading and initialization
- `atlas:atlas:coordinator` - Atlas change coordination
- `atlas:projection:service` - Projection service
- `atlas:projection:composite` - Composite projection logic
- `atlas:projection:factory` - Projection factory
- `atlas:projection:registry` - Projection registry
- `atlas:render:coordinator` - Render coordinator
- `atlas:render:composite` - Composite rendering
- `atlas:render:cartographer` - Cartographer service
- `atlas:render:settings` - Settings builder
- `atlas:data:loader` - Data loading service
- `atlas:data:geodata` - GeoData service
- `atlas:data:territory` - Territory data service
- `atlas:data:cache` - Data caching
- `atlas:parameters:manager` - Parameter manager
- `atlas:parameters:provider` - Parameter provider
- `atlas:parameters:registry` - Parameter registry
- `atlas:parameters:validation` - Parameter validation
- `atlas:presets:loader` - Preset loading
- `atlas:presets:manager` - Preset management
- `atlas:presets:validator` - Preset validation
- `atlas:export:config` - Export configuration
- `atlas:export:code` - Code generation
- `atlas:export:d3` - D3 export
- `atlas:export:plot` - Observable Plot export
- `atlas:validation:schema` - Schema validation
- `atlas:validation:parameters` - Parameter validation

### Stores
- `atlas:store:config` - Config store
- `atlas:store:geoData` - GeoData store
- `atlas:store:parameters` - Parameters store
- `atlas:store:ui` - UI store

### Vue Layer
- `atlas:vue:component` - Vue components
- `atlas:vue:composable` - Vue composables
- `atlas:vue:router` - Vue router

## Common Patterns

### Conditional Expensive Operations

```typescript
import { logger } from '@/utils/logger'

const debug = logger.projection.composite

if (debug.enabled) {
  // Only compute expensive debug info if logging is enabled
  const debugInfo = computeExpensiveDebugData()
  debug('Debug info: %O', debugInfo)
}
```

### Custom Namespaces

For one-off or dynamic namespaces:

```typescript
import { createLogger } from '@/utils/logger'

const debug = createLogger('atlas:custom:feature')
debug('Custom logging')
```

### Extending Namespaces

Create sub-namespaces dynamically:

```typescript
import { logger } from '@/utils/logger'

const debug = logger.projection.service.extend('custom')
debug('This logs to: atlas:projection:service:custom')
```

## Examples by Use Case

### Debugging Projection Issues

```javascript
// Enable projection logging
localStorage.debug = 'atlas:projection:*'

// Or just composite projection
localStorage.debug = 'atlas:projection:composite'
```

### Debugging Render Issues

```javascript
// Enable all rendering
localStorage.debug = 'atlas:render:*'

// Or specific render component
localStorage.debug = 'atlas:render:coordinator'
```

### Debugging Data Loading

```javascript
// All data operations
localStorage.debug = 'atlas:data:*'

// Just GeoData service
localStorage.debug = 'atlas:data:geodata'
```

### Debugging Everything

```javascript
// Nuclear option - all logs
localStorage.debug = 'atlas:*'

// Everything except data (can be noisy)
localStorage.debug = 'atlas:*,-atlas:data:*'
```

## Production Builds

In production builds, the `debug` package is automatically tree-shaken by Vite if the logs are not accessed. The overhead is minimal when disabled.

Debug logs are automatically suppressed unless explicitly enabled, making them safe for production deployment.

## Best Practices

1. **Use descriptive messages**: `logger.projection.service('Creating %s projection', type)` not `logger.projection.service('Creating')`

2. **Use format specifiers**: They're more efficient than string concatenation and provide better output

3. **Log at appropriate points**:
   - Function entry/exit
   - State changes
   - Error conditions
   - Performance-critical operations

4. **Use object pretty-printing sparingly**: `%O` is expensive, use `%o` for inline objects

5. **Check `.enabled` for expensive operations**:
   ```typescript
   if (debug.enabled) {
     debug('Expensive: %O', computeExpensiveData())
   }
   ```

6. **Group related operations**: Use consistent namespaces for related functionality

## Migrating Existing Console Logs

Replace scattered `console.*` calls with structured debug logs:

**Before:**
```typescript
console.log('Creating projection:', type)
console.warn('Invalid parameters:', params)
console.error('Failed to create projection')
```

**After:**
```typescript
logger.projection.service('Creating projection: %s', type)
logger.projection.service('Invalid parameters: %O', params)
logger.projection.service('Failed to create projection')
```

Note: For true errors that should always be visible, keep `console.error` for production error handling. Use debug logs for development debugging.
