import type { AppError, ParameterIssue, PresetIssue } from '@/core/types/errors'
import type { SupportedLocale } from '@/i18n'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { ERROR_MESSAGE_KEYS, ISSUE_MESSAGE_KEYS, PARAMETER_ISSUE_MESSAGE_KEYS, useErrorMessage } from '@/composables/useErrorMessage'
import i18n, { SUPPORTED_LOCALES } from '@/i18n'

const PATH = '/data/x.json'
const CAUSE = { code: 'JSON_FILE_NOT_FOUND', path: PATH } as const
const ISSUE = { code: 'PRESET_POSITIONING_REQUIRED', territory: 'FR-MET' } as const

const errors = {
  JSON_FILE_NOT_FOUND: CAUSE,
  JSON_FILE_MALFORMED: { code: 'JSON_FILE_MALFORMED', path: PATH },
  JSON_FILE_UNREACHABLE: { code: 'JSON_FILE_UNREACHABLE', path: PATH },
  JSON_FILE_NETWORK_ERROR: { code: 'JSON_FILE_NETWORK_ERROR', path: PATH, status: 503 },
  GEODATA_MISSING_OBJECT: { code: 'GEODATA_MISSING_OBJECT', objectName: 'territories-x' },
  GEODATA_INVALID_STRUCTURE: { code: 'GEODATA_INVALID_STRUCTURE', path: PATH },
  ATLAS_UNKNOWN: { code: 'ATLAS_UNKNOWN', atlasId: 'atlas-x' },
  ATLAS_CONFIG_INVALID: { code: 'ATLAS_CONFIG_INVALID', atlasId: 'atlas-x' },
  ATLAS_NO_DEFAULT_PRESET: { code: 'ATLAS_NO_DEFAULT_PRESET', atlasId: 'atlas-x', viewMode: 'split' },
  ATLAS_SWITCH_FAILED: { code: 'ATLAS_SWITCH_FAILED', atlasId: 'atlas-x', cause: CAUSE },
  INITIALIZATION_FAILED: { code: 'INITIALIZATION_FAILED', reason: 'reason-x' },
  PRESET_UNKNOWN: { code: 'PRESET_UNKNOWN', presetId: 'preset-x' },
  PRESET_INVALID: { code: 'PRESET_INVALID', presetId: 'preset-x', issues: [ISSUE] },
  PRESET_NOT_APPLICABLE: { code: 'PRESET_NOT_APPLICABLE', presetId: 'preset-x', presetType: 'split', viewMode: 'unified' },
  PRESET_APPLICATION_FAILED: { code: 'PRESET_APPLICATION_FAILED', presetId: 'preset-x', reason: 'reason-x' },
  IMPORT_NOT_JSON_FILE: { code: 'IMPORT_NOT_JSON_FILE', fileName: 'file-x' },
  IMPORT_FILE_TOO_LARGE: { code: 'IMPORT_FILE_TOO_LARGE', fileName: 'file-x', maxSizeInMb: 10 },
  IMPORT_FILE_UNREADABLE: { code: 'IMPORT_FILE_UNREADABLE', fileName: 'file-x' },
  IMPORT_MALFORMED_JSON: { code: 'IMPORT_MALFORMED_JSON' },
  IMPORT_INVALID: { code: 'IMPORT_INVALID', issues: [ISSUE] },
  IMPORT_ATLAS_NOT_LOADED: { code: 'IMPORT_ATLAS_NOT_LOADED' },
  IMPORT_ATLAS_MISMATCH: { code: 'IMPORT_ATLAS_MISMATCH', importedAtlasId: 'atlas-x', currentAtlasId: 'atlas-y' },
  IMPORT_APPLICATION_FAILED: { code: 'IMPORT_APPLICATION_FAILED', reason: 'reason-x' },
} satisfies { [C in AppError['code']]: Extract<AppError, { code: C }> }

