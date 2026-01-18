import type { AppError, GeoDataError } from '@/core/types/errors'
import { useI18n } from 'vue-i18n'

export function useErrorFormatter() {
  const { t } = useI18n()

  function formatError(error: AppError): string {
    switch (error.type) {
      case 'ATLAS_NOT_FOUND':
        return t('errors.atlas.notFound', { id: error.atlasId })
      case 'ATLAS_LOAD_FAILED':
        return t('errors.atlas.loadFailed', { id: error.atlasId })
      case 'ATLAS_CONFIG_INVALID':
        return t('errors.atlas.configInvalid', { id: error.atlasId })

      case 'GEODATA_NOT_FOUND':
        return t('errors.geoData.notFound')
      case 'GEODATA_INVALID_JSON':
        return t('errors.geoData.invalidJson')
      case 'GEODATA_NETWORK_ERROR':
        return t('errors.geoData.networkError', { status: error.status })
      case 'GEODATA_MISSING_OBJECT':
        return t('errors.geoData.missingObject', { name: error.objectName })
      case 'GEODATA_INVALID_STRUCTURE':
        return t('errors.geoData.invalidStructure')

      case 'PRESET_NOT_FOUND':
        return t('errors.preset.notFound', { id: error.presetId })
      case 'PRESET_INVALID_JSON':
        return t('errors.preset.invalidJson', { id: error.presetId })
      case 'PRESET_VALIDATION_FAILED':
        return t('errors.preset.validationFailed', { id: error.presetId })
      case 'PRESET_TYPE_MISMATCH':
        return t('errors.preset.typeMismatch', {
          id: error.presetId,
          expected: error.expected,
          actual: error.actual,
        })
      case 'PRESET_LOAD_FAILED':
        return t('errors.preset.loadFailed', { id: error.presetId })

      case 'PROJECTION_NOT_FOUND':
        return t('errors.projection.notFound', { id: error.projectionId })
      case 'PROJECTION_CREATE_FAILED':
        return t('errors.projection.createFailed', { id: error.projectionId })
      case 'PROJECTION_INVALID_PARAMS':
        return t('errors.projection.invalidParams', { id: error.projectionId })

      case 'NETWORK_FETCH_FAILED':
        return t('errors.network.fetchFailed')
      case 'NETWORK_TIMEOUT':
        return t('errors.network.timeout')

      default:
        return t('errors.unknown')
    }
  }

  return { formatError }
}

export function formatErrorForLog(error: AppError): string {
  switch (error.type) {
    case 'ATLAS_NOT_FOUND':
      return `Atlas not found: ${error.atlasId}`
    case 'ATLAS_LOAD_FAILED':
      return `Atlas load failed: ${error.atlasId} - ${error.reason}`
    case 'ATLAS_CONFIG_INVALID':
      return `Atlas config invalid: ${error.atlasId} - ${error.reason}`

    case 'GEODATA_NOT_FOUND':
      return `GeoData not found: ${error.path}`
    case 'GEODATA_INVALID_JSON':
      return `GeoData invalid JSON: ${error.path}${error.parseError ? ` - ${error.parseError}` : ''}`
    case 'GEODATA_NETWORK_ERROR':
      return `GeoData network error: ${error.path} (HTTP ${error.status})`
    case 'GEODATA_MISSING_OBJECT':
      return `GeoData missing object: ${error.objectName}`
    case 'GEODATA_INVALID_STRUCTURE':
      return `GeoData invalid structure: ${error.path} - ${error.reason}`

    case 'PRESET_NOT_FOUND':
      return `Preset not found: ${error.presetId}`
    case 'PRESET_INVALID_JSON':
      return `Preset invalid JSON: ${error.presetId}${error.parseError ? ` - ${error.parseError}` : ''}`
    case 'PRESET_VALIDATION_FAILED':
      return `Preset validation failed: ${error.presetId} - ${error.errors.join(', ')}`
    case 'PRESET_TYPE_MISMATCH':
      return `Preset type mismatch: ${error.presetId} (expected ${error.expected}, got ${error.actual})`
    case 'PRESET_LOAD_FAILED':
      return `Preset load failed: ${error.presetId} - ${error.reason}`

    case 'PROJECTION_NOT_FOUND':
      return `Projection not found: ${error.projectionId}`
    case 'PROJECTION_CREATE_FAILED':
      return `Projection create failed: ${error.projectionId}${error.reason ? ` - ${error.reason}` : ''}`
    case 'PROJECTION_INVALID_PARAMS':
      return `Projection invalid params: ${error.projectionId} - ${error.reason}`

    case 'NETWORK_FETCH_FAILED':
      return `Network fetch failed: ${error.url}${error.reason ? ` - ${error.reason}` : ''}`
    case 'NETWORK_TIMEOUT':
      return `Network timeout: ${error.url}`

    default:
      return `Unknown error: ${JSON.stringify(error)}`
  }
}

export function getGeoDataErrorDetails(error: GeoDataError): { path?: string, status?: number } {
  switch (error.type) {
    case 'GEODATA_NOT_FOUND':
    case 'GEODATA_INVALID_JSON':
    case 'GEODATA_INVALID_STRUCTURE':
      return { path: error.path }
    case 'GEODATA_NETWORK_ERROR':
      return { path: error.path, status: error.status }
    case 'GEODATA_MISSING_OBJECT':
      return {}
  }
}

export function isRecoverableError(error: AppError): boolean {
  switch (error.type) {
    case 'GEODATA_NETWORK_ERROR':
    case 'NETWORK_FETCH_FAILED':
    case 'NETWORK_TIMEOUT':
      return true
    default:
      return false
  }
}
