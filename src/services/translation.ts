/**
 * MyMemory Translation API — public, daily limits apply.
 * https://mymemory.translated.net/doc/spec.php
 */
const MYMEMORY = 'https://api.mymemory.translated.net/get'

export async function translateEnglish(
  text: string,
  targetLang: string,
): Promise<string> {
  const q = text.trim()
  if (!q) return ''

  const url = `${MYMEMORY}?q=${encodeURIComponent(q)}&langpair=en|${encodeURIComponent(
    targetLang,
  )}`

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok)
    throw new Error(`Translation failed (${res.status})`)

  const data = (await res.json()) as {
    responseData?: { translatedText?: string }
    responseStatus?: number
  }

  const out = data.responseData?.translatedText?.trim()
  if (!out) throw new Error('No translation in response')

  return out
}

// Back-compat: previous API name used by older code.
export async function translateEnglishToZh(text: string): Promise<string> {
  return translateEnglish(text, 'zh-TW')
}
