import type { I18nValue } from '#types'

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
