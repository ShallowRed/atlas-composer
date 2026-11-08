import type { ValidationError } from '@atlas-composer/specification'

export type JsonFileError
  = | { code: 'JSON_FILE_NOT_FOUND', path: string }
    | { code: 'JSON_FILE_NETWORK_ERROR', path: string, status: number }
    | { code: 'JSON_FILE_UNREACHABLE', path: string }
    | { code: 'JSON_FILE_MALFORMED', path: string }

export type GeoDataError
  = | JsonFileError
    | { code: 'GEODATA_MISSING_OBJECT', objectName: string }
    | { code: 'GEODATA_INVALID_STRUCTURE', path: string }

interface TerritoryScope { territory: string | null }

export type PresetIssue
  = | { code: `PRESET_SCHEMA_${ValidationError['code']}`, path: string }
    | { code: 'PRESET_FIELD_MISSING', field: 'id' | 'name' | 'config' | 'atlasId' | 'viewMode' }
    | { code: 'PRESET_ATLAS_ID_INVALID' }
    | { code: 'PRESET_VIEW_MODE_INVALID', viewMode: string }
    | { code: 'PRESET_TYPE_NOT_SUPPORTED', presetType: string, atlasId: string }
    | { code: 'PRESET_PARAMETER_REQUIRED', territory: string, parameter: string }
    | { code: 'PRESET_POSITIONING_REQUIRED', territory: string }
    | { code: 'PRESET_PROJECTION_MISSING' }
    | { code: 'PRESET_TERRITORIES_MISSING' }
    | { code: 'PRESET_COMPOSITE_PROJECTION_MISSING' }
    | { code: 'PRESET_GLOBAL_SCALE_NOT_NUMBER' }
    | { code: 'PRESET_GLOBAL_SCALE_NOT_POSITIVE' }
    | TerritoryScope & { code: 'PRESET_PROJECTION_ID_INVALID' }
    | TerritoryScope & { code: 'PRESET_PROJECTION_UNKNOWN', projectionId: string }
    | TerritoryScope & { code: 'PRESET_PARAMETERS_NOT_OBJECT' }
    | TerritoryScope & { code: 'PRESET_PARAMETER_NOT_NUMBER', parameter: string, actualType: string }
    | TerritoryScope & { code: 'PRESET_PARAMETER_NOT_ARRAY', parameter: string, actualType: string }
    | TerritoryScope & { code: 'PRESET_PARAMETER_WRONG_LENGTH', parameter: string, expected: number }
    | TerritoryScope & { code: 'PRESET_PARAMETER_TOO_SMALL', parameter: string, min: number }
    | TerritoryScope & { code: 'PRESET_PARAMETER_TOO_LARGE', parameter: string, max: number }

export type PresetError
  = | JsonFileError
    | { code: 'PRESET_UNKNOWN', presetId: string }
    | { code: 'PRESET_INVALID', presetId: string, issues: PresetIssue[] }
    | { code: 'PRESET_NOT_APPLICABLE', presetId: string, presetType: string, viewMode: string }

export type AtlasConfigError
  = | JsonFileError
    | { code: 'ATLAS_UNKNOWN', atlasId: string }
    | { code: 'ATLAS_CONFIG_INVALID', atlasId: string }

export type InitializationError
  = | AtlasConfigError
    | GeoDataError
    | PresetError
    | { code: 'ATLAS_NO_DEFAULT_PRESET', atlasId: string, viewMode: string }
    | { code: 'INITIALIZATION_FAILED', reason: string }

export type PresetApplicationError
  = | GeoDataError
    | PresetError
    | { code: 'PRESET_APPLICATION_FAILED', presetId: string, reason: string }

export type ImportError
  = | GeoDataError
    | { code: 'IMPORT_NOT_JSON_FILE', fileName: string }
    | { code: 'IMPORT_FILE_TOO_LARGE', fileName: string, maxSizeInMb: number }
    | { code: 'IMPORT_FILE_UNREADABLE', fileName: string }
    | { code: 'IMPORT_MALFORMED_JSON' }
    | { code: 'IMPORT_INVALID', issues: PresetIssue[] }
    | { code: 'IMPORT_ATLAS_NOT_LOADED' }
    | { code: 'IMPORT_ATLAS_MISMATCH', importedAtlasId: string, currentAtlasId: string }
    | { code: 'IMPORT_APPLICATION_FAILED', reason: string }

export type AppError
  = | InitializationError
    | PresetApplicationError
    | ImportError
    | { code: 'ATLAS_SWITCH_FAILED', atlasId: string, cause: InitializationError }
