/** Free Dictionary API — https://dictionaryapi.dev/ */
type DictionaryApiPhonetic = { text?: string; audio?: string }

type DictionaryApiDefinition = {
  definition?: string
  example?: string
}

type DictionaryApiMeaning = {
  partOfSpeech?: string
  definitions?: DictionaryApiDefinition[]
}

type DictionaryApiEntry = {
  phonetics?: DictionaryApiPhonetic[]
  meanings?: DictionaryApiMeaning[]
}

export type DictionaryMeaning = {
  partOfSpeech: string
  definition: string
  example?: string
}

function pickFirstIpa(entries: DictionaryApiEntry[] | undefined): string {
  if (!entries?.length) return ''
  for (const entry of entries) {
    const list = entry.phonetics ?? []
    for (const p of list) {
      const t = p.text?.trim()
      if (t) return t
    }
  }
  return ''
}

function extractMeanings(
  entries: DictionaryApiEntry[] | undefined,
): DictionaryMeaning[] {
  if (!entries?.length) return []

  const result: DictionaryMeaning[] = []

  for (const entry of entries) {
    const meanings = entry.meanings ?? []
    for (const meaning of meanings) {
      const partOfSpeech = meaning.partOfSpeech?.trim() || ''
      const defs = meaning.definitions ?? []
      for (const def of defs) {
        const definition = def.definition?.trim()
        if (!definition) continue
        result.push({
          partOfSpeech,
          definition,
          example: def.example?.trim() || undefined,
        })
      }
    }
  }

  return result
}

export async function lookupEnglishWord(word: string): Promise<{
  ipa: string
  meanings: DictionaryMeaning[]
}> {
  const term = encodeURIComponent(word.trim().toLowerCase())
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${term}`,
    { headers: { Accept: 'application/json' } },
  )
  if (res.status === 404)
    return { ipa: '', meanings: [] }
  if (!res.ok) throw new Error(`Dictionary request failed (${res.status})`)

  const data = (await res.json()) as DictionaryApiEntry[] | { title?: string }
  if (!Array.isArray(data)) throw new Error('Unexpected dictionary response')

  const ipa = pickFirstIpa(data)
  const meanings = extractMeanings(data)
  return { ipa, meanings }
}
