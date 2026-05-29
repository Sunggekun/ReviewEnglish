import { lookupEnglishWord } from './dictionary'
import { translateEnglish } from './translation'

export type WordLookupResult = {
  translationZh: string
  ipa: string
  hints: string[]
}

export async function lookupWordForVocab(
  word: string,
  translateLanguage: string,
  translateLanguageLabel: string,
): Promise<WordLookupResult> {
  const [dictOutcome, zhOutcome] = await Promise.allSettled([
    lookupEnglishWord(word),
    translateEnglish(word, translateLanguage),
  ])

  let ipa = ''
  if (dictOutcome.status === 'fulfilled') ipa = dictOutcome.value.ipa.trim()

  let translationZh = ''
  if (zhOutcome.status === 'fulfilled') translationZh = zhOutcome.value.trim()

  const hints: string[] = []
  if (dictOutcome.status === 'rejected')
    hints.push(
      `Could not look up IPA (${dictOutcome.reason instanceof Error ? dictOutcome.reason.message : String(dictOutcome.reason)}). You can edit it.`,
    )
  else if (!ipa)
    hints.push(
      'No IPA returned for this word. You can edit phonics/IPA manually.',
    )

  if (zhOutcome.status === 'rejected')
    hints.push(
      `Could not translate automatically (${zhOutcome.reason instanceof Error ? zhOutcome.reason.message : String(zhOutcome.reason)}). Edit ${translateLanguageLabel} manually.`,
    )
  else if (!translationZh)
    hints.push(
      `${translateLanguageLabel} translation missing. Paste or type it manually.`,
    )

  return { translationZh, ipa, hints }
}
