import type { I18nValue } from '#types'

export function resolveI18nValue(value: I18nValue, locale?: string): string {
  if (typeof value === 'string') {
    return value
  }

  return (locale && value[locale]) || value.en
}
