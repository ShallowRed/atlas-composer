/**
 * Language Icon Utilities
 * Maps locale codes to flag emojis
 */

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
}

/**
 * Get flag emoji for a language locale
 */
export function getLanguageFlag(locale: string): string | undefined {
  return LANGUAGE_FLAGS[locale]
}
