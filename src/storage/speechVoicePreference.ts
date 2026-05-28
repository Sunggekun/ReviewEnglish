const STORAGE_KEY = 'reviewenglish-speech-voice-uri'

export function loadSpeechVoiceURI(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (typeof raw === 'string') return raw
  } catch {
    /* ignore */
  }
  return ''
}

export function saveSpeechVoiceURI(uri: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, uri)
  } catch {
    /* ignore */
  }
}
