const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
}

export function getLanguageFlag(locale: string): string | undefined {
  return LANGUAGE_FLAGS[locale]
}
