import { isCompositeProjectionConfig, MIN_SUPPORTED_VERSION } from './types.js'

export interface ValidationError {
  path: string
  message: string
  code: 'INVALID_TYPE' | 'MISSING_FIELD' | 'INVALID_VALUE' | 'VERSION_UNSUPPORTED'
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: string[]
}

export function validateVersion(version: string): boolean {
  const [major] = version.split('.').map(Number)
  const [minMajor] = MIN_SUPPORTED_VERSION.split('.').map(Number)
  return major >= minMajor
}

export function validateConfig(config: unknown): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  if (!isCompositeProjectionConfig(config)) {
    errors.push({
      path: '',
      message: 'Invalid configuration structure',
      code: 'INVALID_TYPE',
    })
    return { valid: false, errors, warnings }
  }

  if (!validateVersion(config.version)) {
    errors.push({
      path: 'version',
      message: `Unsupported version "${config.version}". Minimum: ${MIN_SUPPORTED_VERSION}`,
      code: 'VERSION_UNSUPPORTED',
    })
  }

  if (!config.metadata.atlasId) {
    errors.push({
      path: 'metadata.atlasId',
      message: 'atlasId is required',
      code: 'MISSING_FIELD',
    })
  }

  if (config.referenceScale <= 0) {
    errors.push({
      path: 'referenceScale',
      message: 'referenceScale must be positive',
      code: 'INVALID_VALUE',
    })
  }

  if (config.canvasDimensions.width <= 0 || config.canvasDimensions.height <= 0) {
    errors.push({
      path: 'canvasDimensions',
      message: 'Canvas dimensions must be positive',
      code: 'INVALID_VALUE',
    })
  }

  if (config.territories.length === 0) {
    errors.push({
      path: 'territories',
      message: 'At least one territory is required',
      code: 'INVALID_VALUE',
    })
  }

  const codes = new Set<string>()
  config.territories.forEach((territory, index) => {
    const path = `territories[${index}]`

    if (codes.has(territory.code)) {
      errors.push({
        path: `${path}.code`,
        message: `Duplicate territory code: ${territory.code}`,
        code: 'INVALID_VALUE',
      })
    }
    codes.add(territory.code)

    if (!territory.projection.id) {
      errors.push({
        path: `${path}.projection.id`,
        message: 'Projection ID is required',
        code: 'MISSING_FIELD',
      })
    }

    if (territory.bounds) {
      const [[minLon, minLat], [maxLon, maxLat]] = territory.bounds
      if (minLon >= maxLon || minLat >= maxLat) {
        warnings.push(`${path}.bounds: Invalid bounds order (min >= max)`)
      }
      if (minLon < -180 || maxLon > 180) {
        warnings.push(`${path}.bounds: Longitude out of range [-180, 180]`)
      }
      if (minLat < -90 || maxLat > 90) {
        warnings.push(`${path}.bounds: Latitude out of range [-90, 90]`)
      }
    }

    if (!territory.layout.translateOffset) {
      errors.push({
        path: `${path}.layout.translateOffset`,
        message: 'translateOffset is required',
        code: 'MISSING_FIELD',
      })
    }
    if (!territory.layout.pixelClipExtent) {
      errors.push({
        path: `${path}.layout.pixelClipExtent`,
        message: 'pixelClipExtent is required',
        code: 'MISSING_FIELD',
      })
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
