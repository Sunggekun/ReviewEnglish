import type { VocabItem } from '../types/vocab'

export type VocabFirstCharGroup = {
  letter: string
  items: VocabItem[]
}

export type VocabDisplayRow =
  | { kind: 'header'; letter: string }
  | { kind: 'item'; item: VocabItem }

export function getWordFirstCharCategory(word: string): string {
  const trimmed = word.trim()
  if (!trimmed) return '#'
  const char = trimmed[0].toUpperCase()
  if (char >= 'A' && char <= 'Z') return char
  return '#'
}

export function groupVocabByFirstChar(items: VocabItem[]): VocabFirstCharGroup[] {
  const map = new Map<string, VocabItem[]>()
  for (const item of items) {
    const letter = getWordFirstCharCategory(item.word)
    const group = map.get(letter) ?? []
    group.push(item)
    map.set(letter, group)
  }

  return [...map.keys()]
    .sort((a, b) => {
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b)
    })
    .map((letter) => ({ letter, items: map.get(letter)! }))
}

export function buildGroupedDisplayRows(
  groups: VocabFirstCharGroup[],
): VocabDisplayRow[] {
  const rows: VocabDisplayRow[] = []
  for (const { letter, items } of groups) {
    rows.push({ kind: 'header', letter })
    for (const item of items) {
      rows.push({ kind: 'item', item })
    }
  }
  return rows
}

export function collectFirstCharCategories(items: VocabItem[]): string[] {
  const letters = new Set<string>()
  for (const item of items) {
    letters.add(getWordFirstCharCategory(item.word))
  }
  return [...letters].sort((a, b) => {
    if (a === '#') return 1
    if (b === '#') return -1
    return a.localeCompare(b)
  })
}
