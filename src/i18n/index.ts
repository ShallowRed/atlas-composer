import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en.json'
import fr from '@/i18n/locales/fr.json'

export type MessageSchema = typeof en

export const SUPPORTED_LOCALES = {
  en: 'English',
  fr: 'Français',
} as const

export type SupportedLocale = keyof typeof SUPPORTED_LOCALES

// Detect browser language or use saved preference
function getDefaultLocale(): SupportedLocale {
  const saved = localStorage.getItem('locale')
  if (saved && saved in SUPPORTED_LOCALES) {
    return saved as SupportedLocale
  }

  // Detect from browser
  const browserLang = navigator.language?.split('-')[0]
  if (browserLang && browserLang in SUPPORTED_LOCALES) {
    return browserLang as SupportedLocale
  }

  return 'en'
}

const i18n = createI18n<[MessageSchema], SupportedLocale>({
  legacy: false, // Use Composition API mode
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    fr,
  },
  globalInjection: true, // Enable $t in templates
})

export default i18n

// Helper to change locale and persist
export function setLocale(locale: SupportedLocale) {
  const global = i18n.global as any
  global.locale.value = locale
  localStorage.setItem('locale', locale)
  document.documentElement.setAttribute('lang', locale)
}
