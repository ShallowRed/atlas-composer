import type { I18nValue } from '#types'
import { useI18n } from 'vue-i18n'

export function resolveI18nValue(value: I18nValue, locale?: string): string {
  if (typeof value === 'string') {
    return value
  }

  const localeObj = value as Record<string, string>

  if (locale && localeObj[locale]) {
    return localeObj[locale]
  }

  if (localeObj.en) {
    return localeObj.en
  }

  const firstKey = Object.keys(localeObj)[0]
  return firstKey ? (localeObj[firstKey] || '') : ''
}

export function useResolveI18nValue(value: I18nValue): string {
  const { locale } = useI18n()
  return resolveI18nValue(value, locale.value)
}

export function getCurrentLocale(): string {
  const saved = localStorage.getItem('locale')
  if (saved) {
    return saved
  }

  const browserLang = navigator.language?.split('-')[0]
  if (browserLang) {
    return browserLang
  }

  return 'en'
}
