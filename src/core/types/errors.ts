import type { ValidationError } from '@atlas-composer/specification'

export type GeoDataError
  = | { code: 'GEODATA_NOT_FOUND', path: string }
    | { code: 'GEODATA_INVALID_JSON', path: string }
    | { code: 'GEODATA_UNREACHABLE', path: string }
    | { code: 'GEODATA_NETWORK_ERROR', path: string, status: number }
    | { code: 'GEODATA_MISSING_OBJECT', objectName: string }
    | { code: 'GEODATA_INVALID_STRUCTURE', path: string }

export type JsonFileError
  = | { code: 'JSON_FILE_NOT_FOUND', path: string }
    | { code: 'JSON_FILE_NETWORK_ERROR', path: string, status: number }
    | { code: 'JSON_FILE_UNREACHABLE', path: string }
    | { code: 'JSON_FILE_MALFORMED', path: string }

interface TerritoryScope { territory: string | null }

export type PresetIssue
  = | { code: `PRESET_SCHEMA_${ValidationError['code']}`, path: string }
    | { code: 'PRESET_FIELD_MISSING', field: 'id' | 'name' | 'config' | 'atlasId' | 'viewMode' }
    | { code: 'PRESET_ATLAS_ID_INVALID' }
    | { code: 'PRESET_VIEW_MODE_INVALID', viewMode: string }
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

export type AppError
  = | GeoDataError
    | { code: 'INITIALIZATION_FAILED', reason: string }