// Extract gives never for the template literal of the schema codes
const issues = {
  PRESET_SCHEMA_INVALID_TYPE: { code: 'PRESET_SCHEMA_INVALID_TYPE', path: 'path-x' },
  PRESET_SCHEMA_MISSING_FIELD: { code: 'PRESET_SCHEMA_MISSING_FIELD', path: 'path-x' },
  PRESET_SCHEMA_INVALID_VALUE: { code: 'PRESET_SCHEMA_INVALID_VALUE', path: 'path-x' },
  PRESET_SCHEMA_VERSION_UNSUPPORTED: { code: 'PRESET_SCHEMA_VERSION_UNSUPPORTED', path: 'path-x' },
  PRESET_FIELD_MISSING: { code: 'PRESET_FIELD_MISSING', field: 'atlasId' },
  PRESET_ATLAS_ID_INVALID: { code: 'PRESET_ATLAS_ID_INVALID' },
  PRESET_VIEW_MODE_INVALID: { code: 'PRESET_VIEW_MODE_INVALID', viewMode: 'mode-x' },
  PRESET_TYPE_NOT_SUPPORTED: { code: 'PRESET_TYPE_NOT_SUPPORTED', presetType: 'type-x', atlasId: 'atlas-x' },
  PRESET_PARAMETER_REQUIRED: { code: 'PRESET_PARAMETER_REQUIRED', territory: 'FR-MET', parameter: 'parameter-x' },
  PRESET_POSITIONING_REQUIRED: ISSUE,
  PRESET_PROJECTION_MISSING: { code: 'PRESET_PROJECTION_MISSING' },
  PRESET_TERRITORIES_MISSING: { code: 'PRESET_TERRITORIES_MISSING' },
  PRESET_COMPOSITE_PROJECTION_MISSING: { code: 'PRESET_COMPOSITE_PROJECTION_MISSING' },
  PRESET_GLOBAL_SCALE_NOT_NUMBER: { code: 'PRESET_GLOBAL_SCALE_NOT_NUMBER' },
  PRESET_GLOBAL_SCALE_NOT_POSITIVE: { code: 'PRESET_GLOBAL_SCALE_NOT_POSITIVE' },
  PRESET_PROJECTION_ID_INVALID: { code: 'PRESET_PROJECTION_ID_INVALID', territory: null },
  PRESET_PROJECTION_UNKNOWN: { code: 'PRESET_PROJECTION_UNKNOWN', territory: null, projectionId: 'projection-x' },
  PRESET_PARAMETERS_NOT_OBJECT: { code: 'PRESET_PARAMETERS_NOT_OBJECT', territory: null },
  PRESET_PARAMETER_NOT_NUMBER: { code: 'PRESET_PARAMETER_NOT_NUMBER', territory: null, parameter: 'parameter-x', actualType: 'type-x' },
  PRESET_PARAMETER_NOT_ARRAY: { code: 'PRESET_PARAMETER_NOT_ARRAY', territory: null, parameter: 'parameter-x', actualType: 'type-x' },
  PRESET_PARAMETER_WRONG_LENGTH: { code: 'PRESET_PARAMETER_WRONG_LENGTH', territory: null, parameter: 'parameter-x', expected: 2 },
  PRESET_PARAMETER_TOO_SMALL: { code: 'PRESET_PARAMETER_TOO_SMALL', territory: null, parameter: 'parameter-x', min: 1 },
  PRESET_PARAMETER_TOO_LARGE: { code: 'PRESET_PARAMETER_TOO_LARGE', territory: null, parameter: 'parameter-x', max: 9 },
} satisfies { [C in PresetIssue['code']]: PresetIssue & { code: C } }

const parameterIssues = {
  PARAMETER_REQUIRED: { code: 'PARAMETER_REQUIRED', parameter: 'parameter-x' },
  PARAMETER_NOT_NUMBER: { code: 'PARAMETER_NOT_NUMBER', parameter: 'parameter-x' },
  PARAMETER_NOT_PAIR: { code: 'PARAMETER_NOT_PAIR', parameter: 'parameter-x' },
  PARAMETER_NOT_PAIR_OR_TRIPLE: { code: 'PARAMETER_NOT_PAIR_OR_TRIPLE', parameter: 'parameter-x' },
  PARAMETER_ITEMS_NOT_NUMBERS: { code: 'PARAMETER_ITEMS_NOT_NUMBERS', parameter: 'parameter-x' },
  PARAMETER_TOO_SMALL: { code: 'PARAMETER_TOO_SMALL', parameter: 'parameter-x', min: 11 },
  PARAMETER_TOO_LARGE: { code: 'PARAMETER_TOO_LARGE', parameter: 'parameter-x', max: 22 },
  PARAMETER_ITEM_TOO_SMALL: { code: 'PARAMETER_ITEM_TOO_SMALL', parameter: 'parameter-x', index: 3, min: 11 },
  PARAMETER_ITEM_TOO_LARGE: { code: 'PARAMETER_ITEM_TOO_LARGE', parameter: 'parameter-x', index: 3, max: 22 },
  PARAMETER_OUT_OF_RANGE: { code: 'PARAMETER_OUT_OF_RANGE', parameter: 'parameter-x', min: 11, max: 22 },
  PARAMETER_PARALLELS_ORDER: { code: 'PARAMETER_PARALLELS_ORDER', parameter: 'parameter-x' },
} satisfies { [C in ParameterIssue['code']]: Extract<ParameterIssue, { code: C }> }

