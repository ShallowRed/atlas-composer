/**
 * Tests for i18n utility functions
 */

import type { I18nValue } from '#types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentLocale, resolveI18nValue } from '../i18n-utils'

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

    it('should fallback to first available value when English not found', () => {
      const value: I18nValue = {
        fr: 'France',
        es: 'Francia',
      }
      const result = resolveI18nValue(value, 'de')
      // Should return first available (fr in this case due to object key order)
      expect(result).toBe('France')
    })

    it('should handle empty i18n object', () => {
      const value: I18nValue = {}
      const result = resolveI18nValue(value, 'en')
      expect(result).toBe('')
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

  describe('getCurrentLocale', () => {
    let originalNavigatorLanguage: string | undefined
    let localStorageMock: Record<string, string>

    beforeEach(() => {
      // Store original navigator.language
      originalNavigatorLanguage = navigator.language

      // Mock localStorage
      localStorageMock = {}
      globalThis.localStorage = {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key]
        }),
        clear: vi.fn(() => {
          localStorageMock = {}
        }),
        length: 0,
        key: vi.fn(),
      }
    })

    afterEach(() => {
      // Restore original navigator.language
      if (originalNavigatorLanguage !== undefined) {
        Object.defineProperty(navigator, 'language', {
          value: originalNavigatorLanguage,
          configurable: true,
        })
      }
      vi.restoreAllMocks()
    })

    it('should return locale from localStorage if available', () => {
      localStorageMock.locale = 'fr'
      const result = getCurrentLocale()
      expect(result).toBe('fr')
    })

    it('should detect locale from browser if localStorage is empty', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'fr-FR',
        configurable: true,
      })
      const result = getCurrentLocale()
      expect(result).toBe('fr')
    })

    it('should handle browser language with region code', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true,
      })
      const result = getCurrentLocale()
      expect(result).toBe('en')
    })

    it('should fallback to English when no locale found', () => {
      Object.defineProperty(navigator, 'language', {
        value: undefined,
        configurable: true,
      })
      const result = getCurrentLocale()
      expect(result).toBe('en')
    })

    it('should prioritize localStorage over browser language', () => {
      localStorageMock.locale = 'fr'
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true,
      })
      const result = getCurrentLocale()
      expect(result).toBe('fr')
    })
  })
})
