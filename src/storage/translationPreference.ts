export type TranslateLanguage =
  | 'zh-TW'
  | 'zh-CN'
  | 'ja'
  | 'ko'
  | 'es'
  | 'fr'
  | 'de'

const STORAGE_KEY = 'reviewenglish-translate-language'

export const TRANSLATE_LANGUAGE_OPTIONS: Array<{
  value: TranslateLanguage
  label: string
}> = [
  { value: 'zh-TW', label: 'Chinese (Traditional)' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
]

export function getTranslateLanguageLabel(lang: TranslateLanguage): string {
  return (
    TRANSLATE_LANGUAGE_OPTIONS.find((o) => o.value === lang)?.label ?? lang
  )
}

export function loadTranslateLanguage(): TranslateLanguage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const match = TRANSLATE_LANGUAGE_OPTIONS.find((o) => o.value === raw)
    if (match) return match.value
  } catch {
    /* ignore */
  }
  return 'zh-TW'
}

export function saveTranslateLanguage(lang: TranslateLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* ignore */
  }
}