const initialLocale = i18n.global.locale.value

function withErrorMessage<T>(read: (messages: ReturnType<typeof useErrorMessage>) => T): T {
  let value: T
  mount(defineComponent({
    setup() {
      value = read(useErrorMessage())
      return () => null
    },
  }), { global: { plugins: [i18n] } })
  return value!
}

function rawMessage(locale: SupportedLocale, key: string): unknown {
  return key.split('.').reduce<any>((node, part) => node?.[part], i18n.global.getLocaleMessage(locale))
}

function parametersOf(raw: unknown): (string | undefined)[] {
  expect(raw).toBeTypeOf('string')
  return [...(raw as string).matchAll(/\{(\w+)\}/g)].map(match => match[1])
}

describe('useErrorMessage', () => {
  afterEach(() => {
    i18n.global.locale.value = initialLocale
  })

  describe.each(Object.keys(SUPPORTED_LOCALES) as SupportedLocale[])('%s', (locale) => {
    it.each(Object.values(errors) as AppError[])('translates $code with each field of the error', (error) => {
      const { code, ...fields } = error
      expect(parametersOf(rawMessage(locale, ERROR_MESSAGE_KEYS[code])).sort()).toEqual(Object.keys(fields).sort())

      i18n.global.locale.value = locale
      const message = withErrorMessage(({ errorMessage }) => errorMessage(error))
      for (const [field, value] of Object.entries(fields)) {
        if (field === 'issues') {
          const [issueText] = withErrorMessage(({ errorMessages }) => errorMessages(error))
          expect(message).toContain(issueText)
        }
        else if (field === 'cause') {
          expect(message).toContain(withErrorMessage(({ errorMessage }) => errorMessage(CAUSE)))
        }
        else {
          expect(message).toContain(String(value))
        }
      }
    })

    it.each(Object.values(issues) as PresetIssue[])('translates $code with each field of the issue', (issue) => {
      const { code, ...fields } = issue
      const { territory: _territory, ...parameters } = fields as typeof fields & { territory?: string | null }
      expect(parametersOf(rawMessage(locale, ISSUE_MESSAGE_KEYS[code])).sort()).toEqual(Object.keys(parameters).sort())

      i18n.global.locale.value = locale
      const [message] = withErrorMessage(({ errorMessages }) => errorMessages({ code: 'IMPORT_INVALID', issues: [issue] }))
      for (const value of Object.values(parameters)) {
        expect(message).toContain(String(value))
      }
    })

    it.each(Object.values(parameterIssues) as ParameterIssue[])('translates $code with each field of the parameter issue', (issue) => {
      const { code, ...fields } = issue
      expect(parametersOf(rawMessage(locale, PARAMETER_ISSUE_MESSAGE_KEYS[code])).sort()).toEqual(Object.keys(fields).sort())

      i18n.global.locale.value = locale
      const message = withErrorMessage(({ parameterIssueMessage }) => parameterIssueMessage(issue))
      for (const value of Object.values(fields)) {
        expect(message).toContain(String(value))
      }
    })

    it('names the territory of an issue', () => {
      i18n.global.locale.value = locale
      const [message] = withErrorMessage(({ errorMessages }) => errorMessages({ code: 'IMPORT_INVALID', issues: [ISSUE] }))
      const expected = (rawMessage(locale, 'errors.presetIssue.inTerritory') as string)
        .replace('{territory}', 'FR-MET')
        .replace('{message}', rawMessage(locale, ISSUE_MESSAGE_KEYS[ISSUE.code]) as string)

      expect(message).toBe(expected)
    })

    it('leaves an issue without territory without prefix', () => {
      i18n.global.locale.value = locale
      const issue = issues.PRESET_PARAMETERS_NOT_OBJECT
      const [message] = withErrorMessage(({ errorMessages }) => errorMessages({ code: 'IMPORT_INVALID', issues: [issue] }))

      expect(message).toBe(rawMessage(locale, ISSUE_MESSAGE_KEYS[issue.code]))
    })
  })

  it('gives one line for an error without issues', () => {
    expect(withErrorMessage(({ errorMessages }) => errorMessages(CAUSE))).toHaveLength(1)
  })
})
