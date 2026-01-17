/**
 * Domain Error Types
 *
 * Discriminated unions for explicit, type-safe error handling.
 * Each error type includes contextual information for debugging and user feedback.
 */

import type { AtlasId, PresetId, ProjectionId } from '@/types/branded'

// Error Type Unions

/**
 * All application errors
 */
export type AppError
  = | AtlasError
    | GeoDataError
    | PresetError
    | ProjectionError
    | NetworkError

/**
 * Atlas-related errors
 */
export type AtlasError
  = | { type: 'ATLAS_NOT_FOUND', atlasId: AtlasId }
    | { type: 'ATLAS_LOAD_FAILED', atlasId: AtlasId, reason: string }
    | { type: 'ATLAS_CONFIG_INVALID', atlasId: AtlasId, reason: string }

/**
 * Geographic data errors
 */
export type GeoDataError
  = | { type: 'GEODATA_NOT_FOUND', path: string }
    | { type: 'GEODATA_INVALID_JSON', path: string, parseError?: string }
    | { type: 'GEODATA_NETWORK_ERROR', path: string, status: number }
    | { type: 'GEODATA_MISSING_OBJECT', objectName: string }
    | { type: 'GEODATA_INVALID_STRUCTURE', path: string, reason: string }

/**
 * Preset-related errors
 */
export type PresetError
  = | { type: 'PRESET_NOT_FOUND', presetId: PresetId }
    | { type: 'PRESET_INVALID_JSON', presetId: PresetId, parseError?: string }
    | { type: 'PRESET_VALIDATION_FAILED', presetId: PresetId, errors: string[] }
    | { type: 'PRESET_TYPE_MISMATCH', presetId: PresetId, expected: string, actual: string }
    | { type: 'PRESET_LOAD_FAILED', presetId: PresetId, reason: string }

/**
 * Projection-related errors
 */
export type ProjectionError
  = | { type: 'PROJECTION_NOT_FOUND', projectionId: ProjectionId }
    | { type: 'PROJECTION_CREATE_FAILED', projectionId: ProjectionId, reason?: string }
    | { type: 'PROJECTION_INVALID_PARAMS', projectionId: ProjectionId, reason: string }

/**
 * Network errors
 */
export type NetworkError
  = | { type: 'NETWORK_FETCH_FAILED', url: string, reason?: string }
    | { type: 'NETWORK_TIMEOUT', url: string }

// Error Constructors

/**
 * Error factory functions for convenience and consistency
 */
export const Errors = {
  // Atlas errors
  atlasNotFound: (atlasId: AtlasId): AtlasError => ({
    type: 'ATLAS_NOT_FOUND',
    atlasId,
  }),

  atlasLoadFailed: (atlasId: AtlasId, reason: string): AtlasError => ({
    type: 'ATLAS_LOAD_FAILED',
    atlasId,
    reason,
  }),

  atlasConfigInvalid: (atlasId: AtlasId, reason: string): AtlasError => ({
    type: 'ATLAS_CONFIG_INVALID',
    atlasId,
    reason,
  }),

  // GeoData errors
  geoDataNotFound: (path: string): GeoDataError => ({
    type: 'GEODATA_NOT_FOUND',
    path,
  }),

  geoDataInvalidJson: (path: string, parseError?: string): GeoDataError => ({
    type: 'GEODATA_INVALID_JSON',
    path,
    parseError,
  }),

  geoDataNetworkError: (path: string, status: number): GeoDataError => ({
    type: 'GEODATA_NETWORK_ERROR',
    path,
    status,
  }),

  geoDataMissingObject: (objectName: string): GeoDataError => ({
    type: 'GEODATA_MISSING_OBJECT',
    objectName,
  }),

  geoDataInvalidStructure: (path: string, reason: string): GeoDataError => ({
    type: 'GEODATA_INVALID_STRUCTURE',
    path,
    reason,
  }),

  // Preset errors
  presetNotFound: (presetId: PresetId): PresetError => ({
    type: 'PRESET_NOT_FOUND',
    presetId,
  }),

  presetInvalidJson: (presetId: PresetId, parseError?: string): PresetError => ({
    type: 'PRESET_INVALID_JSON',
    presetId,
    parseError,
  }),

  presetValidationFailed: (presetId: PresetId, errors: string[]): PresetError => ({
    type: 'PRESET_VALIDATION_FAILED',
    presetId,
    errors,
  }),

  presetTypeMismatch: (presetId: PresetId, expected: string, actual: string): PresetError => ({
    type: 'PRESET_TYPE_MISMATCH',
    presetId,
    expected,
    actual,
  }),

  presetLoadFailed: (presetId: PresetId, reason: string): PresetError => ({
    type: 'PRESET_LOAD_FAILED',
    presetId,
    reason,
  }),

  // Projection errors
  projectionNotFound: (projectionId: ProjectionId): ProjectionError => ({
    type: 'PROJECTION_NOT_FOUND',
    projectionId,
  }),

  projectionCreateFailed: (projectionId: ProjectionId, reason?: string): ProjectionError => ({
    type: 'PROJECTION_CREATE_FAILED',
    projectionId,
    reason,
  }),

  projectionInvalidParams: (projectionId: ProjectionId, reason: string): ProjectionError => ({
    type: 'PROJECTION_INVALID_PARAMS',
    projectionId,
    reason,
  }),

  // Network errors
  networkFetchFailed: (url: string, reason?: string): NetworkError => ({
    type: 'NETWORK_FETCH_FAILED',
    url,
    reason,
  }),

  networkTimeout: (url: string): NetworkError => ({
    type: 'NETWORK_TIMEOUT',
    url,
  }),
} as const

// Type Guards

export function isAtlasError(error: AppError): error is AtlasError {
  return error.type.startsWith('ATLAS_')
}

export function isGeoDataError(error: AppError): error is GeoDataError {
  return error.type.startsWith('GEODATA_')
}

export function isPresetError(error: AppError): error is PresetError {
  return error.type.startsWith('PRESET_')
}

export function isProjectionError(error: AppError): error is ProjectionError {
  return error.type.startsWith('PROJECTION_')
}

export function isNetworkError(error: AppError): error is NetworkError {
  return error.type.startsWith('NETWORK_')
}
