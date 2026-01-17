/**
 * Branded Types for Domain Identifiers
 *
 * Uses TypeScript's structural typing workaround (branded/nominal types)
 * to prevent accidental misuse of string identifiers at compile time.
 *
 * Example:
 * ```typescript
 * const atlasId = createAtlasId('france')
 * const presetId = createPresetId('france-default')
 *
 * loadPreset(atlasId) // Compile error! AtlasId !== PresetId
 * loadPreset(presetId) // OK
 * ```
 *
 * Benefits:
 * - Compile-time prevention of identifier mix-ups
 * - Self-documenting function signatures
 * - Zero runtime overhead (brands are erased)
 */

// Brand symbol for nominal typing
declare const brand: unique symbol

/**
 * Branded type helper
 * Creates a nominal type from a base type with a unique brand
 */
type Brand<T, B> = T & { readonly [brand]: B }

// Domain Identifiers

/**
 * Atlas identifier (e.g., 'france', 'usa', 'europe')
 */
export type AtlasId = Brand<string, 'AtlasId'>

/**
 * Projection identifier (e.g., 'albers-usa', 'lambert-conformal-conic')
 */
export type ProjectionId = Brand<string, 'ProjectionId'>

/**
 * Preset identifier (e.g., 'france-default', 'usa-composite')
 */
export type PresetId = Brand<string, 'PresetId'>

/**
 * Territory code (e.g., 'FR-GP', 'US-HI', 'PT-CONT')
 */
export type TerritoryCode = Brand<string, 'TerritoryCode'>

// Constructor Functions
// Runtime no-op, compile-time type branding

export function createAtlasId(id: string): AtlasId {
  return id as AtlasId
}

export function createProjectionId(id: string): ProjectionId {
  return id as ProjectionId
}

export function createPresetId(id: string): PresetId {
  return id as PresetId
}

export function createTerritoryCode(code: string): TerritoryCode {
  return code as TerritoryCode
}

// Type Guards

export function isAtlasId(value: unknown): value is AtlasId {
  return typeof value === 'string' && value.length > 0
}

export function isProjectionId(value: unknown): value is ProjectionId {
  return typeof value === 'string' && value.length > 0
}

export function isPresetId(value: unknown): value is PresetId {
  return typeof value === 'string' && value.length > 0
}

export function isTerritoryCode(value: unknown): value is TerritoryCode {
  return typeof value === 'string' && value.length > 0
}

// Utility Functions

/**
 * Extract raw string from any branded type
 * Useful when passing to external APIs that expect plain strings
 */
export function unwrapBrand<T extends AtlasId | ProjectionId | PresetId | TerritoryCode>(
  branded: T,
): string {
  return branded as unknown as string
}
