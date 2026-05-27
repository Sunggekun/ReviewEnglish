export function pronounceWord(
  word: string,
  options?: { lang?: string },
): { ok: boolean; reason?: string } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { ok: false, reason: 'Speech not supported in this browser.' }
  }

  const w = word.trim()
  if (!w) return { ok: false, reason: 'Nothing to pronounce.' }

  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(w)
  u.lang = options?.lang ?? 'en-US'
  u.rate = 0.92
  window.speechSynthesis.speak(u)
  return { ok: true }
}
