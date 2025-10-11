/**
 * i18n utilities for atlas configurations
 * Handles resolution of i18n values (strings or locale objects) to actual display text
 */

import type { I18nValue } from '#types'
import { useI18n } from 'vue-i18n'

/**
 * Resolve an i18n value to a string for the current locale
 *
 * @param value - String or i18n object from config
 * @param locale - Current locale (defaults to 'en' if not provided)
 * @returns Resolved string for display
 *
 * Rules:
 * - If value is a string, return it as-is (fallback for all locales)
 * - If value is an object, try to get the current locale
 * - If current locale not found, fallback to 'en'
 * - If 'en' not found, return first available value
 */
export function resolveI18nValue(value: I18nValue, locale?: string): string {
  // If it's already a string, return as-is
  if (typeof value === 'string') {
    return value
  }

  // It's an object with locale keys
  const localeObj = value as Record<string, string>

  // Try to get the current locale
  if (locale && localeObj[locale]) {
    return localeObj[locale]
  }

  // Fallback to English
  if (localeObj.en) {
    return localeObj.en
  }

  // Last resort: return first available value
  const firstKey = Object.keys(localeObj)[0]
  return firstKey ? (localeObj[firstKey] || '') : ''
}

/**
 * Resolve an i18n value using Vue's current locale
 * This composable version should be used in Vue components
 *
 * @param value - String or i18n object from config
 * @returns Resolved string for display
 */
export function useResolveI18nValue(value: I18nValue): string {
  const { locale } = useI18n()
  return resolveI18nValue(value, locale.value)
}

/**
 * Get the current locale from i18n (non-composable version)
 * Used in non-Vue contexts like services and loaders
 *
 * @returns Current locale code or 'en' as fallback
 */
export function getCurrentLocale(): string {
  // Try to get from localStorage (persisted by i18n system)
  const saved = localStorage.getItem('locale')
  if (saved) {
    return saved
  }

  // Try to detect from browser
  const browserLang = navigator.language?.split('-')[0]
  if (browserLang) {
    return browserLang
  }

  // Default to English
  return 'en'
}
