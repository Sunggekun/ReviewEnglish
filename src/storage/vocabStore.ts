import type { VocabItem } from '../types/vocab'

const STORAGE_KEY = 'reviewenglish-vocab-v1'

export function normalizeItem(raw: unknown): VocabItem | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.word !== 'string') return null
  const now = Date.now()
  return {
    id: o.id,
    word: o.word.trim(),
    translationZh: typeof o.translationZh === 'string' ? o.translationZh : '',
    ipa: typeof o.ipa === 'string' ? o.ipa : '',
    phonics: typeof o.phonics === 'string' ? o.phonics : '',
    createdAt:
      typeof o.createdAt === 'number' && Number.isFinite(o.createdAt)
        ? o.createdAt
        : now,
    updatedAt:
      typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt)
        ? o.updatedAt
        : now,
  }
}

export function serializeVocabulary(items: VocabItem[]): string {
  const payload = {
    app: 'reviewenglish',
    schemaVersion: 1,
    exportedAt: Date.now(),
    items,
  }

  return JSON.stringify(payload, null, 2)
}

export function parseVocabularyImport(text: string): VocabItem[] {
  try {
    const raw = JSON.parse(text) as unknown

    if (Array.isArray(raw)) {
      return raw.map(normalizeItem).filter(Boolean) as VocabItem[]
    }

    if (raw && typeof raw === 'object') {
      const o = raw as {
        app?: unknown
        schemaVersion?: unknown
        items?: unknown
      }

      if (o.app === 'reviewenglish' && Array.isArray(o.items)) {
        return o.items.map(normalizeItem).filter(Boolean) as VocabItem[]
      }
    }

    return []
  } catch {
    return []
  }
}

export function loadVocabulary(): VocabItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeItem).filter(Boolean) as VocabItem[]
  } catch {
    return []
  }
}

export function saveVocabulary(items: VocabItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function newVocabItem(
  partial: Omit<VocabItem, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string
    createdAt?: number
    updatedAt?: number
  },
): VocabItem {
  const now = Date.now()
  return {
    id: partial.id ?? crypto.randomUUID(),
    word: partial.word.trim(),
    translationZh: partial.translationZh.trim(),
    ipa: partial.ipa.trim(),
    phonics: partial.phonics.trim(),
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  }
}
