import type { I18nValue } from '#types'
import { useI18n } from 'vue-i18n'
import { resolveI18nValue } from '@/core/atlases/i18n-utils'

export function useLocalizedName() {
  const { locale } = useI18n()

  function localize(value: I18nValue): string {
    return resolveI18nValue(value, locale.value)
  }

  return { localize }
}
