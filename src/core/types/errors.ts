export type GeoDataError
  = | { code: 'GEODATA_NOT_FOUND', path: string }
    | { code: 'GEODATA_INVALID_JSON', path: string }
    | { code: 'GEODATA_UNREACHABLE', path: string }
    | { code: 'GEODATA_NETWORK_ERROR', path: string, status: number }
    | { code: 'GEODATA_MISSING_OBJECT', objectName: string }
    | { code: 'GEODATA_INVALID_STRUCTURE', path: string }

export type AppError
  = | GeoDataError
    | { code: 'INITIALIZATION_FAILED', reason: string }
