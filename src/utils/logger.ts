import type { Debugger } from 'debug'
import debug from 'debug'

/**
 * Application-wide logger using the debug package
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/utils/logger'
 *
 * logger.projection.service('Creating projection: %s', projectionType)
 * logger.render.composite('Rendering %d territories', count)
 * logger.store.config('Atlas changed to: %s', atlasId)
 * ```
 *
 * Enable in browser console:
 * ```javascript
 * localStorage.debug = 'ac:*'                    // All logs
 * localStorage.debug = 'ac:projection:*'         // All projection logs
 * localStorage.debug = 'ac:render:*'             // All render logs
 * localStorage.debug = 'ac:*,-ac:data:*'      // All except data
 * ```
 */

/**
 * Service-specific loggers with sub-namespaces
 */
export const logger = {
  // Services
  atlas: {
    service: debug('ac:atlas:service'),
    loader: debug('ac:atlas:loader'),
    coordinator: debug('ac:atlas:coordinator'),
  },
  projection: {
    service: debug('ac:projection:service'),
    composite: debug('ac:projection:composite'),
    factory: debug('ac:projection:factory'),
    registry: debug('ac:projection:registry'),
  },
  render: {
    coordinator: debug('ac:render:coordinator'),
    composite: debug('ac:render:composite'),
    cartographer: debug('ac:render:cartographer'),
    overlay: debug('ac:render:overlay'),
    settings: debug('ac:render:settings'),
  },
  data: {
    loader: debug('ac:data:loader'),
    geodata: debug('ac:data:geodata'),
    territory: debug('ac:data:territory'),
    cache: debug('ac:data:cache'),
  },
  parameters: {
    manager: debug('ac:parameters:manager'),
    provider: debug('ac:parameters:provider'),
    registry: debug('ac:parameters:registry'),
    validation: debug('ac:parameters:validation'),
  },
  presets: {
    loader: debug('ac:presets:loader'),
    manager: debug('ac:presets:manager'),
    validator: debug('ac:presets:validator'),
    metadata: debug('ac:presets:metadata'),
  },
  // Export & Import
  export: {
    config: debug('ac:export:config'),
    code: debug('ac:export:code'),
    d3: debug('ac:export:d3'),
    plot: debug('ac:export:plot'),
    service: debug('ac:export:service'),
  },
  validation: {
    schema: debug('ac:validation:schema'),
    parameters: debug('ac:validation:parameters'),
  },
  // Stores
  store: {
    config: debug('ac:store:config'),
    geoData: debug('ac:store:geoData'),
    parameters: debug('ac:store:parameters'),
    ui: debug('ac:store:ui'),
  },
  // Vue layer
  vue: {
    component: debug('ac:vue:component'),
    composable: debug('ac:vue:composable'),
    router: debug('ac:vue:router'),
  },
} as const

/**
 * Create a custom debug logger with a specific namespace
 * Use this for one-off or dynamic namespaces
 *
 * @param namespace - Debug namespace (e.g., 'ac:custom:feature')
 * @returns Debug logger instance
 */
export function createLogger(namespace: string): Debugger {
  return debug(namespace)
}

/**
 * Enable/disable debug namespaces programmatically
 *
 * @param namespaces - Debug namespaces to enable (e.g., 'ac:*', 'ac:projection:*')
 */
export function enableDebug(namespaces: string): void {
  debug.enable(namespaces)
}

/**
 * Disable all debug logging
 */
export function disableDebug(): void {
  debug.disable()
}

/**
 * Check if a namespace is enabled
 *
 * @param namespace - Namespace to check
 * @returns True if enabled
 */
export function isDebugEnabled(namespace: string): boolean {
  const debugInstance = debug(namespace)
  return debugInstance.enabled
}
