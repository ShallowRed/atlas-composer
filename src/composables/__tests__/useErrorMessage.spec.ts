import type { AppError } from '@/core/types/errors'
import type { SupportedLocale } from '@/i18n'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { ERROR_MESSAGE_KEYS, useErrorMessage } from '@/composables/useErrorMessage'
import i18n, { SUPPORTED_LOCALES } from '@/i18n'

const errors = {
  GEODATA_NOT_FOUND: { code: 'GEODATA_NOT_FOUND', path: '/data/x.json' },
  GEODATA_INVALID_JSON: { code: 'GEODATA_INVALID_JSON', path: '/data/x.json' },
  GEODATA_UNREACHABLE: { code: 'GEODATA_UNREACHABLE', path: '/data/x.json' },
  GEODATA_NETWORK_ERROR: { code: 'GEODATA_NETWORK_ERROR', path: '/data/x.json', status: 503 },
  GEODATA_MISSING_OBJECT: { code: 'GEODATA_MISSING_OBJECT', objectName: 'territories-x' },
  GEODATA_INVALID_STRUCTURE: { code: 'GEODATA_INVALID_STRUCTURE', path: '/data/x.json' },
  INITIALIZATION_FAILED: { code: 'INITIALIZATION_FAILED', reason: 'reason-x' },
} satisfies { [C in AppError['code']]: Extract<AppError, { code: C }> }

const initialLocale = i18n.global.locale.value

function renderMessage(error: AppError): string {
  let message = ''
  mount(defineComponent({
    setup() {
      message = useErrorMessage().errorMessage(error)
      return () => null
    },
  }), { global: { plugins: [i18n] } })
  return message
}

function rawMessage(locale: SupportedLocale, key: string): unknown {
  return key.split('.').reduce<any>((node, part) => node?.[part], i18n.global.getLocaleMessage(locale))
}

describe('useErrorMessage', () => {
  afterEach(() => {
    i18n.global.locale.value = initialLocale
  })

  describe.each(Object.keys(SUPPORTED_LOCALES) as SupportedLocale[])('%s', (locale) => {
    it.each(Object.values(errors))('translates $code with each field of the error', (error) => {
      const { code, ...fields } = error
      const raw = rawMessage(locale, ERROR_MESSAGE_KEYS[code])
      expect(raw).toBeTypeOf('string')
      const parameters = [...(raw as string).matchAll(/\{(\w+)\}/g)].map(match => match[1])
      expect(parameters.sort()).toEqual(Object.keys(fields).sort())

      i18n.global.locale.value = locale
      const message = renderMessage(error)
      for (const value of Object.values(fields)) {
        expect(message).toContain(String(value))
      }
    })
  })
})
