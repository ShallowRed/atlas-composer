/**
 * Tests for i18n utility functions
 */

import type { I18nValue } from '#types'
import { describe, expect, it } from 'vitest'
import { resolveI18nValue } from '../i18n-utils'

describe('i18n-utils', () => {
  describe('resolveI18nValue', () => {
    it('should return string value as-is', () => {
      const value = 'France'
      const result = resolveI18nValue(value, 'en')
      expect(result).toBe('France')
    })

    it('should return string value regardless of locale', () => {
      const value = 'France'
      expect(resolveI18nValue(value, 'en')).toBe('France')
      expect(resolveI18nValue(value, 'fr')).toBe('France')
      expect(resolveI18nValue(value, 'es')).toBe('France')
    })

    it('should resolve i18n object to current locale', () => {
      const value: I18nValue = {
        en: 'France',
        fr: 'France',
        es: 'Francia',
      }
      expect(resolveI18nValue(value, 'en')).toBe('France')
      expect(resolveI18nValue(value, 'fr')).toBe('France')
      expect(resolveI18nValue(value, 'es')).toBe('Francia')
    })

    it('should fallback to English when locale not found', () => {
      const value: I18nValue = {
        en: 'France',
        fr: 'France',
      }
      expect(resolveI18nValue(value, 'de')).toBe('France')
      expect(resolveI18nValue(value, 'ja')).toBe('France')
    })

    it('should handle locale without providing locale parameter', () => {
      const value: I18nValue = {
        en: 'France',
        fr: 'France',
      }
      const result = resolveI18nValue(value)
      // Should fallback to English
      expect(result).toBe('France')
    })
  })
})
