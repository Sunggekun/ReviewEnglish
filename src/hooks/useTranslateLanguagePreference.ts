import { useState } from 'react'
import {
  loadTranslateLanguage,
  saveTranslateLanguage,
  type TranslateLanguage,
} from '../storage/translationPreference'

export function useTranslateLanguagePreference(): {
  language: TranslateLanguage
  setLanguage: (lang: TranslateLanguage) => void
} {
  const [language, setLanguageState] = useState(loadTranslateLanguage)

  const setLanguage = (lang: TranslateLanguage) => {
    saveTranslateLanguage(lang)
    setLanguageState(lang)
  }

  return { language, setLanguage }
}

