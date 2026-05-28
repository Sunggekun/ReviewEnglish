export function getSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return []
  }
  return window.speechSynthesis.getVoices()
}

export function resolveVoiceByURI(
  uri: string,
): SpeechSynthesisVoice | undefined {
  const trimmed = uri.trim()
  if (!trimmed) return undefined
  return getSpeechVoices().find((v) => v.voiceURI === trimmed)
}

export function formatVoiceLabel(voice: SpeechSynthesisVoice): string {
  return `${voice.name} (${voice.lang})`
}

export function sortVoices(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    const langCmp = a.lang.localeCompare(b.lang)
    if (langCmp !== 0) return langCmp
    return a.name.localeCompare(b.name)
  })
}

export type VoiceLangGroup = {
  lang: string
  voices: SpeechSynthesisVoice[]
}

/** Voices grouped by `lang`, each group sorted by name. */
export function groupVoicesByLang(
  voices: SpeechSynthesisVoice[],
): VoiceLangGroup[] {
  const groups: VoiceLangGroup[] = []
  for (const v of sortVoices(voices)) {
    const last = groups[groups.length - 1]
    if (last?.lang === v.lang) last.voices.push(v)
    else groups.push({ lang: v.lang, voices: [v] })
  }
  return groups
}
