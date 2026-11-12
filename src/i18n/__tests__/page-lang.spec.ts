import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import i18n, { setLocale } from '@/i18n'

describe('language of the page', () => {
  it('follows the locale of vue-i18n from the start', async () => {
    expect(document.documentElement.getAttribute('lang')).toBe(i18n.global.locale.value)

    setLocale('fr')
    await nextTick()
    expect(document.documentElement.getAttribute('lang')).toBe('fr')

    setLocale('en')
    await nextTick()
    expect(document.documentElement.getAttribute('lang')).toBe('en')
  })
})
