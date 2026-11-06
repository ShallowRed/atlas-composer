import type { SchemaError } from './generated/validate.js'
import type { CompositeProjectionConfig } from './types.js'
import { VERSION_PATTERN } from './generated/constants.js'
import validateSchema from './generated/validate.js'

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
  return VERSION_PATTERN.test(version)
}

// `/territories/0/code` becomes `territories[0].code`
function toPath(instancePath: string, property: unknown): string {
  const segments = instancePath.split('/').slice(1)
  if (typeof property === 'string')
    segments.push(property)
  return segments.reduce((path, segment) => {
    if (/^\d+$/.test(segment))
      return `${path}[${segment}]`
    return path ? `${path}.${segment}` : segment
  }, '')
}

function errorCode({ keyword, instancePath }: SchemaError): ValidationError['code'] {
  if (keyword === 'required')
    return 'MISSING_FIELD'
  if (keyword === 'type')
    return 'INVALID_TYPE'
  if (keyword === 'pattern' && instancePath === '/version')
    return 'VERSION_UNSUPPORTED'
  return 'INVALID_VALUE'
}

function toValidationError(error: SchemaError): ValidationError {
  return {
    path: toPath(error.instancePath, error.params.missingProperty ?? error.params.additionalProperty),
    message: error.message ?? error.keyword,
    code: errorCode(error),
  }
}

// JSON Schema compares whole items for uniqueness, so the rule on territory codes is checked here
function findDuplicateCodes(config: CompositeProjectionConfig): ValidationError[] {
  const codes = new Set<string>()
  return config.territories.flatMap(({ code }, index) => {
    if (!codes.has(code)) {
      codes.add(code)
      return []
    }
    return [{ path: `territories[${index}].code`, message: `Duplicate territory code: ${code}`, code: 'INVALID_VALUE' as const }]
  })
}

export function validateConfig(config: unknown): ValidationResult {
  const errors = validateSchema(config)
    ? findDuplicateCodes(config as CompositeProjectionConfig)
    : (validateSchema.errors ?? []).map(toValidationError)
  return { valid: errors.length === 0, errors, warnings: [] }
}

export function isCompositeProjectionConfig(value: unknown): value is CompositeProjectionConfig {
  return validateConfig(value).valid
}
