import type { PickupKeys } from 'vue-i18n'
import type { AppError, ParameterIssue, PresetIssue } from '@/core/types/errors'
import type { MessageSchema } from '@/i18n'
import { useI18n } from 'vue-i18n'

type MessageKey = PickupKeys<{ en: MessageSchema }>

export const ERROR_MESSAGE_KEYS = {
  JSON_FILE_NOT_FOUND: 'errors.jsonFile.notFound',
  JSON_FILE_MALFORMED: 'errors.jsonFile.malformed',
  JSON_FILE_UNREACHABLE: 'errors.jsonFile.unreachable',
  JSON_FILE_NETWORK_ERROR: 'errors.jsonFile.networkError',
  GEODATA_MISSING_OBJECT: 'errors.geoData.missingObject',
  GEODATA_INVALID_STRUCTURE: 'errors.geoData.invalidStructure',
  ATLAS_UNKNOWN: 'errors.atlas.unknown',
  ATLAS_CONFIG_INVALID: 'errors.atlas.configInvalid',
  ATLAS_NO_DEFAULT_PRESET: 'errors.atlas.noDefaultPreset',
  ATLAS_SWITCH_FAILED: 'errors.atlas.switchFailed',
  INITIALIZATION_FAILED: 'errors.initializationFailed',
  PRESET_UNKNOWN: 'errors.preset.unknown',
  PRESET_INVALID: 'errors.preset.invalid',
  PRESET_NOT_APPLICABLE: 'errors.preset.notApplicable',
  PRESET_APPLICATION_FAILED: 'errors.preset.applicationFailed',
  EXPORT_NOT_AVAILABLE: 'errors.export.notAvailable',
  IMPORT_NOT_JSON_FILE: 'errors.import.notJsonFile',
  IMPORT_FILE_TOO_LARGE: 'errors.import.fileTooLarge',
  IMPORT_FILE_UNREADABLE: 'errors.import.fileUnreadable',
  IMPORT_MALFORMED_JSON: 'errors.import.malformedJson',
  IMPORT_INVALID: 'errors.import.invalid',
  IMPORT_ATLAS_NOT_LOADED: 'errors.import.atlasNotLoaded',
  IMPORT_ATLAS_MISMATCH: 'errors.import.atlasMismatch',
  IMPORT_APPLICATION_FAILED: 'errors.import.applicationFailed',
} as const satisfies Record<AppError['code'], MessageKey>

export const ISSUE_MESSAGE_KEYS = {
  PRESET_SCHEMA_INVALID_TYPE: 'errors.presetIssue.schemaInvalidType',
  PRESET_SCHEMA_MISSING_FIELD: 'errors.presetIssue.schemaMissingField',
  PRESET_SCHEMA_INVALID_VALUE: 'errors.presetIssue.schemaInvalidValue',
  PRESET_SCHEMA_VERSION_UNSUPPORTED: 'errors.presetIssue.schemaVersionUnsupported',
  PRESET_FIELD_MISSING: 'errors.presetIssue.fieldMissing',
  PRESET_ATLAS_ID_INVALID: 'errors.presetIssue.atlasIdInvalid',
  PRESET_VIEW_MODE_INVALID: 'errors.presetIssue.viewModeInvalid',
  PRESET_TYPE_NOT_SUPPORTED: 'errors.presetIssue.typeNotSupported',
  PRESET_PARAMETER_REQUIRED: 'errors.presetIssue.parameterRequired',
  PRESET_POSITIONING_REQUIRED: 'errors.presetIssue.positioningRequired',
  PRESET_PROJECTION_MISSING: 'errors.presetIssue.projectionMissing',
  PRESET_TERRITORIES_MISSING: 'errors.presetIssue.territoriesMissing',
  PRESET_COMPOSITE_PROJECTION_MISSING: 'errors.presetIssue.compositeProjectionMissing',
  PRESET_GLOBAL_SCALE_NOT_NUMBER: 'errors.presetIssue.globalScaleNotNumber',
  PRESET_GLOBAL_SCALE_NOT_POSITIVE: 'errors.presetIssue.globalScaleNotPositive',
  PRESET_PROJECTION_ID_INVALID: 'errors.presetIssue.projectionIdInvalid',
  PRESET_PROJECTION_UNKNOWN: 'errors.presetIssue.projectionUnknown',
  PRESET_PARAMETERS_NOT_OBJECT: 'errors.presetIssue.parametersNotObject',
  PRESET_PARAMETER_NOT_NUMBER: 'errors.presetIssue.parameterNotNumber',
  PRESET_PARAMETER_NOT_ARRAY: 'errors.presetIssue.parameterNotArray',
  PRESET_PARAMETER_WRONG_LENGTH: 'errors.presetIssue.parameterWrongLength',
  PRESET_PARAMETER_TOO_SMALL: 'errors.presetIssue.parameterTooSmall',
  PRESET_PARAMETER_TOO_LARGE: 'errors.presetIssue.parameterTooLarge',
} as const satisfies Record<PresetIssue['code'], MessageKey>

export const PARAMETER_ISSUE_MESSAGE_KEYS = {
  PARAMETER_REQUIRED: 'errors.parameterIssue.required',
  PARAMETER_NOT_NUMBER: 'errors.parameterIssue.notNumber',
  PARAMETER_NOT_PAIR: 'errors.parameterIssue.notPair',
  PARAMETER_NOT_PAIR_OR_TRIPLE: 'errors.parameterIssue.notPairOrTriple',
  PARAMETER_ITEMS_NOT_NUMBERS: 'errors.parameterIssue.itemsNotNumbers',
  PARAMETER_TOO_SMALL: 'errors.parameterIssue.tooSmall',
  PARAMETER_TOO_LARGE: 'errors.parameterIssue.tooLarge',
  PARAMETER_ITEM_TOO_SMALL: 'errors.parameterIssue.itemTooSmall',
  PARAMETER_ITEM_TOO_LARGE: 'errors.parameterIssue.itemTooLarge',
  PARAMETER_OUT_OF_RANGE: 'errors.parameterIssue.outOfRange',
  PARAMETER_PARALLELS_ORDER: 'errors.parameterIssue.parallelsOrder',
} as const satisfies Record<ParameterIssue['code'], MessageKey>

export function useErrorMessage() {
  const { t } = useI18n()

  function issueMessage(issue: PresetIssue): string {
    const { code, ...fields } = issue
    const { territory, ...parameters } = fields as typeof fields & { territory?: string | null }
    const message = t(ISSUE_MESSAGE_KEYS[code], parameters)
    return territory ? t('errors.presetIssue.inTerritory', { territory, message }) : message
  }

  function errorMessage(error: AppError): string {
    const { code, ...fields } = error
    if ('issues' in fields) {
      return t(ERROR_MESSAGE_KEYS[code], { ...fields, issues: fields.issues.map(issueMessage).join(', ') })
    }
    if ('cause' in fields) {
      return t(ERROR_MESSAGE_KEYS[code], { ...fields, cause: errorMessage(fields.cause) })
    }
    return t(ERROR_MESSAGE_KEYS[code], fields)
  }

  function errorMessages(error: AppError): string[] {
    return 'issues' in error ? error.issues.map(issueMessage) : [errorMessage(error)]
  }

  function parameterIssueMessage({ code, ...fields }: ParameterIssue): string {
    return t(PARAMETER_ISSUE_MESSAGE_KEYS[code], fields)
  }

  return { errorMessage, errorMessages, parameterIssueMessage }
}
