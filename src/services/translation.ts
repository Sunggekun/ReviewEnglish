/**
 * MyMemory Translation API — public, daily limits apply.
 * https://mymemory.translated.net/doc/spec.php
 */
const MYMEMORY = 'https://api.mymemory.translated.net/get'

export async function translateEnglishToZh(text: string): Promise<string> {
  const q = text.trim()
  if (!q) return ''

  const url = `${MYMEMORY}?q=${encodeURIComponent(q)}&langpair=en|zh-TW`

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
