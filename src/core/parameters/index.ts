/**
 * Parameter Registry Initialization
 *
 * Initialize the parameter registry with all parameter definitions.
 * Import this file to ensure parameters are registered.
 */

import { registerAllParameters } from './parameter-definitions'
import { parameterRegistry } from './parameter-registry'

// Register all parameters on import
registerAllParameters()

// Export the initialized registry
export { parameterRegistry }
export * from './parameter-registry'
