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
 */

declare const brand: unique symbol

type Brand<T, B> = T & { readonly [brand]: B }

export type AtlasId = Brand<string, 'AtlasId'>

export type ProjectionId = Brand<string, 'ProjectionId'>

export type PresetId = Brand<string, 'PresetId'>

export type TerritoryCode = Brand<string, 'TerritoryCode'>

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
