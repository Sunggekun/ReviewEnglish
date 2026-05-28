import { resolveVoiceByURI } from './speechVoices'

export const PREVIEW_SAMPLE = 'Hello'

export function pronounceWord(
  word: string,
  options?: { lang?: string; voiceURI?: string | null },
): { ok: boolean; reason?: string } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { ok: false, reason: 'Speech not supported in this browser.' }
  }

  const w = word.trim()
  if (!w) return { ok: false, reason: 'Nothing to pronounce.' }

  const voiceURI = options?.voiceURI?.trim() ?? ''
  const voice = voiceURI ? resolveVoiceByURI(voiceURI) : undefined

  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(w)
  if (voice) u.voice = voice
  u.lang = options?.lang ?? voice?.lang ?? 'en-US'
  u.rate = 0.92
  window.speechSynthesis.speak(u)
  return { ok: true }
}
