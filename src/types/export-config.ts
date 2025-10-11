/**
 * Export Configuration Types
 *
 * Defines the structure for exporting and importing composite projection configurations.
 * These types ensure full parameter fidelity for roundtrip import/export operations.
 */

/**
 * Role of a territory in the composite projection
 */
export type TerritoryRole = 'primary' | 'secondary' | 'member'

/**
 * Exported projection parameters
 * Contains all parameters needed to reconstruct a D3 projection
 */
export interface ExportedProjectionParameters {
  /** Geographic center point [longitude, latitude] */
  center?: [number, number]

  /** Rotation angles [lambda, phi, gamma] */
  rotate?: [number, number, number]

  /** Standard parallels for conic projections [south, north] */
  parallels?: [number, number]

  /** Current scale value */
  scale: number

  /** Base scale before user adjustments */
  baseScale: number

  /** User's scale multiplier (scale = baseScale * scaleMultiplier) */
  scaleMultiplier: number
}

/**
 * Exported territory layout configuration
 * Defines positioning and clipping in the composite layout
 */
export interface ExportedTerritoryLayout {
  /** Translation offset [x, y] in pixels from computed position */
  translateOffset: [number, number]

  /** Optional clipping extent [[x0, y0], [x1, y1]] */
  clipExtent?: [[number, number], [number, number]] | null
}

/**
 * Exported territory configuration
 * Complete projection and layout settings for a single territory
 */
export interface ExportedTerritory {
  // Identity
  /** Territory code (e.g., 'FR-MET', 'FR-GP') */
  code: string

  /** Territory display name */
  name: string

  /** Role in the composite structure */
  role: TerritoryRole

  // Projection configuration
  /** Projection ID from registry (e.g., 'conic-conformal', 'mercator') */
  projectionId: string

  /** Projection family (e.g., 'conic', 'cylindrical', 'azimuthal') */
  projectionFamily: string

  /** D3 projection parameters */
  parameters: ExportedProjectionParameters

  /** Layout positioning */
  layout: ExportedTerritoryLayout

  /** Geographic bounds [[west, south], [east, north]] */
  bounds: [[number, number], [number, number]]
}

/**
 * Export metadata
 * Contextual information about the export
 */
export interface ExportMetadata {
  /** Source atlas ID (e.g., 'france', 'portugal', 'eu') */
  atlasId: string

  /** Atlas display name */
  atlasName: string

  /** ISO 8601 timestamp of export */
  exportDate: string

  /** Application version that created the export */
  createdWith: string

  /** Optional user notes or description */
  notes?: string
}

/**
 * Pattern type for composite projection structure
 */
export type CompositePattern = 'single-focus' | 'equal-members'

/**
 * Supported configuration versions
 */
export type ConfigVersion = '1.0'

/**
 * Base configuration interface (shared across versions)
 */
export interface BaseExportedConfig {
  /** Format version for future compatibility */
  version: ConfigVersion

  /** Export metadata */
  metadata: ExportMetadata

  /** Composite pattern type */
  pattern: CompositePattern

  /** Reference scale used across all territories */
  referenceScale: number

  /** Array of territory configurations */
  territories: ExportedTerritory[]
}

/**
 * Version 1.0 configuration (current)
 *
 * Complete serialization of a custom composite projection that can be:
 * - Saved as JSON file
 * - Shared with other users
 * - Imported back into Atlas Composer
 * - Used to generate D3/Plot code
 */
export interface ExportedCompositeConfigV1 extends BaseExportedConfig {
  version: '1.0'
}

/**
 * Current exportable composite projection configuration
 * This type alias points to the latest version
 */
export type ExportedCompositeConfig = ExportedCompositeConfigV1

/**
 * Union of all supported configuration versions
 * Used for migration and backward compatibility
 */
export type AnyVersionConfig = ExportedCompositeConfigV1 // Add future versions here: | ExportedCompositeConfigV2

/**
 * Validation result for exported configuration
 */
export interface ExportValidationResult {
  /** Whether the configuration is valid */
  valid: boolean

  /** Array of error messages (empty if valid) */
  errors: string[]

  /** Array of warning messages (non-critical issues) */
  warnings: string[]
}

/**
 * Migration result for version upgrades
 */
export interface MigrationResult {
  /** Whether migration was successful */
  success: boolean

  /** Migrated configuration (only if successful) */
  config?: ExportedCompositeConfig

  /** Original version */
  fromVersion: ConfigVersion

  /** Target version */
  toVersion: ConfigVersion

  /** Migration messages (changes applied) */
  messages: string[]

  /** Errors encountered during migration */
  errors: string[]

  /** Warnings about potential issues */
  warnings: string[]
}

/**
 * Code generation options
 */
export interface CodeGenerationOptions {
  /** Output language */
  language: 'javascript' | 'typescript'

  /** Target library format */
  format: 'd3' | 'plot'

  /** Include JSDoc/TSDoc comments */
  includeComments: boolean

  /** Include usage examples in comments */
  includeExamples?: boolean

  /** Module format */
  moduleFormat?: 'esm' | 'cjs' | 'umd'
}
